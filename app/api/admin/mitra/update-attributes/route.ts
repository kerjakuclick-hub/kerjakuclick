// GANTI ISI app/api/admin/mitra/update-attributes/route.ts Anda dengan file ini.
//
// Perubahan: `skill_category` sekarang array of string, bukan 1 string.

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

  const { mitraId, gender, skill_category } = await req.json();
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

  const admin = getSupabaseAdmin();

  const updateFields: Record<string, unknown> = {};
  if (gender !== undefined) updateFields.gender = gender;
  if (skill_category !== undefined) updateFields.skill_category = skill_category;

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
