// FILE BARU: app/api/customer/reset-pin/confirm/route.ts
//
// Dipanggil dari halaman web (app/reset-pin/page.tsx — belum dibuat, lihat
// catatan di chat) setelah pelanggan memasukkan nomor WA + OTP yang diterima
// via WhatsApp + PIN baru yang diinginkan.

import { NextRequest, NextResponse } from "next/server";
import { confirmPinReset } from "@/lib/customerAuth";

export async function POST(req: NextRequest) {
  const { noHp, otp, pinBaru } = await req.json();

  if (!noHp?.trim() || !otp?.trim() || !pinBaru?.trim()) {
    return NextResponse.json(
      { error: "Nomor WA, kode OTP, dan PIN baru wajib diisi." },
      { status: 400 }
    );
  }

  const result = await confirmPinReset(noHp, otp, pinBaru);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
