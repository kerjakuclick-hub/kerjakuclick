// FILE BARU -- fitur "Alarm Waktu Habis" (migrasi
// 035_alarm_waktu_habis_dan_detail_pesan_wa.sql), diangkat dari temuan audit
// lapangan 22 September 2026: mitra segan menegur klien langsung soal
// durasi/cakupan kerja yang sudah lewat -- endpoint ini memindahkan tindakan
// "menegur" itu dari mitra ke SISTEM, mitra cukup klik 1 tombol.
//
// Dipanggil saat mitra klik tombol "Ingatkan Klien via WA" di kartu tugas
// yang sedang berjalan (components/mitra/TaskList.tsx) begitu alarm waktu
// habis muncul di layarnya. BEDA dari /api/cron/time-up-check (yang jalan
// OTOMATIS tiap 5 menit tanpa mitra klik apa pun):
//   - Endpoint ini mitra-INISIATIF, jadi TIDAK dibatasi cuma sekali kirim per
//     order -- mitra boleh klik lagi kapan pun perlu mengingatkan ulang
//     (misalnya klien belum juga merespons setelah beberapa saat).
//   - `time_up_notified_at` HANYA diisi kalau sebelumnya masih null (order
//     ini belum pernah dapat notif "waktu habis" sama sekali) -- supaya
//     pengecekan otomatis pg_cron tidak ikut mengirim WA kedua untuk order
//     yang sama begitu mitra sudah lebih dulu menekan tombol ini.
export const dynamic = "force-dynamic";

import { ensureBusinessParams } from "@/lib/businessParams";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendFonnteMessage, buildTimeUpMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  // Parameter Bisnis (harga, katalog, fee -- migrasi 040), cache 60 detik.
  await ensureBusinessParams();

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "mitra") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
  }

  // Pakai client bersesi mitra sendiri dulu untuk baca (RLS
  // "orders_mitra_update_own"/setara jadi penjaga akses pertama) -- mitra
  // cuma boleh mengingatkan klien untuk tugasnya sendiri.
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select(
      "id, mitra_id, status, service_type, address, customer_phone, duration_minutes, extra_time_minutes, work_scope_snapshot"
    )
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  if (order.mitra_id !== user.id) {
    return NextResponse.json({ error: "Ini bukan tugas Anda." }, { status: 403 });
  }

  if (order.status !== "working") {
    return NextResponse.json({ error: "Order ini tidak sedang dikerjakan." }, { status: 400 });
  }

  const message = buildTimeUpMessage(order);
  const sendResult = await sendFonnteMessage(order.customer_phone, message);

  // Pakai service-role untuk tulis pesan sistem & update time_up_notified_at
  // -- ini pemberitahuan resmi platform (sender_type "system"), bukan pesan
  // pribadi mitra, sama seperti pola pesan sistem lain di order_messages
  // (pembuka Chat Pesanan saat penugasan, invoice pembayaran, dst).
  const admin = getSupabaseAdmin();

  try {
    await admin.from("order_messages").insert({
      order_id: orderId,
      sender_type: "system",
      sender_id: null,
      sender_name: "Sistem",
      body: sendResult.ok
        ? "⏰ Mitra mengingatkan: waktu kerja sudah habis. Sistem sudah mengirim pemberitahuan ke WA klien."
        : `⏰ Mitra mencoba mengingatkan klien lewat WA, tapi gagal terkirim (${sendResult.error}). Mohon informasikan klien langsung lewat chat ini.`,
    });
  } catch (chatError) {
    console.error("Gagal menulis pesan sistem pengingat waktu habis:", chatError);
  }

  if (sendResult.ok) {
    // .is("time_up_notified_at", null) -- jangan timpa waktu notifikasi
    // PERTAMA kalau ternyata sudah ke-set duluan (mis. oleh pengecekan
    // otomatis pg_cron sesaat sebelum mitra sempat klik tombol ini).
    await admin
      .from("orders")
      .update({ time_up_notified_at: new Date().toISOString(), time_up_notify_error: null })
      .eq("id", orderId)
      .is("time_up_notified_at", null);
  }

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
