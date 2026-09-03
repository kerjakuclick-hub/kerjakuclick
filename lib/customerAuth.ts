// FILE BARU: lib/customerAuth.ts
//
// Helper otentikasi PELANGGAN (bukan admin/mitra -- itu tetap pakai
// Supabase Auth seperti biasa, tidak disentuh di sini). Sengaja TIDAK
// pakai npm package baru: hashing PIN & pembuatan token sesi cukup pakai
// modul bawaan Node `crypto`, jadi tidak perlu `npm install` apa pun.
//
// Model:
//   1. Pelanggan daftar dengan nama + no WA + PIN 4 digit. PIN di-hash
//      pakai scrypt+salt acak per akun (kolom `pin_hash` formatnya
//      "salt:hash", BUKAN plain text) di tabel `customers`.
//   2. Setelah daftar/masuk, token sesi ACAK (32 byte) dibuat. Yang
//      disimpan di tabel `customer_sessions` cuma HASH SHA-256-nya, token
//      ASLI-nya dikirim ke browser lewat cookie httpOnly. Jadi walau
//      tabel session bocor, isinya tidak bisa langsung dipakai untuk
//      login ulang.
//   3. PIN cuma 4 digit (10.000 kombinasi) -- gampang ditebak kalau tidak
//      dibatasi. Makanya ada lockout: 5x salah -> terkunci 15 menit.

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const SESSION_COOKIE_NAME = "kerjaku_customer_session";
const SESSION_TTL_DAYS = 30;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

/** Normalisasi nomor WA ke format "62xxxxxxxxxx" supaya unik & konsisten
 *  dipakai sebagai kunci lookup akun (terlepas pelanggan ketik "0812..."
 *  atau "62812..." atau "+62812..."). */
export function normalizeCustomerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Opsi cookie sesi -- `secure` cuma diaktifkan di production supaya
 *  cookie tetap kesimpan saat testing lokal lewat `npm run dev` (http,
 *  bukan https). */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function createCustomerSession(customerId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("customer_sessions").insert({
    customer_id: customerId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);
  return { token, expiresAt };
}

export type SessionCustomer = { id: string; name: string; phone: string };

export async function getCustomerFromToken(
  token: string | undefined
): Promise<SessionCustomer | null> {
  if (!token) return null;
  const admin = getSupabaseAdmin();

  const { data: session } = await admin
    .from("customer_sessions")
    .select("customer_id, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("id", session.customer_id)
    .maybeSingle();

  return customer ?? null;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const admin = getSupabaseAdmin();
  await admin.from("customer_sessions").delete().eq("token_hash", hashToken(token));
}
