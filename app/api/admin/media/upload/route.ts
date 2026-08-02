// FILE BARU: app/api/admin/media/upload/route.ts
//
// Upload/ganti gambar untuk satu slot media library.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const slug = formData.get("slug") as string | null;

  if (!file || !slug) {
    return NextResponse.json({ error: "file dan slug wajib diisi." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format file harus JPG, PNG, atau WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${slug}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("site-media")
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: `Gagal upload gambar: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = admin.storage.from("site-media").getPublicUrl(fileName);

  const { data: updated, error: updateError } = await admin
    .from("site_media")
    .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("slug", slug)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ media: updated });
}
