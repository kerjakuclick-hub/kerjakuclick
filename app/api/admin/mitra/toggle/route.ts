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

  const { mitraId } = await req.json();
  if (!mitraId) {
    return NextResponse.json({ error: "mitraId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: current, error: fetchError } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", mitraId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ is_active: !current.is_active })
    .eq("id", mitraId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
