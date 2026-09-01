// FILE BARU: app/api/admin/mitra/id-card/route.ts
//
// GET /api/admin/mitra/id-card?mitraId=xxx
// Menghasilkan gambar PNG ID Card mitra secara dinamis dari data profiles
// TERBARU (bukan gambar tersimpan) -- dipanggil saat admin klik tombol
// "Kirim ID Mitra via WA" di OrdersFeed.tsx.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateMitraIdCardImage } from "@/lib/pdf/generate-mitra-id-card";

export async function GET(req: NextRequest) {
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

  const mitraId = req.nextUrl.searchParams.get("mitraId");
  if (!mitraId) {
    return NextResponse.json({ error: "mitraId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: mitra, error } = await admin
    .from("profiles")
    .select("name, photo_url, skill_category, status")
    .eq("id", mitraId)
    .eq("role", "mitra")
    .single();

  if (error || !mitra) {
    return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
  }

  return generateMitraIdCardImage(mitra);
}
