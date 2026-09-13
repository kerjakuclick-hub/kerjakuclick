// FILE BARU: app/api/admin/google-drive/oauth-start/route.ts
//
// Langkah 1 dari setup SEKALI SAJA "Arsip Invoice ke Google Drive": admin
// (harus sudah login) buka endpoint ini di browser -> diarahkan ke consent
// screen Google -> login & izinkan akses -> Google redirect balik ke
// oauth-callback/route.ts yang menampilkan refresh token untuk disalin ke
// Vercel. Setelah refresh token tersimpan di env var, endpoint ini TIDAK
// perlu dipakai lagi (bukan bagian dari alur operasional sehari-hari).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/googleDrive";

export async function GET() {
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

  try {
    return NextResponse.redirect(buildGoogleAuthUrl());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membangun URL otorisasi Google.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
