// BARU — app/api/mitra/availability/route.ts
//
// Endpoint self-service mitra untuk menyalakan/mematikan status
// ketersediaan dari Dasbor Mitra (fitur on/off: istirahat/sakit/kendala
// lain, migrasi 023). Pola otentikasi sama dengan
// app/api/mitra/orders/update/route.ts (client bersesi + cek role), tapi
// PENULISAN memakai getSupabaseAdmin() (service role) karena belum ada
// kebijakan RLS self-UPDATE untuk mitra di tabel profiles — akses tetap
// dijaga di kode: .eq("id", user.id) memastikan mitra hanya bisa mengubah
// baris miliknya sendiri.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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
  if (profile?.role !== "mitra") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { isAvailable, reason } = await req.json();
  if (typeof isAvailable !== "boolean") {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: updated, error } = await admin
    .from("profiles")
    .update(
      isAvailable
        ? { is_available: true, unavailable_reason: null, unavailable_since: null }
        : {
            is_available: false,
            unavailable_reason:
              typeof reason === "string" && reason.trim() ? reason.trim() : "Tidak disebutkan",
            unavailable_since: new Date().toISOString(),
          }
    )
    .eq("id", user.id) // penjaga akses: hanya baris milik mitra yang login sendiri
    .select("id, is_available, unavailable_reason, unavailable_since")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
