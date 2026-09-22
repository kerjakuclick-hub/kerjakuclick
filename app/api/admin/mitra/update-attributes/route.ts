// GANTI ISI app/api/admin/mitra/update-attributes/route.ts Anda dengan file ini.
//
// Perubahan: `skill_category` sekarang array of string, bukan 1 string.
//
// BARU (22 September 2026) -- Program Loyalty Tier FINAL (migrasi 034):
// endpoint ini sekarang JUGA bisa mengubah `status` ('training'/'ahli') &
// `sosmed_active` (boolean) -- dua syarat loyalty tier yang DIKONFIRMASI
// diisi MANUAL oleh admin (pola sama dengan gender/skill_category yang
// sudah ada di sini, DAN violation_count yang sudah punya endpoint
// tersendiri di .../violations/route.ts). Sebelum ini, `status` mitra HANYA
// bisa diisi saat pembuatan akun (default 'training') -- TIDAK ADA cara
// admin mengubahnya lagi, padahal kolom ini sekarang jadi syarat dasar tier
// Reguler/Commit/Pro ('ahli') vs New ('training'). Lihat UI barunya di
// components/admin/MitraTable.tsx.

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
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { mitraId, gender, skill_category, status, sosmed_active } = await req.json();
  if (!mitraId) {
    return NextResponse.json({ error: "mitraId wajib diisi." }, { status: 400 });
  }
  if (gender !== undefined && gender !== null && !["Pria", "Wanita"].includes(gender)) {
    return NextResponse.json({ error: "gender harus 'Pria' atau 'Wanita'." }, { status: 400 });
  }
  if (skill_category !== undefined && skill_category !== null && !Array.isArray(skill_category)) {
    return NextResponse.json(
      { error: "skill_category harus berupa array (bisa lebih dari 1 keahlian)." },
      { status: 400 }
    );
  }
  if (status !== undefined && !["training", "ahli"].includes(status)) {
    return NextResponse.json({ error: "status harus 'training' atau 'ahli'." }, { status: 400 });
  }
  if (sosmed_active !== undefined && typeof sosmed_active !== "boolean") {
    return NextResponse.json({ error: "sosmed_active harus boolean." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const updateFields: Record<string, unknown> = {};
  if (gender !== undefined) updateFields.gender = gender;
  if (skill_category !== undefined) updateFields.skill_category = skill_category;
  if (status !== undefined) updateFields.status = status;
  if (sosmed_active !== undefined) updateFields.sosmed_active = sosmed_active;

  const { data: updated, error } = await admin
    .from("profiles")
    .update(updateFields)
    .eq("id", mitraId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
