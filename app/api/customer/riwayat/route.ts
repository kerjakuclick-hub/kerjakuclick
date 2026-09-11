// app/api/customer/riwayat/route.ts
//
// PERBAIKAN: orders.customer_phone diisi mentah dari teks pesan WA (bisa
// ada spasi/"+"/strip di dalamnya), sedangkan customers.phone sudah
// dinormalisasi bersih. Exact-match .in() gampang gagal kalau ada 1
// karakter beda. Solusinya: cocokkan berdasar DIGIT SAJA (buang semua
// karakter non-angka dari kedua sisi), lalu bandingkan bagian "nomor
// lokal"-nya (buang awalan 0/62) -- supaya "0812...", "62812...",
// "+62 812...", "62-812-..." semua dianggap nomor yang sama.
//
// Tidak ada perubahan skema/tabel: query tetap ambil dari `orders` seperti
// biasa, cuma pencocokan nomor HP-nya dipindah ke JavaScript.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";

/** Buang semua karakter selain digit. */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Buang awalan "62" atau "0" dari digit bersih, sisakan "nomor lokal"
 *  (mis. "6285178686678" -> "85178686678", "085178686678" -> "85178686678").
 *  Ini yang dipakai sebagai kunci pembanding, supaya format awalan beda
 *  tidak masalah. */
function localSuffix(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("62")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);

  if (!customer) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const targetSuffix = localSuffix(customer.phone);

  // Ambil kandidat lewat ilike (broad filter, masih pakai index/pencarian
  // teks biasa di database) berdasar 8 digit terakhir -- bagian ini nyaris
  // pasti sama persis di semua format penulisan nomor yang sama, jadi aman
  // dipakai sebagai penyaring awal supaya tidak perlu fetch seluruh tabel.
  const last8 = targetSuffix.slice(-8);

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, service_type, total_price, address, scheduled_date, preferred_time, mitra_gender_preference, status, created_at, customer_name, customer_phone"
    )
    .ilike("customer_phone", `%${last8}%`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Saring presisi di JavaScript: cocokkan nomor lokal (digit bersih,
  // tanpa awalan 0/62) -- ini yang menangani kasus spasi/"+"/strip/dsb
  // yang lolos dari query ilike di atas.
  const orders = (data ?? []).filter(
    (o) => localSuffix(o.customer_phone) === targetSuffix
  );

  return NextResponse.json({ orders });
}