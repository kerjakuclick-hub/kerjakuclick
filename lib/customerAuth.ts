// lib/customerAuth.ts
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
//   4. Reset PIN: pelanggan chat "reset pin" ke CS WA -> webhook Fonnte
//      kirim OTP 6 digit ke nomor WA yang sama -> pelanggan masukkan OTP
//      + PIN baru di halaman web -> confirmPinReset() verifikasi & update.

import { randomBytes, randomInt, scryptSync, timingSafeEqual, createHash } from "crypto";
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

// ========================================================================
// Reset PIN via OTP WhatsApp
// ========================================================================

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_MINUTES = 2;

/** OTP 6 digit, format string dengan leading zero (mis. "004821"). */
function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Hash OTP pakai pola sama persis dengan hashPin (scrypt + salt acak per baris). */
function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(otp, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyOtp(otp: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(otp, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export type RequestPinResetResult =
  | { ok: true; otp: string; customerName: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "cooldown"; waitSeconds: number };

/**
 * Dipanggil dari webhook Fonnte saat pelanggan chat "reset pin"/"lupa sandi"/dst.
 * `phone` adalah nomor sender dari webhook (sudah format internasional).
 * Return `otp` di sini adalah OTP POLOS (plain) — HANYA dipakai sekali untuk
 * dikirim lewat WA, tidak pernah disimpan polos ke database.
 */
export async function requestPinReset(phone: string): Promise<RequestPinResetResult> {
  const admin = getSupabaseAdmin();
  const normalizedPhone = normalizeCustomerPhone(phone);

  const { data: customer } = await admin
    .from("customers")
    .select("id, name")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (!customer) {
    return { ok: false, reason: "not_found" };
  }

  const { data: lastReset } = await admin
    .from("customer_pin_resets")
    .select("created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastReset) {
    const elapsedMs = Date.now() - new Date(lastReset.created_at).getTime();
    const cooldownMs = OTP_RESEND_COOLDOWN_MINUTES * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      return { ok: false, reason: "cooldown", waitSeconds: Math.ceil((cooldownMs - elapsedMs) / 1000) };
    }
  }

  await admin
    .from("customer_pin_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("customer_id", customer.id)
    .is("used_at", null);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const { error } = await admin.from("customer_pin_resets").insert({
    customer_id: customer.id,
    otp_hash: hashOtp(otp),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);

  return { ok: true, otp, customerName: customer.name };
}

export type ConfirmPinResetResult =
  | { ok: true; customer: { id: string; name: string; phone: string } }
  | { ok: false; error: string };

/**
 * Dipanggil dari halaman web reset PIN (bukan dari WA) setelah pelanggan
 * memasukkan nomor WA + OTP yang diterima + PIN baru.
 */
export async function confirmPinReset(
  phone: string,
  otp: string,
  newPin: string
): Promise<ConfirmPinResetResult> {
  if (!isValidPin(newPin)) {
    return { ok: false, error: "PIN baru harus 4 angka." };
  }

  const normalizedPhone = normalizeCustomerPhone(phone);
  const admin = getSupabaseAdmin();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (!customer) {
    return { ok: false, error: "Nomor WA tidak ditemukan." };
  }

  const { data: resetRow } = await admin
    .from("customer_pin_resets")
    .select("id, otp_hash, expires_at, attempts_left")
    .eq("customer_id", customer.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!resetRow) {
    return { ok: false, error: "Tidak ada permintaan reset aktif. Kirim ulang 'reset pin' lewat WA." };
  }
  if (new Date(resetRow.expires_at) < new Date()) {
    return { ok: false, error: "Kode OTP sudah kedaluwarsa. Kirim ulang 'reset pin' lewat WA." };
  }
  if (resetRow.attempts_left <= 0) {
    return { ok: false, error: "Terlalu banyak percobaan salah. Kirim ulang 'reset pin' lewat WA." };
  }

  const valid = verifyOtp(otp, resetRow.otp_hash);
  if (!valid) {
    await admin
      .from("customer_pin_resets")
      .update({ attempts_left: resetRow.attempts_left - 1 })
      .eq("id", resetRow.id);
    return { ok: false, error: "Kode OTP salah." };
  }

  await admin
    .from("customers")
    .update({ pin_hash: hashPin(newPin), failed_attempts: 0, locked_until: null })
    .eq("id", customer.id);

  await admin
    .from("customer_pin_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("id", resetRow.id);

  await admin.from("customer_sessions").delete().eq("customer_id", customer.id);

  return { ok: true, customer };
}
