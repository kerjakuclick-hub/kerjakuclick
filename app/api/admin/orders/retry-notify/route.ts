// FILE BARU: app/api/admin/orders/retry-notify/route.ts
//
// Coba kirim ULANG notifikasi WA "pesanan disetujui" ke klien -- dipakai
// admin lewat tombol "Coba Kirim Lagi" di OrdersFeed, HANYA muncul saat
// pengiriman otomatis di assign/route.ts gagal (orders.client_notify_error
// terisi). Bukan langkah rutin -- pengiriman normal sudah otomatis saat
// mitra ditugaskan.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendFonnteMessage, buildOrderApprovedMessage } from "@/lib/whatsapp";

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

  const { data: mitraProfile, error: mitraError } = await admin
    .from("profiles")
    .select("name, status, skill_category, rating")
    .eq("id", order.mitra_id)
    .single();
  if (mitraError || !mitraProfile) {
    return NextResponse.json({ error: "Profil mitra tidak ditemukan." }, { status: 404 });
  }

  const message = buildOrderApprovedMessage(order, mitraProfile);
  const sendResult = await sendFonnteMessage(order.customer_phone, message);

  const { data: updatedOrder, error: updateError } = await admin
    .from("orders")
    .update(
      sendResult.ok
        ? { client_notified_at: new Date().toISOString(), client_notify_error: null }
        : { client_notify_error: sendResult.error }
    )
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error, order: updatedOrder }, { status: 502 });
  }

  return NextResponse.json({ order: updatedOrder });
}
