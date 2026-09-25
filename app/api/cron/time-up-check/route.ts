// FILE BARU -- fitur "Alarm Waktu Habis" (migrasi 035_alarm_waktu_habis_dan_
// detail_pesan_wa.sql), diangkat dari temuan audit lapangan 22 September
// 2026: hampir semua klien mengabaikan durasi/cakupan kerja yang disepakati,
// dan mitra segan menegur klien secara langsung -- menyebabkan kerja lembur
// tanpa tambahan bayaran.
//
// Endpoint ini DIPANGGIL OTOMATIS oleh pg_cron + pg_net dari database
// Supabase tiap 5 menit (lihat migrasi 035 untuk perintah `cron.schedule`-nya)
// -- BUKAN dipanggil browser/pengguna mana pun secara langsung. Tugasnya:
// cari semua order berstatus 'working' yang sudah melewati batas waktu kerja
// (durasi + tambah waktu kalau ada, dihitung dari `working_started_at`) TAPI
// belum pernah dikirimi notifikasi "waktu habis" (`time_up_notified_at`
// masih null), lalu untuk tiap order itu:
//   1. Kirim WA otomatis ke klien (buildTimeUpMessage, lib/whatsapp.ts).
//   2. Tulis pesan sistem ke Chat Pesanan (order_messages) supaya mitra juga
//      melihat notifnya tercatat -- selain alarm visual yang sudah muncul di
//      Dasbor Mitra sendiri (components/mitra/TaskList.tsx).
//   3. Catat hasilnya ke time_up_notified_at/time_up_notify_error (pola sama
//      persis dengan client_notified_at/mitra_notified_at/invoice_notified_at
//      yang sudah ada).
//
// Kalau mitra SUDAH lebih dulu klik tombol manual "Ingatkan Klien" di Dasbor
// Mitra (app/api/mitra/orders/remind-time-up/route.ts) sebelum pengecekan
// otomatis ini sempat jalan, time_up_notified_at sudah terisi duluan --
// order itu otomatis TIDAK dikirimi lagi di sini (query di bawah cuma
// mengambil yang time_up_notified_at-nya masih null), supaya klien tidak
// dobel dapat WA "waktu habis" untuk order yang sama.
//
// KEAMANAN: endpoint ini publik secara jaringan (tidak ada sesi Supabase Auth
// -- yang memanggil adalah database, bukan browser pengguna), jadi divalidasi
// lewat header rahasia `x-cron-secret` yang HARUS cocok persis dengan env var
// CRON_SECRET.
//
// JANGAN LUPA (di luar kode, tidak bisa diubah lewat file ini):
//   1. Tambah env var CRON_SECRET di Vercel (isi dengan string acak, misalnya
//      hasil `openssl rand -hex 32` di terminal Anda), lalu redeploy.
//   2. Di Supabase Dashboard -> SQL Editor, jalankan SEKALI SAJA (BUKAN
//      lewat file migrasi yang ikut ke-commit ke git -- supaya rahasianya
//      tidak bocor ke riwayat git Anda):
//        select vault.create_secret(
//          'NILAI_SAMA_PERSIS_DENGAN_CRON_SECRET_DI_VERCEL',
//          'kerjakuclick_cron_secret',
//          'Header x-cron-secret untuk endpoint /api/cron/time-up-check kerjaku.click'
//        );
//      DIPERBAIKI (migrasi 036) -- PERCOBAAN PERTAMA pakai
//      `ALTER DATABASE postgres SET app.settings.cron_secret = '...'`
//      TERNYATA ditolak Supabase ("permission denied to set parameter",
//      role yang dipakai SQL Editor tidak punya privilese ALTER DATABASE di
//      project ini) -- diganti ke Supabase VAULT (vault.create_secret), fitur
//      resmi Supabase yang memang dirancang untuk simpan rahasia semacam ini
//      tanpa privilese ALTER DATABASE. Lihat migrasi 036 untuk jadwal cron
//      yang sudah disesuaikan membaca dari vault.decrypted_secrets.
//   Tanpa langkah 1 & 2 di atas, pg_cron TETAP terjadwal & memanggil endpoint
//   ini tiap 5 menit, tapi selalu ditolak 401 (header rahasianya kosong/tidak
//   cocok) -- tidak ada WA yang benar-benar terkirim sampai keduanya diisi.

import { ensureBusinessParams } from "@/lib/businessParams";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendFonnteMessage, buildTimeUpMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  // Parameter Bisnis (harga, katalog, fee -- migrasi 040), cache 60 detik.
  await ensureBusinessParams();

  const secret = req.headers.get("x-cron-secret");
  if (!secret || !process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: workingOrders, error } = await admin
    .from("orders")
    .select(
      "id, service_type, address, customer_phone, working_started_at, duration_minutes, extra_time_minutes, work_scope_snapshot"
    )
    .eq("status", "working")
    .is("time_up_notified_at", null)
    .not("working_started_at", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (workingOrders ?? []).filter((o) => {
    if (!o.working_started_at) return false;
    const totalMenit = (o.duration_minutes ?? 60) + (o.extra_time_minutes ?? 0);
    const deadline = new Date(o.working_started_at).getTime() + totalMenit * 60_000;
    return now >= deadline;
  });

  let notified = 0;
  let failed = 0;

  for (const order of due) {
    const message = buildTimeUpMessage(order);
    const sendResult = await sendFonnteMessage(order.customer_phone, message);

    if (sendResult.ok) {
      notified += 1;
    } else {
      failed += 1;
    }

    await admin
      .from("orders")
      .update(
        sendResult.ok
          ? { time_up_notified_at: new Date().toISOString(), time_up_notify_error: null }
          : { time_up_notify_error: sendResult.error }
      )
      .eq("id", order.id);

    // Pesan sistem di Chat Pesanan -- kegagalan menulis pesan ini TIDAK
    // menggagalkan proses (cuma dicatat ke console), sama seperti pola pesan
    // sistem lain di order_messages.
    try {
      await admin.from("order_messages").insert({
        order_id: order.id,
        sender_type: "system",
        sender_id: null,
        sender_name: "Sistem",
        body: sendResult.ok
          ? "⏰ Waktu kerja sudah habis -- sistem otomatis mengirim pemberitahuan ke WA klien."
          : `⏰ Waktu kerja sudah habis, TAPI notifikasi otomatis ke WA klien gagal terkirim (${sendResult.error}). Mohon informasikan klien secara langsung lewat chat ini.`,
      });
    } catch (chatError) {
      console.error("Gagal menulis pesan sistem alarm waktu habis:", chatError);
    }
  }

  return NextResponse.json({
    checked: workingOrders?.length ?? 0,
    due: due.length,
    notified,
    failed,
  });
}
