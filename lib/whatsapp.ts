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
