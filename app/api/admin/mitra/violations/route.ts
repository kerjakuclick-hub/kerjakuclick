// FILE BARU: app/api/admin/mitra/violations/route.ts
//
// "Modul Trust & Safety" (Bagian 8.4 Dokumen Bisnis Revisi Pasca-Audit
// Fraud), migrasi 025_order_messages_trust_safety.sql. profiles.
// violation_count sudah ada sejak migrasi 024 (syarat naik tier Terpercaya/
// Unggulan: 0 pelanggaran) tapi belum ada cara admin mengisinya selain
// query manual -- endpoint ini yang jadi satu-satunya jalan resmi, supaya
// setiap perubahan tercatat sebagai baris di mitra_violations (siapa
// mencatat, kapan, alasannya apa) alih-alih angka lepas yang bisa berubah
// tanpa jejak. violation_count di profiles ikut ter-update OTOMATIS lewat
// trigger database (sync_mitra_violation_count) -- endpoint ini tidak
// pernah menulis langsung ke kolom itu.
//
// GET    ?mitraId=... -> daftar riwayat pelanggaran mitra tsb.
// POST   { mitraId, note } -> tambah 1 catatan pelanggaran.
// DELETE ?violationId=... -> hapus 1 catatan (koreksi kalau salah catat).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, status: 403, error: "forbidden" };

  return { ok: true as const, adminId: user.id };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const mitraId = req.nextUrl.searchParams.get("mitraId");
  if (!mitraId) {
    return NextResponse.json({ error: "mitraId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("mitra_violations")
    .select("*")
    .eq("mitra_id", mitraId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ violations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { mitraId, note } = (await req.json()) as { mitraId?: string; note?: string };
  const trimmedNote = (note ?? "").trim();
  if (!mitraId) {
    return NextResponse.json({ error: "mitraId wajib diisi." }, { status: 400 });
  }
  if (!trimmedNote) {
    return NextResponse.json({ error: "Alasan/catatan pelanggaran wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { error: insertError } = await admin.from("mitra_violations").insert({
    mitra_id: mitraId,
    note: trimmedNote,
    created_by: auth.adminId,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // violation_count di profiles sudah ter-update lewat trigger database --
  // ambil ulang profil supaya UI admin langsung dapat angka terbaru.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", mitraId)
    .single();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const violationId = req.nextUrl.searchParams.get("violationId");
  if (!violationId) {
    return NextResponse.json({ error: "violationId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: violation, error: findError } = await admin
    .from("mitra_violations")
    .select("mitra_id")
    .eq("id", violationId)
    .single();
  if (findError || !violation) {
    return NextResponse.json({ error: "Catatan pelanggaran tidak ditemukan." }, { status: 404 });
  }

  const { error: deleteError } = await admin.from("mitra_violations").delete().eq("id", violationId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", violation.mitra_id)
    .single();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
