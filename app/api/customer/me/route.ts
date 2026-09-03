// FILE BARU: app/api/customer/me/route.ts
//
// Dicek dari OrderForm & halaman /riwayat saat pertama dibuka, untuk tahu
// apakah pelanggan sudah login. Sengaja SELALU balas 200 (bukan 401 saat
// belum login) supaya sisi client cukup baca `data.customer` (null kalau
// belum login) tanpa perlu percabangan status code.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);
  return NextResponse.json({ customer });
}
