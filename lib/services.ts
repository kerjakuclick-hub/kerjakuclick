// GANTI ISI lib/services.ts Anda dengan file ini.
//
// Perubahan: menambahkan 14 varian baru untuk kategori "Les Private" (7 mata
// pelajaran x 2 paket harga). Tidak ada perubahan pada type, fungsi
// findServiceByLabel, formatRupiah, atau serviceCategories — semuanya
// otomatis ikut mendukung Les Private karena beroperasi generik di atas
// array `services`.
//
// Skema tier: "Fast" dipakai untuk paket 1x pertemuan (Rp65.000), "PRO"
// untuk paket 3x/minggu (Rp150.000) — konsisten dengan makna tier di 3
// kategori rumah tangga yang sudah ada (Fast = sekali, PRO = lebih lengkap).

export type ServiceVariant = {
  id: string;
  category: string;
  name: string;
  price: number;
  unit: string;
  duration: string;
  tier: "Fast" | "PRO";
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
    price: 45000,
    unit: "1 Rumah / Properti",
    duration: "1.5 Jam",
    tier: "Fast",
  },
  {
    id: "cleaning-pro",
    category: "Bersihkan Rumah",
    name: "Cleaning PRO",
    price: 80000,
    unit: "1 Rumah / Properti",
    duration: "2.5 Jam",
    tier: "PRO",
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
