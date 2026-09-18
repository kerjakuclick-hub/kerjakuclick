// FILE BARU: app/api/customer/orders/[id]/messages/route.ts
//
// Chat Pesanan sisi PELANGGAN (Bagian 7.2/8.2, migrasi
// 025_order_messages_trust_safety.sql). Pelanggan BUKAN Supabase Auth user
// (lihat migrasi 018_customer_accounts.sql -- customers/customer_sessions
// RLS aktif TANPA policy publik, akses HANYA lewat service-role di server),
// jadi tabel order_messages juga TIDAK punya policy untuk pelanggan; route
// ini yang jadi satu-satunya jalan baca/tulis chat milik pelanggan, setelah:
//   1. Verifikasi sesi login (cookie kerjaku_customer_session).
//   2. Verifikasi order_id itu benar milik nomor HP pelanggan yang login --
//      orders TIDAK punya customer_id FK (lihat app/api/customer/riwayat/
//      route.ts), jadi pencocokannya pakai logika "nomor lokal" yang sama
//      persis dipakai di sana (digit bersih, buang awalan 0/62), supaya
//      konsisten dan tidak ada celah antara dua endpoint ini.
//
// GET  -> daftar pesan untuk order ini (dipakai OrderChatCustomer.tsx,
//         di-poll berkala karena pelanggan tidak punya sesi Realtime).
// POST -> kirim pesan baru dari pelanggan, { body: string }.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";

/** Sama persis dengan app/api/customer/riwayat/route.ts -- SENGAJA
 *  diduplikasi (bukan diimpor-silang) supaya endpoint riwayat yang sudah
 *  teruji tidak ikut berubah risikonya kalau logika di sini nanti diubah. */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}
function localSuffix(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("62")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

async function authorize(req: NextRequest, orderId: number) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);
  if (!customer) {
    return { ok: false as const, status: 401, error: "Silakan masuk dulu." };
  }
  if (!Number.isFinite(orderId)) {
    return { ok: false as const, status: 400, error: "ID pesanan tidak valid." };
  }

  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, customer_phone")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false as const, status: 404, error: "Pesanan tidak ditemukan." };
  }
  if (localSuffix(order.customer_phone) !== localSuffix(customer.phone)) {
    return { ok: false as const, status: 403, error: "Pesanan ini bukan milik Anda." };
  }

  return { ok: true as const, customer, admin };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  const auth = await authorize(req, orderId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.admin
    .from("order_messages")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  const auth = await authorize(req, orderId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { body } = (await req.json()) as { body?: string };
  const text = (body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Pesan terlalu panjang (maks. 2000 karakter)." }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("order_messages")
    .insert({
      order_id: orderId,
      sender_type: "customer",
      sender_id: auth.customer.id,
      sender_name: auth.customer.name,
      body: text,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
