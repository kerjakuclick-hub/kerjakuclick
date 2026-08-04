// FILE BARU: app/api/mitra-applications/submit/route.ts
//
// Route PUBLIK (tanpa auth) — dipanggil dari form pendaftaran mitra di
// /daftar-mitra. Upload dokumen ke bucket PRIVATE lewat service role
// (bukan lewat sesi pengunjung), supaya tidak perlu policy INSERT/UPLOAD
// terbuka untuk anon di Storage.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function uploadDoc(admin: SupabaseClient, file: File, prefix: string) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Format ${prefix} harus JPG, PNG, atau WEBP.`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`Ukuran ${prefix} maksimal 5MB.`);
  }
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("mitra-applications")
    .upload(fileName, buffer, { contentType: file.type });

  if (error) throw new Error(`Gagal upload ${prefix}: ${error.message}`);
  return fileName; // simpan PATH, bukan URL publik — bucket-nya privat
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const full_name = (formData.get("full_name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const social_media = (formData.get("social_media") as string)?.trim() || null;
  const skillCategory = formData.getAll("skill_category") as string[];
  const photo = formData.get("photo") as File | null;
  const ktp = formData.get("ktp") as File | null;
  const kk = formData.get("kk") as File | null;

  if (!full_name || !address || !phone || skillCategory.length === 0 || !photo || !ktp || !kk) {
    return NextResponse.json(
      { error: "Semua field wajib diisi, termasuk foto profil, KTP, dan KK." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  try {
    const [photoPath, ktpPath, kkPath] = await Promise.all([
      uploadDoc(admin, photo, "foto-profil"),
      uploadDoc(admin, ktp, "ktp"),
      uploadDoc(admin, kk, "kk"),
    ]);

    const { error: insertError } = await admin.from("mitra_applications").insert({
      full_name,
      address,
      phone,
      social_media,
      skill_category: skillCategory,
      photo_path: photoPath,
      ktp_path: ktpPath,
      kk_path: kkPath,
    });

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim pendaftaran.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
