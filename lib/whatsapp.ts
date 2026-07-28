// Nomor WA Operator — dari identitas perusahaan di PRD (+62 882-4518-5778)
export const OPERATOR_WA_NUMBER = "6288245185778";

export type OrderInput = {
  nama: string;
  noHp: string;
  alamat: string;
  jasa: string;
};

/**
 * Menghasilkan teks pesan sesuai format wajib parser (#BARU) di PRD.
 * Baris ini yang nantinya dipotong oleh fungsi Node.js berdasarkan
 * baris & tanda ":" lalu disimpan ke Supabase.
 */
export function buildOrderMessage({ nama, noHp, alamat, jasa }: OrderInput): string {
  return [
    "#BARU",
    `Nama:${nama || "-"}`,
    `NoHP:${noHp || "-"}`,
    `Alamat:${alamat || "-"}`,
    `Jasa:${jasa || "-"}`,
  ].join("\n");
}

export function buildWaLink(message: string, phone: string = OPERATOR_WA_NUMBER): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
