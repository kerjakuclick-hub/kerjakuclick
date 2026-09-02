// FILE BARU: app/api/admin/orders/mark-klien-confirmed/route.ts
//
// Dipanggil saat admin menekan tombol "Tandai Terkirim" di kolom
// "Konfirmasi Klien" -- menandai SEKALIGUS invoice klien (kalau sudah
// ter-generate) dan ID Card mitra sebagai terkirim, karena keduanya
// dikirim bersamaan dalam satu pesan konfirmasi ke klien (satu langkah,
// bukan dua tombol "Tandai Terkirim" terpisah seperti sebelumnya).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { orderId, klienInvoiceId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: updatedOrder, error: orderError } = await admin
    .from("orders")
    .update({ mitra_id_card_sent_at: now, mitra_id_card_sent_by: user.id })
    .eq("id", orderId)
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  let updatedInvoice = null;
  if (klienInvoiceId) {
    const { data } = await admin
      .from("invoices")
      .update({ sent_at: now, sent_by: user.id })
      .eq("id", klienInvoiceId)
      .select()
      .single();
    // Kalau update invoice gagal/tidak ada, order tetap dianggap berhasil
    // ditandai -- admin masih bisa cek statusnya lewat kolom Invoice Mitra.
    updatedInvoice = data ?? null;
  }

  return NextResponse.json({ order: updatedOrder, invoice: updatedInvoice });
}
