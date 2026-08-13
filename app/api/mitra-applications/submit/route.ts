// GANTI ISI app/api/mitra-applications/submit/route.ts Anda dengan file ini.
//
// Perubahan: terima field baru last_education, is_student, dan file
// student_id (KTM) yang WAJIB diupload kalau is_student = true.

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
  const skillCategory = formData.getAll("skill_category") as string[];
  const photo = formData.get("photo") as File | null;
  const ktp = formData.get("ktp") as File | null;
  const kk = formData.get("kk") as File | null;
  const studentId = formData.get("student_id") as File | null;

  if (
    !full_name ||
    !address ||
    !phone ||
    !last_education ||
    skillCategory.length === 0 ||
    !photo ||
    !ktp ||
    !kk
  ) {
    return NextResponse.json(
      { error: "Semua field wajib diisi, termasuk foto profil, KTP, dan KK." },
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
    const uploads: Promise<string>[] = [
      uploadDoc(admin, photo, "foto-profil"),
      uploadDoc(admin, ktp, "ktp"),
      uploadDoc(admin, kk, "kk"),
    ];
    if (is_student && studentId) {
      uploads.push(uploadDoc(admin, studentId, "ktm"));
    }

    const results = await Promise.all(uploads);
    const [photoPath, ktpPath, kkPath, studentIdPath] = results;

    const { error: insertError } = await admin.from("mitra_applications").insert({
      full_name,
      address,
      phone,
      social_media,
      last_education,
      is_student,
      skill_category: skillCategory,
      photo_path: photoPath,
      ktp_path: ktpPath,
      kk_path: kkPath,
      student_id_path: studentIdPath ?? null,
    });

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim pendaftaran.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
