// GANTI ISI app/api/admin/orders/assign/route.ts Anda dengan file ini.
//
// Perubahan dari versi sebelumnya (fitur "Notifikasi Klien Otomatis"):
//   1. Setelah invoice ter-generate, kirim SATU pesan WA otomatis ke klien
//      lewat Fonnte (sendFonnteMessage) berisi: detail pesanan + profil
//      singkat mitra ("ID Card sederhana" dalam teks) + info pembayaran
//      tunai/transfer langsung ke mitra. Ini MENGGANTIKAN alur lama (admin
//      unduh ID Card gambar + invoice PDF lalu kirim manual satu per satu).
//   2. Hasil kirim (berhasil/gagal) dicatat di orders.client_notified_at /
//      client_notify_error (migrasi 020) -- kegagalan kirim TIDAK
//      menggagalkan penugasan mitra, admin bisa coba kirim ulang lewat
//      tombol "Coba Kirim Lagi" di OrdersFeed (endpoint retry-notify).
//   3. Profil mitra lengkap sekarang diambil SATU KALI, dipakai untuk
//      generate invoice DAN untuk pesan notifikasi (sebelumnya cuma dipakai
//      untuk invoice).
//
// Perubahan (fitur "Notifikasi Mitra Otomatis", migrasi 022): begitu
// mitra ditugaskan, SELAIN pesan "pesanan disetujui" ke klien, sistem juga
// otomatis kirim WA "tugas baru" ke MITRA (buildMitraAssignedMessage) berisi
// detail pesanan + kontak klien -- mitra tidak perlu buka dasbor dulu buat
// tahu ada tugas baru. Hasil kirim (berhasil/gagal) dicatat terpisah di
// orders.mitra_notified_at / mitra_notify_error, ditampilkan & bisa di-retry
// dari OrdersFeed sama seperti notifikasi klien.
//
// Perubahan (fitur "Toggle Ketersediaan Mitra", migrasi 023): mitra
// yang sedang menyalakan status "tidak tersedia" (is_available = false --
// istirahat/sakit/kendala lain) sudah tidak muncul di dropdown "Pilih mitra
// eligible" (lihat eligible_mitra_for_order), tapi validasi ini ditambahkan
// juga di sini sebagai pertahanan berlapis -- misalnya kalau dropdown admin
// belum sempat refresh saat mitra baru saja mematikan ketersediaannya.
//
// Perubahan BARU (18 September 2026) -- fitur "Skema Fee Berjenjang" (Bagian
// 6.2 Dokumen Bisnis Revisi Pasca-Audit Fraud), migrasi 024 (SUDAH DIGANTI
// TOTAL, lihat catatan 20 September 2026 di bawah):
//   4. Validasi ambang saldo TIDAK lagi membandingkan ke order.min_wallet_
//      required (flat 20% lama, migrasi 007) -- sekarang dihitung dinamis
//      dari fee tier mitra yang bersangkutan lewat RPC mitra_fee_percent().
//
// Perubahan BESAR (20 September 2026) -- migrasi 030: validasi ambang saldo
// di atas (dinamis per tier + Biaya Teknologi migrasi 028) DIGANTI TOTAL
// jadi ambang FLAT lewat RPC mitra_wallet_threshold() (15% x harga Setrika
// Fast = Rp8.250, berlaku sama untuk semua pesanan) -- konsisten dengan
// eligible_mitra_for_order() di database (migrasi 030).
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2/8.2 (migrasi
// 025_order_messages_trust_safety.sql): begitu mitra berhasil ditugaskan,
// sebuah pesan SISTEM otomatis ditulis ke order_messages (Chat Pesanan)
// menandai awal percakapan untuk order ini -- supaya mitra & klien sama-
// sama tahu kanal ini sudah aktif tanpa perlu saling tukar nomor WA
// pribadi. Kegagalan menulis pesan ini TIDAK menggagalkan penugasan (log
// saja), sama seperti pola notifikasi WA di atas.

import { ensureBusinessParams } from "@/lib/businessParams";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateInvoicesForOrder } from "@/lib/pdf/generate-invoice";
import {
  sendFonnteMessage,
  buildOrderApprovedMessage,
  buildMitraAssignedMessage,
} from "@/lib/whatsapp";

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
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orderId, mitra_id, status, estimasiWaktu } = body as {
    orderId: number;
    mitra_id?: string | null;
    status?: string;
    estimasiWaktu?: string;
  };

  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
  }

  const isAssigningMitra = mitra_id !== undefined && mitra_id !== null;

  // --- Validasi ambang saldo SEBELUM update, hanya saat memang menugaskan mitra ---
  if (isAssigningMitra) {
    const admin = getSupabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("total_price, service_type")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { data: mitra, error: mitraError } = await admin
      .from("profiles")
      .select("wallet_balance, is_active, is_available, unavailable_reason")
      .eq("id", mitra_id as string)
      .single();

    if (mitraError || !mitra) {
      return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    }

    if (!mitra.is_active) {
      return NextResponse.json({ error: "Mitra ini sedang nonaktif." }, { status: 400 });
    }

    if (!mitra.is_available) {
      return NextResponse.json(
        {
          error: `Mitra ini sedang tidak tersedia (${mitra.unavailable_reason ?? "istirahat/sakit/kendala lain"}). Pilih mitra lain.`,
        },
        { status: 400 }
      );
    }

    // BARU (migrasi 030) -- ambang kelayakan sekarang FLAT (15% x harga
    // Setrika Fast = Rp8.250), MENGGANTIKAN pengecekan dinamis per-order
    // (persentase tier + Biaya Teknologi, migrasi 024/028 -- Biaya Teknologi
    // sudah dihapus total). Ini pertahanan berlapis yang SAMA seperti
    // eligible_mitra_for_order() di database (migrasi 030) -- kalau dropdown
    // admin belum sempat refresh.
    const { data: requiredBalance, error: thresholdError } = await admin.rpc(
      "mitra_wallet_threshold"
    );

    if (thresholdError || requiredBalance === null) {
      return NextResponse.json(
        { error: thresholdError?.message ?? "Gagal menghitung ambang saldo minimum mitra." },
        { status: 500 }
      );
    }

    if (mitra.wallet_balance < Number(requiredBalance)) {
      return NextResponse.json(
        {
          error: `Saldo mitra (Rp${mitra.wallet_balance.toLocaleString("id-ID")}) di bawah ambang minimum Rp${Number(requiredBalance).toLocaleString("id-ID")} (ambang flat, berlaku sama untuk semua pesanan).`,
        },
        { status: 400 }
      );
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (mitra_id !== undefined) updateFields.mitra_id = mitra_id;
  if (status !== undefined) updateFields.status = status;
  // Begitu mitra ditugaskan, status otomatis ikut jadi 'assigned' kalau
  // pemanggil tidak mengirim status secara eksplisit.
  if (isAssigningMitra && status === undefined) updateFields.status = "assigned";

  const { data: order, error } = await supabase
    .from("orders")
    .update(updateFields)
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Generate invoice PDF (AC4) + kirim notifikasi WA otomatis ke klien,
  // hanya saat memang sedang menugaskan mitra. Profil mitra lengkap diambil
  // sekali, dipakai untuk keduanya. `finalOrder` dikembalikan ke pemanggil
  // supaya field client_notified_at/client_notify_error yang baru langsung
  // terlihat di response (bukan menunggu realtime subscription). ---
  let invoiceResult = null;
  let finalOrder = order;

  if (isAssigningMitra && order) {
    const admin = getSupabaseAdmin();
    const { data: mitraProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", mitra_id as string)
      .single();

    if (mitraProfile) {
      try {
        invoiceResult = await generateInvoicesForOrder(
          order,
          mitraProfile,
          estimasiWaktu ?? "segera"
        );
      } catch (invoiceError) {
        // Penugasan mitra TETAP dianggap berhasil walau invoice gagal
        // di-generate — admin bisa generate ulang manual. Jangan bikin
        // seluruh request gagal (500) hanya karena PDF gagal dibuat.
        console.error("Gagal generate invoice:", invoiceError);
      }

      // Notifikasi ke KLIEN ("pesanan disetujui") dan ke MITRA ("tugas baru")
      // dikirim terpisah (dua nomor tujuan berbeda) tapi hasilnya digabung
      // jadi SATU update ke baris order yang sama.
      const clientMessage = buildOrderApprovedMessage(order, mitraProfile);
      const clientSendResult = await sendFonnteMessage(order.customer_phone, clientMessage);

      const mitraMessage = buildMitraAssignedMessage(order);
      const mitraSendResult = await sendFonnteMessage(mitraProfile.phone, mitraMessage);

      // Pesan sistem pembuka Chat Pesanan (Bagian 7.2/8.2) -- gagal tulis
      // di sini tidak menggagalkan penugasan, cukup dicatat ke console
      // (chat tetap bisa dipakai tanpa pesan pembuka ini).
      const { error: systemMessageError } = await admin.from("order_messages").insert({
        order_id: orderId,
        sender_type: "system",
        sender_id: null,
        sender_name: "Sistem",
        body: `Mitra ${mitraProfile.name} telah ditugaskan untuk pesanan ini. Gunakan chat ini untuk koordinasi jadwal & pertanyaan -- bukan WA pribadi.`,
      });
      if (systemMessageError) {
        console.error("Gagal menulis pesan sistem pembuka chat:", systemMessageError);
      }

      const { data: updatedOrder } = await admin
        .from("orders")
        .update({
          ...(clientSendResult.ok
            ? { client_notified_at: new Date().toISOString(), client_notify_error: null }
            : { client_notify_error: clientSendResult.error }),
          ...(mitraSendResult.ok
            ? { mitra_notified_at: new Date().toISOString(), mitra_notify_error: null }
            : { mitra_notify_error: mitraSendResult.error }),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (updatedOrder) finalOrder = updatedOrder;
    }
  }

  return NextResponse.json({ order: finalOrder, invoice: invoiceResult });
}
