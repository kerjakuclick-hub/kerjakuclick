// FILE BARU: app/api/admin/media/delete-slot/route.ts
//
// Menghapus slot media library. Dipakai untuk membersihkan slot promo yang
// sudah tidak relevan lagi (mis. banner promo lama).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// 3 slot ini dipakai langsung oleh ServicesGrid.tsx di landing page —
// dicegah terhapus dari sini supaya tidak ada bagian landing page yang
// tiba-tiba kehilangan slot gambarnya. Hapus dari database manual kalau
// memang benar-benar diperlukan.
const PROTECTED_SLUGS = ["service_setrika", "service_bersihkan_rumah", "service_cuci_kendaraan"];

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

  const { slug } = await req.json();
  if (!slug) {
    return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });
  }
  if (PROTECTED_SLUGS.includes(slug)) {
    return NextResponse.json(
      { error: "Slot ini dipakai langsung oleh landing page, tidak bisa dihapus dari sini." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("site_media").delete().eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
