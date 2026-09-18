// GANTI ISI app/api/mitra/orders/update/route.ts Anda dengan file ini.
//
// Perubahan (fitur "Invoice Pembayaran"): begitu mitra klik "Selesaikan
// Tugas" (status -> completed), invoice pembayaran otomatis terbit lewat
// generatePaymentInvoiceForOrder(). Kegagalan generate invoice TIDAK
// menggagalkan penyelesaian tugas.
//
// Perubahan BARU (18 September 2026) -- fitur "Otomatisasi Invoice
// Pembayaran" (lanjutan Bagian 7.2/8.2, migrasi
// 027_order_extra_time_and_invoice_notify.sql): SEBELUMNYA mitra sendiri
// yang harus unduh PDF invoice lalu kirim manual ke klien via WA
// pribadinya (tombol "Kirim ke WA Klien" di TaskList.tsx). SEKARANG begitu
// invoice terbit, sistem OTOMATIS:
//   1. Kirim pesan sistem ke Chat Pesanan (order_messages) berisi ringkasan
//      & link invoice -- klien langsung lihat di chat tanpa perlu mitra
//      mengetik apa pun.
//   2. Kirim WA lewat Fonnte ke nomor klien berisi ringkasan & link invoice
//      (buildPaymentInvoiceMessage) -- hasilnya (berhasil/gagal) dicatat ke
//      invoice_notified_at/invoice_notify_error supaya admin bisa pantau &
//      kirim ulang kalau gagal (pola sama dengan client_notified_at &
//      mitra_notified_at).
// Mitra sekarang cukup memberi tahu klien secara lisan/Chat Pesanan bahwa
// pekerjaan sudah selesai -- tidak perlu lagi unduh & kirim file manual.
// Kedua langkah ini best-effort: kegagalannya TIDAK menggagalkan
// penyelesaian tugas atau penerbitan invoice itu sendiri.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePaymentInvoiceForOrder } from "@/lib/pdf/generate-invoice";
import { sendFonnteMessage, buildPaymentInvoiceMessage } from "@/lib/whatsapp";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  assigned: ["working"],
  working: ["completed"],
};

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "mitra") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { orderId, status } = await req.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("status, mitra_id")
    .eq("id", orderId)
    .single();

  if (fetchError || !currentOrder) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  if (currentOrder.mitra_id !== user.id) {
    return NextResponse.json({ error: "Ini bukan tugas Anda." }, { status: 403 });
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentOrder.status] ?? [];
  if (!allowedNext.includes(status)) {
    return NextResponse.json(
      { error: `Tidak bisa mengubah status dari ${currentOrder.status} ke ${status}.` },
      { status: 400 }
    );
  }

  // Pakai client bersesi mitra sendiri (bukan service role) supaya RLS
  // "orders_mitra_update_own" tetap jadi penjaga akses yang sesungguhnya.
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Invoice pembayaran terbit otomatis begitu tugas diselesaikan ---
  let invoice = null;
  if (status === "completed" && order) {
    try {
      invoice = await generatePaymentInvoiceForOrder(order, profile?.name ?? "Mitra Kerjaku.click");
    } catch (invoiceError) {
      console.error("Gagal generate invoice pembayaran:", invoiceError);
    }

    // --- Distribusi otomatis: Chat Pesanan (in-app) + WA Fonnte ---
    // Pakai service-role di sini (bukan client bersesi mitra) karena insert
    // pesan sistem & update invoice_notified_at bukan aksi "milik" mitra --
    // sama seperti pola pesan sistem lain di order_messages.
    if (invoice?.file_url) {
      const admin = getSupabaseAdmin();

      try {
        await admin.from("order_messages").insert({
          order_id: orderId,
          sender_type: "system",
          sender_id: null,
          sender_name: "Sistem",
          body: `🧾 Invoice pembayaran sudah terbit — Total Rp${order.total_price.toLocaleString(
            "id-ID"
          )}. Unduh: ${invoice.file_url}\n(Juga sudah dikirim ke WhatsApp Anda & bisa dilihat kapan saja di halaman Riwayat Pesanan.)`,
        });
      } catch (chatError) {
        console.error("Gagal kirim pesan sistem invoice ke chat:", chatError);
      }

      const message = buildPaymentInvoiceMessage(order, invoice.file_url);
      const sendResult = await sendFonnteMessage(order.customer_phone, message);

      const { error: notifyUpdateError } = await admin
        .from("orders")
        .update(
          sendResult.ok
            ? { invoice_notified_at: new Date().toISOString(), invoice_notify_error: null }
            : { invoice_notify_error: sendResult.error }
        )
        .eq("id", orderId);

      if (notifyUpdateError) {
        console.error("Gagal mencatat status notifikasi invoice:", notifyUpdateError);
      }
    }
  }

  return NextResponse.json({ order, invoice });
}
