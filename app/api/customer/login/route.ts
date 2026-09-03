// FILE BARU: app/api/customer/login/route.ts
//
// Login pakai no WA + PIN 4 digit. Ada lockout sederhana: 5x PIN salah
// berturut-turut -> akun terkunci 15 menit (PIN 4 digit cuma 10.000
// kombinasi, tanpa batas ini gampang ditebak lewat percobaan otomatis).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SESSION_COOKIE_NAME,
  normalizeCustomerPhone,
  isValidPin,
  verifyPin,
  createCustomerSession,
  sessionCookieOptions,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
} from "@/lib/customerAuth";

export async function POST(req: NextRequest) {
  const { noHp, pin } = await req.json();

  if (!noHp?.trim() || !isValidPin(pin ?? "")) {
    return NextResponse.json(
      { error: "Nomor WA & PIN wajib diisi (PIN 4 angka)." },
      { status: 400 }
    );
  }

  const phone = normalizeCustomerPhone(noHp);
  const admin = getSupabaseAdmin();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone, pin_hash, failed_attempts, locked_until")
    .eq("phone", phone)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json(
      { error: "Nomor WA belum terdaftar. Silakan daftar dulu." },
      { status: 404 }
    );
  }

  if (customer.locked_until && new Date(customer.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(customer.locked_until).getTime() - Date.now()) / 60000
    );
    return NextResponse.json(
      { error: `Terlalu banyak percobaan salah. Coba lagi dalam ${minutesLeft} menit.` },
      { status: 429 }
    );
  }

  const valid = verifyPin(pin, customer.pin_hash);

  if (!valid) {
    const attempts = customer.failed_attempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await admin
      .from("customers")
      .update({
        failed_attempts: locked ? 0 : attempts,
        locked_until: locked
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null,
      })
      .eq("id", customer.id);
    return NextResponse.json({ error: "PIN salah." }, { status: 401 });
  }

  await admin
    .from("customers")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("id", customer.id);

  const { token, expiresAt } = await createCustomerSession(customer.id);
  const res = NextResponse.json({
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return res;
}
