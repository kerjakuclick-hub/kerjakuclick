// GANTI ISI lib/services.ts Anda dengan file ini.
//
// Perubahan:
// 1. ServiceVariant dapat 2 field baru opsional: `desc` (deskripsi layanan)
//    & `detilPekerjaan` (daftar detil pekerjaan) -- opsional supaya varian
//    lain (Setrika, Cuci Kendaraan, Les Private) yang belum diisi tidak
//    perlu diubah dan tidak error di TypeScript.
// 2. Diisi untuk cleaning-fast & cleaning-pro sesuai "Detil Produk Layanan
//    Bersihkan Rumah" yang Anda kirim. Field internal (Pendapatan
//    Mitra/Komisi Platform) SENGAJA tidak dimasukkan ke sini karena file
//    ini konsumsinya publik (ditampilkan di modal detail jasa & dropdown
//    form pemesanan) -- kalau perlu didokumentasikan, itu disimpan
//    terpisah, bukan di kode.
// 3. Konfirmasi Anda: harga & durasi cleaning-fast/cleaning-pro DIUPDATE
//    mengikuti detil produk baru:
//    - Cleaning Fast: Rp45.000 -> Rp55.000 (durasi tetap 1.5 Jam)
//    - Cleaning PRO: Rp80.000 -> Rp95.000, durasi 2.5 Jam -> 3 Jam
//    Ini mengubah harga yang tercantum di landing page & pesan WA order
//    untuk kedua varian tsb.
// Tidak ada perubahan pada findServiceByLabel, formatRupiah, atau
// serviceCategories.

export type ServiceVariant = {
  id: string;
  category: string;
  name: string;
  price: number;
  unit: string;
  duration: string;
  tier: "Fast" | "PRO";
  desc?: string;
  detilPekerjaan?: string[];
};

const LES_PRIVATE_SUBJECTS = [
  { slug: "mengaji", label: "Mengaji" },
  { slug: "bahasa-inggris", label: "Bahasa Inggris" },
  { slug: "matematika", label: "Matematika" },
  { slug: "fisika", label: "Fisika" },
  { slug: "kimia", label: "Kimia" },
  { slug: "biologi", label: "Biologi" },
  { slug: "komputer", label: "Komputer" },
];

const lesPrivateVariants: ServiceVariant[] = LES_PRIVATE_SUBJECTS.flatMap(({ slug, label }) => [
  {
    id: `les-${slug}-fast`,
    category: "Les Private",
    name: `${label} — 1x Pertemuan`,
    price: 65000,
    unit: "1x Pertemuan",
    duration: "2 Jam",
    tier: "Fast" as const,
  },
  {
    id: `les-${slug}-pro`,
    category: "Les Private",
    name: `${label} — Paket 3x/Minggu`,
    price: 150000,
    unit: "3x Pertemuan / Minggu",
    duration: "2 Jam per sesi",
    tier: "PRO" as const,
  },
]);

export const services: ServiceVariant[] = [
  {
    id: "setrika-fast",
    category: "Setrika Pakaian",
    name: "Setrika Fast",
    price: 40000,
    unit: "20 Pcs / Paket",
    duration: "1 Jam",
    tier: "Fast",
  },
  {
    id: "setrika-pro",
    category: "Setrika Pakaian",
    name: "Setrika PRO",
    price: 75000,
    unit: "40 Pcs / Paket",
    duration: "2 Jam",
    tier: "PRO",
  },
  {
    id: "cleaning-fast",
    category: "Bersihkan Rumah",
    name: "Cleaning Fast",
    price: 55000,
    unit: "1 Rumah (Tipe 36/45)",
    duration: "1.5 Jam",
    tier: "Fast",
    desc: "Layanan pembersihan harian rumah/properti kecil yang dikerjakan dengan waktu singkat dan padat.",
    detilPekerjaan: [
      "Menyapu & mengepel seluruh ruangan",
      "Penataan ruang: kamar, toilet, ruang tamu (living room), dapur",
    ],
  },
  {
    id: "cleaning-pro",
    category: "Bersihkan Rumah",
    name: "Cleaning PRO",
    price: 95000,
    unit: "1 Rumah (Tipe 50/80)",
    duration: "3 Jam",
    tier: "PRO",
    desc: "Layanan pembersihan harian rumah/properti menengah yang dikerjakan lebih lengkap dan menyeluruh.",
    detilPekerjaan: [
      "Menyapu & mengepel seluruh ruangan",
      "Penataan ruang: kamar, toilet, ruang tamu, teras, dapur",
      "Mencuci alat makan & peralatan dapur",
    ],
  },
  {
    id: "cuci-motor",
    category: "Cuci Kendaraan",
    name: "Cuci Motor",
    price: 35000,
    unit: "1 Motor",
    duration: "1 Jam",
    tier: "Fast",
  },
  {
    id: "cuci-mobil",
    category: "Cuci Kendaraan",
    name: "Cuci Mobil",
    price: 75000,
    unit: "1 Mobil",
    duration: "2 Jam",
    tier: "PRO",
  },
  ...lesPrivateVariants,
];

export const serviceCategories = Array.from(
  new Set(services.map((s) => s.category))
);

/**
 * Mencocokkan teks bebas (misalnya dari pesan WhatsApp: "Cleaning Fast",
 * atau "cleaning-fast") ke salah satu varian layanan yang terdaftar.
 * Dipakai oleh webhook Fonnte untuk menentukan total_price.
 */
export function findServiceByLabel(label: string): ServiceVariant | undefined {
  const normalized = label.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return services.find(
    (s) =>
      s.id === normalized ||
      s.name.toLowerCase() === label.trim().toLowerCase() ||
      s.name.toLowerCase().replace(/\s+/g, "-") === normalized
  );
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
