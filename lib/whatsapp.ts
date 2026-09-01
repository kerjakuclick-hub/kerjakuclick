// GANTI ISI lib/whatsapp.ts Anda dengan file ini.
//
// Perubahan: tambah normalizePhoneToWa() dan buildClientWaLink() untuk
// tombol "Kirim ID Mitra via WA" -- fungsi & tipe yang sudah ada TIDAK
// diubah sama sekali.

// Nomor WA Operator (pesanan & CS) — +62 811-4550-4178
export const OPERATOR_WA_NUMBER = "6281145504178";

export function buildCsLink(text: string = "Halo cs"): string {
  return `https://wa.me/${OPERATOR_WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export type OrderInput = {
  nama: string;
  noHp: string;
  alamat: string;
  jasa: string;
  tanggal: string;
  waktu: string;
  preferensi: string;
};

/**
 * Menghasilkan teks pesan sesuai format wajib parser (#BARU) di PRD.
 * Baris ini yang nantinya dipotong oleh fungsi Node.js berdasarkan
 * baris & tanda ":" lalu disimpan ke Supabase.
 */
export function buildOrderMessage({
  nama,
  noHp,
  alamat,
  jasa,
  tanggal,
  waktu,
  preferensi,
}: OrderInput): string {
  return [
    "#BARU",
    `Nama:${nama || "-"}`,
    `NoHP:${noHp || "-"}`,
    `Alamat:${alamat || "-"}`,
    `Jasa:${jasa || "-"}`,
    `Tanggal:${tanggal || "-"}`,
    `Waktu:${waktu || "-"}`,
    `Preferensi:${preferensi || "-"}`,
  ].join("\n");
}

export function buildWaLink(message: string, phone: string = OPERATOR_WA_NUMBER): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalisasi nomor HP lokal (mis. "0812xxxxxxx" hasil parsing #BARU dari
 * webhook Fonnte) ke format yang dipahami wa.me ("62812xxxxxxx").
 * Aman dipanggil berkali-kali -- nomor yang sudah "62..." dibiarkan apa
 * adanya.
 */
export function normalizePhoneToWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/** Bikin link wa.me ke NOMOR KLIEN (bukan operator), dengan teks siap kirim. */
export function buildClientWaLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhoneToWa(phone)}?text=${encodeURIComponent(message)}`;
}
