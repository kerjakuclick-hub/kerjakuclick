// FILE BARU: app/api/admin/media/create-slot/route.ts
//
// Menambah slot media library baru (mis. banner promo baru), belum ada
// gambarnya dulu — admin bisa upload fotonya setelah slot dibuat.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function slugify(label: string) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `slot_${Date.now()}`
  );
}

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

  const { label } = await req.json();
  if (!label || typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "Nama media wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let slug = slugify(label);

  // Pastikan slug unik — kalau sudah ada, tambah angka di belakang.
  const { data: existing } = await admin.from("site_media").select("slug").like("slug", `${slug}%`);
  if (existing && existing.some((row) => row.slug === slug)) {
    slug = `${slug}_${existing.length + 1}`;
  }

  const { data: created, error } = await admin
    .from("site_media")
    .insert({ slug, label: label.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: created });
}
