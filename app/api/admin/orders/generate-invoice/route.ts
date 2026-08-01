// FILE BARU: app/api/admin/orders/generate-invoice/route.ts
//
// Dipanggil admin secara manual lewat tombol "Generate Invoice" di
// OrdersFeed, untuk kasus invoice gagal ter-generate otomatis saat
// penugasan (mis. karena bucket Storage belum ada saat itu, lalu sudah
// dibuat belakangan — tinggal klik ulang, tidak perlu tugaskan ulang
// mitranya).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateInvoicesForOrder } from "@/lib/pdf/generate-invoice";

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

  const { orderId, estimasiWaktu } = await req.json();
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

  const { data: mitraProfile, error: mitraError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", order.mitra_id)
    .single();
  if (mitraError || !mitraProfile) {
    return NextResponse.json({ error: "Profil mitra tidak ditemukan." }, { status: 404 });
  }

  try {
    const invoice = await generateInvoicesForOrder(
      order,
      mitraProfile,
      estimasiWaktu ?? "segera"
    );
    return NextResponse.json({ invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal generate invoice.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
