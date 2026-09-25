// GANTI ISI app/api/admin/orders/retry-notify/route.ts Anda dengan file ini.
//
// Perubahan (fitur "Notifikasi Mitra Otomatis", migrasi 022): endpoint ini
// dulu cuma retry notifikasi ke KLIEN. Sekarang retry KEDUANYA -- klien
// ("pesanan disetujui") dan mitra ("tugas baru") -- masing-masing HANYA
// dikirim ulang kalau memang belum pernah sukses (client_notified_at /
// mitra_notified_at masih null). Kalau salah satu sudah sukses duluan
// (mis. notifikasi klien berhasil tapi mitra gagal saat penugasan), retry
// ini tidak mengirim ulang yang sudah sukses -- cuma menutup yang gagal.
//
// Perubahan BARU (18 September 2026) -- fitur "Otomatisasi Invoice
// Pembayaran" (migrasi 027): endpoint ini sekarang juga retry pengiriman WA
// invoice pembayaran kalau order sudah completed, sudah punya invoice
// pembayaran ter-generate, TAPI belum berhasil terkirim
// (invoice_notified_at masih null). Pola sama persis dengan retry klien/
// mitra di atas -- HANYA mengirim ulang yang memang masih gagal, tidak
// menyentuh yang sudah sukses. Pesan sistem di Chat Pesanan (order_messages)
// TIDAK dikirim ulang di sini -- itu sudah tercatat sekali saat invoice
// pertama kali terbit (app/api/mitra/orders/update/route.ts); yang sering
// gagal & butuh retry adalah pengiriman Fonnte-nya, bukan chat in-app-nya.
//
// Dipakai admin lewat tombol "Coba Kirim Lagi" di OrdersFeed, muncul di
// kolom manapun (Notifikasi Klien / Notifikasi Mitra / Invoice Pembayaran)
// yang masih menunjukkan error. Bukan langkah rutin -- pengiriman normal
// sudah otomatis saat mitra ditugaskan (assign/route.ts) atau saat tugas
// diselesaikan (mitra/orders/update/route.ts).

import { ensureBusinessParams } from "@/lib/businessParams";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  sendFonnteMessage,
  buildOrderApprovedMessage,
  buildMitraAssignedMessage,
  buildPaymentInvoiceMessage,
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

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (!order.mitra_id) {
    return NextResponse.json(
      { error: "Pesanan ini belum ditugaskan ke mitra manapun." },
      { status: 400 }
    );
  }

  // select("*") (bukan cuma name/status/skill_category/rating seperti versi
  // lama) supaya kolom `phone` ikut terambil -- dibutuhkan untuk kirim ulang
  // notifikasi ke MITRA.
  const { data: mitraProfile, error: mitraError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", order.mitra_id)
    .single();
  if (mitraError || !mitraProfile) {
    return NextResponse.json({ error: "Profil mitra tidak ditemukan." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const errors: string[] = [];

  if (!order.client_notified_at) {
    const clientMessage = buildOrderApprovedMessage(order, mitraProfile);
    const clientResult = await sendFonnteMessage(order.customer_phone, clientMessage);
    if (clientResult.ok) {
      updates.client_notified_at = new Date().toISOString();
      updates.client_notify_error = null;
    } else {
      updates.client_notify_error = clientResult.error;
      errors.push(`Klien: ${clientResult.error}`);
    }
  }

  if (!order.mitra_notified_at) {
    const mitraMessage = buildMitraAssignedMessage(order);
    const mitraResult = await sendFonnteMessage(mitraProfile.phone, mitraMessage);
    if (mitraResult.ok) {
      updates.mitra_notified_at = new Date().toISOString();
      updates.mitra_notify_error = null;
    } else {
      updates.mitra_notify_error = mitraResult.error;
      errors.push(`Mitra: ${mitraResult.error}`);
    }
  }

  // Retry WA invoice pembayaran -- hanya relevan kalau order sudah completed
  // & memang belum pernah sukses terkirim.
  if (order.status === "completed" && !order.invoice_notified_at) {
    const { data: invoice } = await admin
      .from("invoices")
      .select("file_url")
      .eq("order_id", orderId)
      .eq("purpose", "pembayaran")
      .eq("recipient_type", "klien")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoice?.file_url) {
      const invoiceMessage = buildPaymentInvoiceMessage(order, invoice.file_url);
      const invoiceResult = await sendFonnteMessage(order.customer_phone, invoiceMessage);
      if (invoiceResult.ok) {
        updates.invoice_notified_at = new Date().toISOString();
        updates.invoice_notify_error = null;
      } else {
        updates.invoice_notify_error = invoiceResult.error;
        errors.push(`Invoice: ${invoiceResult.error}`);
      }
    }
  }

  const { data: updatedOrder, error: updateError } = await admin
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" | "), order: updatedOrder }, { status: 502 });
  }

  return NextResponse.json({ order: updatedOrder });
}
