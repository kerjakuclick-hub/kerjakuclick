// FILE BARU: app/api/customer/profile/route.ts
//
// Update profil pelanggan yang sedang login (nama & alamat -- lihat
// components/ProfilKlien.tsx & migrasi 032_customer_profile_address.sql).
// Nomor WA SENGAJA TIDAK BISA diubah lewat endpoint ini -- itu identitas
// login (unik di tabel customers), ganti nomor WA harus lewat alur
// terpisah (belum ada, di luar cakupan revisi ini) supaya tidak bentrok
// dengan sesi yang sedang aktif.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);

  if (!customer) {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan masuk ulang." }, { status: 401 });
  }

  const { nama, alamat } = await req.json();

  const update: { name?: string; address?: string | null } = {};
  if (typeof nama === "string") {
    const trimmed = nama.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
    }
    update.name = trimmed;
  }
  if (typeof alamat === "string") {
    update.address = alamat.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: updated, error } = await admin
    .from("customers")
    .update(update)
    .eq("id", customer.id)
    .select("id, name, phone, address")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Gagal menyimpan profil." }, { status: 500 });
  }

  return NextResponse.json({ customer: updated });
}
