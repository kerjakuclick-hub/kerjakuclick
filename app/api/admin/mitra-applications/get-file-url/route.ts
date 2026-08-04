// FILE BARU: app/api/admin/mitra-applications/get-file-url/route.ts
//
// Generate signed URL SEMENTARA (5 menit) untuk admin membuka dokumen
// KTP/KK/foto pendaftar — TIDAK ADA link permanen/publik ke dokumen ini.

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

  const { path } = await req.json();
  if (!path) {
    return NextResponse.json({ error: "path wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from("mitra-applications")
    .createSignedUrl(path, 300); // berlaku 5 menit

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
