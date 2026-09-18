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
//
// Revisi (15 September 2026) -- pasca-rilis, beban kerja mitra
// (termasuk persiapan & transportasi) ternyata lebih besar dari estimasi
// durasi kerja yang tercantum:
//    - Cleaning PRO: harga TETAP Rp95.000, durasi kerja dikoreksi dari
//      3 Jam -> 2 Jam.
//    - Setrika PRO: harga dinaikkan Rp75.000 -> Rp80.000 (durasi & jumlah
//      pcs TIDAK berubah -- tetap 40 Pcs / 2 Jam).
//    Cleaning Fast, Setrika Fast, Cuci Kendaraan, & Les Private TIDAK
//    berubah.
//
// Revisi BARU (18 September 2026) -- update harga mengikuti Dokumen Bisnis
// Revisi & Strategi Pasca-Audit Fraud (September 2026), Bagian 5.1 "Koreksi
// Komponen Biaya", sudah dikonfirmasi Anda sebagai acuan resmi:
//    - Setrika Fast : Rp40.000 -> Rp55.000 (durasi/unit tidak berubah)
//    - Setrika PRO  : Rp80.000 -> Rp85.000 (durasi/unit tidak berubah)
//    - Cleaning Fast: Rp55.000 -> Rp65.000 (durasi/unit tidak berubah)
//    - Cleaning PRO : Rp95.000 -> Rp100.000 (durasi/unit tidak berubah)
//    Cuci Kendaraan & Les Private TIDAK berubah. Struktur fee platform yang
//    dipotong dari saldo deposit mitra saat order selesai TIDAK lagi flat
//    20% -- sudah jadi tier berjenjang (7-10%) sejak migrasi
//    024_tier_based_platform_fee.sql, lihat lib/types.ts (MitraTierInfo) &
//    fungsi mitra_fee_percent()/mitra_tier_info() di database.
// Tidak ada perubahan pada findServiceByLabel, formatRupiah, atau
// serviceCategories.
//
// Revisi BARU (18 September 2026) -- Cuci Kendaraan & Les Private masih
// dalam proses pembangunan tim mitra & operasional, jadi untuk sementara
// TIDAK ditampilkan sebagai pilihan di form pemesanan (ServiceSelect.tsx),
// walau kartunya tetap tampil di beranda sebagai "Coming Soon" (lihat
// components/ServicesGrid.tsx, comingSoon: true -- itu independen dari
// perubahan ini). Ditandai lewat field baru `orderable` (default true kalau
// tidak diisi) supaya datanya TETAP ada di sini (masih dipakai
// findServiceByLabel untuk parsing webhook & referensi harga di modal
// detail jasa), cuma tidak muncul di dropdown pemesanan. Begitu tim &
// operasional untuk 2 layanan ini siap, cukup hapus `orderable: false` di
// bawah -- tidak perlu ubah kode di tempat lain.

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
  /** false = disembunyikan dari dropdown form pemesanan (ServiceSelect.tsx)
   *  -- dipakai untuk layanan yang belum siap operasional. Default true
   *  kalau field ini tidak diisi. */
  orderable?: boolean;
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
    orderable: false, // BARU (18 Sep 2026) -- masih proses building tim & operasional
  },
  {
    id: `les-${slug}-pro`,
    category: "Les Private",
    name: `${label} — Paket 3x/Minggu`,
    price: 150000,
    unit: "3x Pertemuan / Minggu",
    duration: "2 Jam per sesi",
    tier: "PRO" as const,
    orderable: false, // BARU (18 Sep 2026) -- masih proses building tim & operasional
  },
]);

export const services: ServiceVariant[] = [
  {
    id: "setrika-fast",
    category: "Setrika Pakaian",
    name: "Setrika Fast",
    price: 55000,
    unit: "20 Pcs / Paket",
    duration: "1 Jam",
    tier: "Fast",
    desc: "Layanan setrika pakaian harian yang dikerjakan dengan waktu singkat dan padat.",
    detilPekerjaan: [
      "Setrika rapi hingga 20 Pcs pakaian (dewasa & anak)",
      "Pakaian disemprot pelembut & pewangi Kispray sebelum disetrika",
      "Pilihan finishing: dilipat rapi atau digantung (hanger)",
    ],
  },
  {
    id: "setrika-pro",
    category: "Setrika Pakaian",
    name: "Setrika PRO",
    price: 85000,
    unit: "40 Pcs / Paket",
    duration: "2 Jam",
    tier: "PRO",
    desc: "Layanan setrika pakaian lebih banyak yang dikerjakan lebih lengkap dan menyeluruh.",
    detilPekerjaan: [
      "Setrika rapi hingga 40 Pcs pakaian (dewasa & anak)",
      "Pakaian disemprot pelembut & pewangi Kispray sebelum disetrika",
      "Pilihan finishing: dilipat rapi atau digantung (hanger)",
    ],
  },
  {
    id: "cleaning-fast",
    category: "Bersihkan Rumah",
    name: "Cleaning Fast",
    price: 65000,
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
    price: 100000,
    unit: "1 Rumah (Tipe 50/80)",
    duration: "2 Jam",
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
    orderable: false, // BARU (18 Sep 2026) -- masih proses building tim & operasional
  },
  {
    id: "cuci-mobil",
    category: "Cuci Kendaraan",
    name: "Cuci Mobil",
    price: 75000,
    unit: "1 Mobil",
    duration: "2 Jam",
    tier: "PRO",
    orderable: false, // BARU (18 Sep 2026) -- masih proses building tim & operasional
  },
  ...lesPrivateVariants,
];

export const serviceCategories = Array.from(
  new Set(services.map((s) => s.category))
);

// BARU (18 September 2026): dipakai ServiceSelect.tsx (dropdown form
// pemesanan) supaya layanan yang belum siap operasional (orderable: false)
// tidak muncul sebagai pilihan -- `services`/`serviceCategories` di atas
// TETAP berisi semuanya (masih dipakai findServiceByLabel untuk parsing
// webhook & modal detail jasa di ServicesGridInteractive.tsx).
export const orderableServices = services.filter((s) => s.orderable !== false);
export const orderableServiceCategories = Array.from(
  new Set(orderableServices.map((s) => s.category))
);

/** Harga termurah pada satu kategori (dipakai kartu "Layanan Unggulan" di
 *  beranda, components/ServicesGrid.tsx, supaya angka "Mulai dari" selalu
 *  ikut harga terbaru di sini -- tidak lagi di-hardcode terpisah). */
export function cheapestPriceInCategory(category: string): number | null {
  const prices = services.filter((s) => s.category === category).map((s) => s.price);
  return prices.length > 0 ? Math.min(...prices) : null;
}

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

// ============================================================================
// Fitur "Tambah Waktu Kerja" (18 September 2026) -- diangkat langsung dari
// "DOK BISNIS SEPT 2026.pdf" (dokumen sebelum revisi pasca-audit fraud),
// bagian "Skema TAMBAH WAKTU KERJA" per produk. HANYA berlaku untuk 4 varian
// di bawah (Setrika Fast/PRO, Cleaning Fast/PRO) -- dokumen eksplisit
// menyebut "Tidak berlaku untuk paket pekerjaan lain di luar urusan
// pakaian & setrika / bersihkan rumah", jadi Cuci Kendaraan & Les Private
// SENGAJA tidak dimasukkan ke tabel ini.
//
// Aturan dari dokumen (diterapkan di app/api/customer/orders/[id]/extra-time/
// route.ts, BUKAN di sini -- file ini murni tabel tarif):
//   - Tambah waktu HANYA 30 menit atau 60 menit, dispensasi maksimal 1 jam
//     kerja per pesanan (tidak bisa ditambah berkali-kali).
//   - Kalau perlu lebih dari 1 jam, klien wajib repeat order baru dengan
//     request mitra yang sama -- BUKAN menambah waktu lagi di order yang sama.
//   - Diajukan KLIEN sendiri dari dashboard (bukan mitra) -- sesuai bagian
//     "SISTEM DIBUTUHKAN > DASHBOARD PELANGGAN" di dokumen: "Edit pesanan /
//     tombol tambah waktu pilihan 30 menit dan 60 menit".
//
// Angka di bawah adalah harga tambah waktu UTUH (bukan cuma upah mitra) --
// sudah termasuk komponen "Biaya Teknologi" sesuai rincian di dokumen, jadi
// bisa langsung ditambahkan ke total_price pesanan tanpa perhitungan lain.
export const EXTRA_TIME_RATES: Record<string, { 30: number; 60: number }> = {
  "setrika-fast": { 30: 20500, 60: 39500 },
  "setrika-pro": { 30: 31500, 60: 61000 },
  "cleaning-fast": { 30: 21250, 60: 40500 },
  "cleaning-pro": { 30: 31500, 60: 61000 },
};

export type ExtraTimeMinutes = 30 | 60;

/** Cari opsi tambah waktu (harga per 30/60 menit) untuk sebuah pesanan,
 *  berdasarkan `service_type` yang tersimpan di tabel orders (teks bebas,
 *  sama seperti yang dipakai findServiceByLabel). Balikan `null` kalau
 *  layanan ini TIDAK termasuk 4 varian yang didukung skema tambah waktu. */
export function getExtraTimeOptions(serviceType: string): { 30: number; 60: number } | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  return EXTRA_TIME_RATES[variant.id] ?? null;
}

// ============================================================================
// Fitur "Standar Kualitas Bahan Baku" (18 September 2026) -- ditugaskan
// Anda: demi transparansi & kontrol kualitas di seluruh ekosistem
// kerjaku.click (mitra dapat upah jelas, klien tahu persis apa yang dia
// dapat, platform tetap berkembang), mitra WAJIB memakai bahan baku cairan
// yang sudah diuji & distandarisasi kerjaku.click -- BUKAN sembarang merek.
// Standar yang dikonfirmasi Anda:
//   - Pelembut & pewangi pakaian (Setrika Fast/PRO)  -> Kispray
//   - Pembersih toilet (Cleaning Fast/PRO)           -> Vixal
//   - Cairan pel lantai (Cleaning Fast/PRO)          -> Super Pel
// Ini properti STATIS per jenis layanan (bukan kolom database per order --
// tidak ada migrasi baru yang diperlukan), jadi cukup didata di sini,
// persis seperti EXTRA_TIME_RATES di atas. Dipakai untuk menampilkan
// jaminan kualitas bahan baku di invoice konfirmasi & invoice pembayaran
// (lib/pdf/invoice-templates.tsx) serta pesan WA konfirmasi pesanan
// (buildOrderApprovedMessage, lib/whatsapp.ts).
export type ServiceMaterial = { label: string; merek: string };

export const SERVICE_MATERIALS: Record<string, ServiceMaterial[]> = {
  "setrika-fast": [{ label: "Pelembut & pewangi pakaian", merek: "Kispray" }],
  "setrika-pro": [{ label: "Pelembut & pewangi pakaian", merek: "Kispray" }],
  "cleaning-fast": [
    { label: "Pembersih toilet", merek: "Vixal" },
    { label: "Cairan pel lantai", merek: "Super Pel" },
  ],
  "cleaning-pro": [
    { label: "Pembersih toilet", merek: "Vixal" },
    { label: "Cairan pel lantai", merek: "Super Pel" },
  ],
};

/** Cari daftar bahan baku terstandar untuk sebuah pesanan, berdasarkan
 *  `service_type` yang tersimpan di tabel orders (sama seperti
 *  getExtraTimeOptions). Balikan `null` kalau layanan ini tidak termasuk
 *  4 varian yang punya standar bahan baku (mis. Cuci Kendaraan, Les
 *  Private -- tidak pakai cairan pembersih terstandar). */
export function getServiceMaterials(serviceType: string): ServiceMaterial[] | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  return SERVICE_MATERIALS[variant.id] ?? null;
}
