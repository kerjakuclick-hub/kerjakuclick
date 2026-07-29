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

  const { name, phone, email, password } = await req.json();
  if (!name || !phone || !email || !password) {
    return NextResponse.json({ error: "Semua field wajib diisi." }, { status: 400 });
  }

  // Butuh service_role key (bypass RLS + akses Admin Auth API) untuk
  // membuat akun login mitra baru — makanya pakai getSupabaseAdmin(),
  // bukan client bersesi biasa.
  const admin = getSupabaseAdmin();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Gagal membuat akun mitra." },
      { status: 500 }
    );
  }

  const { data: newProfile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: created.user.id,
      name,
      phone,
      role: "mitra",
    })
    .select()
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ profile: newProfile });
}
