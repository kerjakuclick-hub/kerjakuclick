// GANTI ISI app/api/riwayat/route.ts Anda dengan file ini (kalau belum
// sempat dipasang dari revisi sebelumnya, ini FILE BARU).
//
// PERUBAHAN PENTING (perbaikan celah privasi): endpoint ini TIDAK LAGI
// menerima nomor HP lewat query param publik (?phone=...) -- itu berarti
// siapa saja bisa ketik nomor HP orang lain dan lihat riwayat pesanannya.
// Sekarang endpoint ini HANYA baca dari sesi login pelanggan (cookie
// httpOnly, lihat lib/customerAuth.ts) -- pelanggan cuma bisa lihat
// riwayat miliknya sendiri.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { phoneLookupVariants } from "@/lib/whatsapp";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);

  if (!customer) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // orders.customer_phone berasal dari parsing pesan WA (webhook Fonnte),
  // formatnya bisa "0812..." atau "62812...". phoneLookupVariants()
  // mencocokkan kedua kemungkinan supaya order lama tetap ketemu.
  const { data, error } = await admin
    .from("orders")
    .select(
      "id, service_type, total_price, address, scheduled_date, preferred_time, mitra_gender_preference, status, created_at, customer_name, customer_phone"
    )
    .in("customer_phone", phoneLookupVariants(customer.phone))
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
