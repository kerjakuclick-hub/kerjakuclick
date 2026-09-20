// GANTI ISI app/api/mitra-applications/submit/route.ts Anda dengan file ini.
//
// Perubahan: terima field baru last_education, is_student, dan file
// student_id (KTM) yang WAJIB diupload kalau is_student = true.
//
// Perubahan BESAR (20 September 2026, migrasi 031) -- upload foto KTP & KK
// DIHAPUS dari alur ini: sekarang cuma terima 2 field boolean has_ktp/
// has_kk (checklist self-declaration dari form), TIDAK ADA LAGI upload file
// ktp/kk ke storage (ktp_path/kk_path selalu NULL untuk pendaftaran baru).
// photo (Foto Profil) & student_id (KTM) TIDAK berubah, tetap wajib
// diupload seperti sebelumnya.

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
  const last_education = (formData.get("last_education") as string)?.trim();
  const is_student = formData.get("is_student") === "true";
  const has_ktp = formData.get("has_ktp") === "true";
  const has_kk = formData.get("has_kk") === "true";
  const skillCategory = formData.getAll("skill_category") as string[];
  const photo = formData.get("photo") as File | null;
  const studentId = formData.get("student_id") as File | null;

  if (
    !full_name ||
    !address ||
    !phone ||
    !last_education ||
    skillCategory.length === 0 ||
    !photo
  ) {
    return NextResponse.json(
      { error: "Semua field wajib diisi, termasuk foto profil." },
      { status: 400 }
    );
  }

  if (!has_ktp || !has_kk) {
    return NextResponse.json(
      { error: "Checklist KTP & KK wajib dicentang -- keduanya harus dimiliki untuk jadi mitra." },
      { status: 400 }
    );
  }

  if (is_student && (!studentId || studentId.size === 0)) {
    return NextResponse.json(
      { error: "Karena masih berkuliah, foto KTM wajib diunggah." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  try {
    const photoPath = await uploadDoc(admin, photo, "foto-profil");
    const studentIdPath =
      is_student && studentId ? await uploadDoc(admin, studentId, "ktm") : null;

    const { error: insertError } = await admin.from("mitra_applications").insert({
      full_name,
      address,
      phone,
      social_media,
      last_education,
      is_student,
      has_ktp,
      has_kk,
      skill_category: skillCategory,
      photo_path: photoPath,
      ktp_path: null,
      kk_path: null,
      student_id_path: studentIdPath,
    });

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim pendaftaran.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
