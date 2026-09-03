// FILE BARU: app/api/customer/register/route.ts
//
// Daftar akun pelanggan baru: nama + no WA + PIN 4 digit. Kalau nomor WA
// sudah terdaftar, ditolak dengan pesan minta login (bukan bikin akun
// dobel). Berhasil daftar langsung membuatkan sesi (auto-login), sama
// seperti alur login biasa.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SESSION_COOKIE_NAME,
  normalizeCustomerPhone,
  isValidPin,
  hashPin,
  createCustomerSession,
  sessionCookieOptions,
} from "@/lib/customerAuth";

export async function POST(req: NextRequest) {
  const { nama, noHp, pin } = await req.json();

  if (!nama?.trim() || !noHp?.trim()) {
    return NextResponse.json({ error: "Nama dan nomor WA wajib diisi." }, { status: 400 });
  }
  if (!isValidPin(pin ?? "")) {
    return NextResponse.json({ error: "PIN harus 4 angka." }, { status: 400 });
  }

  const phone = normalizeCustomerPhone(noHp);
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Nomor WA ini sudah terdaftar. Silakan masuk." },
      { status: 409 }
    );
  }

  const { data: customer, error } = await admin
    .from("customers")
    .insert({ name: nama.trim(), phone, pin_hash: hashPin(pin) })
    .select("id, name, phone")
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: error?.message ?? "Gagal mendaftar." }, { status: 500 });
  }

  const { token, expiresAt } = await createCustomerSession(customer.id);
  const res = NextResponse.json({ customer });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return res;
}
