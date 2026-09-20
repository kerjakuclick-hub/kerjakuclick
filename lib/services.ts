// GANTI ISI lib/services.ts Anda dengan file ini.
//
// Revisi BESAR (20 September 2026) -- "UPDATE WEBSITE KERJAKU.CLICK" (dokumen
// struktur versi baru yang Anda kirim), Tahap 1/Backend:
//   - Cleaning PRO: durasi 2 Jam -> 2,5 Jam (harga TETAP Rp100.000), unit
//     diperjelas "+ Cuci piring" sesuai dokumen (detilPekerjaan sudah
//     menyebutnya, tidak berubah).
//   - Les Private: SEKARANG orderable (`orderable: false` dihapus), harga
//     disederhanakan jadi FLAT per tier (bukan lagi per-mata-pelajaran+beda
//     skema paket): Fast Rp65.000/1 Jam per sesi, PRO Rp100.000/2 Jam per
//     sesi, sama untuk ke-7 mata pelajaran. Nama varian diubah jadi
//     "<Mata Pelajaran> Fast"/"<Mata Pelajaran> PRO" (bukan lagi "-- 1x
//     Pertemuan"/"-- Paket 3x/Minggu") supaya konsisten dengan pola
//     penamaan Setrika/Cleaning (dibutuhkan fungsi SQL
//     order_product_tier_label() di migrasi 030 yang mendeteksi Fast/PRO
//     dari NAMA produk).
//   - Cuci Kendaraan (Cuci Motor, Cuci Mobil): DIHAPUS TOTAL dari sistem --
//     tidak lagi termasuk salah satu dari "3 Pilar Layanan" versi baru
//     (Setrika, Bersihkan Rumah, Les Private). Bukan cuma disembunyikan
//     (`orderable: false`) seperti sebelumnya.
//   - TECH_FEE_RATES/getServiceTechFee() (migrasi 028) DIHAPUS -- skema
//     "Biaya Teknologi flat" digantikan total oleh skema fee tier baru yang
//     sudah termasuk komponen tersebut secara implisit (lihat
//     PLATFORM_FEE_TIERS/getPlatformFeePercent di bawah + migrasi 030).
//   - BARU: getMaterialCost()/getTransportCost() -- biaya bahan baku &
//     transport dalam Rupiah (sebelumnya SERVICE_MATERIALS cuma menyimpan
//     nama merek, tanpa angka), dipakai untuk breakdown "Upah Mitra" di
//     Dashboard Mitra (components/mitra/TaskList.tsx).
//   - BARU: PLATFORM_FEE_TIERS/getPlatformFeePercent() -- skema fee platform
//     BARU, berbeda per tier mitra DAN per label Fast/PRO produk (bukan lagi
//     satu angka per mitra seperti migrasi 024). SATU sumber kebenaran di
//     sisi TS untuk ESTIMASI tampilan client-side -- potongan SEBENARNYA
//     tetap dihitung server-side oleh migrasi 030 (SQL), harus disinkron
//     manual kalau salah satu berubah.
//   - BARU: MITRA_WALLET_MIN_BALANCE -- ambang saldo minimum FLAT (15% x
//     harga Setrika Fast) yang menggantikan pengecekan dinamis per-order
//     lama (migrasi 024/028) sebagai syarat mitra tampil eligible ditugaskan.
//
// Perubahan (riwayat lama):
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
    // Nama HARUS diakhiri "Fast"/"PRO" persis seperti Setrika/Cleaning --
    // dipakai order_product_tier_label() di migrasi 030 utk deteksi label
    // Fast/PRO dari teks service_type.
    name: `${label} Fast`,
    price: 65000,
    unit: "1x Pertemuan",
    duration: "1 Jam",
    tier: "Fast" as const,
    // orderable dihapus (20 Sep 2026) -- sekarang jadi produk sungguhan.
  },
  {
    id: `les-${slug}-pro`,
    category: "Les Private",
    name: `${label} PRO`,
    price: 100000,
    unit: "1x Pertemuan",
    duration: "2 Jam",
    tier: "PRO" as const,
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
    unit: "1 Rumah (Tipe 36/40)",
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
    duration: "2.5 Jam", // 20 Sep 2026: 2 Jam -> 2,5 Jam sesuai dokumen struktur baru
    tier: "PRO",
    desc: "Layanan pembersihan harian rumah/properti menengah yang dikerjakan lebih lengkap dan menyeluruh.",
    detilPekerjaan: [
      "Menyapu & mengepel seluruh ruangan",
      "Penataan ruang: kamar, toilet, ruang tamu, teras, dapur",
      "Mencuci alat makan & peralatan dapur",
    ],
  },
  // Cuci Kendaraan (Cuci Motor, Cuci Mobil) DIHAPUS TOTAL (20 Sep 2026) --
  // tidak lagi bagian dari "3 Pilar Layanan" versi baru. Kalau nanti mau
  // diaktifkan lagi, ini bukan tinggal un-comment: perlu masuk lagi ke
  // "3 Pilar" + card beranda (components/ServicesGrid.tsx) + biaya bahan
  // baku/transport (getMaterialCost/getTransportCost di bawah).
  ...lesPrivateVariants,
];

export const serviceCategories = Array.from(
  new Set(services.map((s) => s.category))
);

// Dipakai ServiceSelect.tsx (dropdown form pemesanan) supaya layanan yang
// belum siap operasional (orderable: false) tidak muncul sebagai pilihan --
// `services`/`serviceCategories` di atas TETAP berisi semuanya (masih dipakai
// findServiceByLabel untuk parsing webhook & modal detail jasa di
// ServicesGridInteractive.tsx). Sejak 20 September 2026, TIDAK ada lagi
// varian dengan `orderable: false` (Les Private sudah orderable, Cuci
// Kendaraan sudah dihapus total) -- filter ini dipertahankan supaya
// mekanismenya siap kalau suatu saat ada produk baru yang perlu
// disembunyikan sementara lagi.
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

export type ExtraTimeMinutes = 30 | 60;

// (Fitur "Tambah Waktu Kerja" -- rumus & tabel rate lengkap DIPINDAH ke
// bawah `getUpahMitraBersih()`, karena formula baru 20 September 2026
// butuh fungsi itu. Lihat `getExtraTimePrice()` di bawah.)

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
 *  findServiceByLabel). Balikan `null` kalau layanan ini tidak termasuk
 *  4 varian yang punya standar bahan baku bermerek (Les Private tidak
 *  pakai cairan pembersih terstandar -- Cuci Kendaraan sudah dihapus
 *  total dari sistem). */
export function getServiceMaterials(serviceType: string): ServiceMaterial[] | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  return SERVICE_MATERIALS[variant.id] ?? null;
}

// ============================================================================
// Skema Fee Platform BARU (20 September 2026) -- "UPDATE WEBSITE
// KERJAKU.CLICK", menggantikan TOTAL skema tier lama (migrasi 024, 7/8/10%
// flat per mitra) & Biaya Teknologi flat (migrasi 028, Rp2.000/5.000) yang
// SEKARANG DIHAPUS -- keduanya digantikan satu skema baru yang persentasenya
// berbeda per TIER MITRA **dan** per LABEL Fast/PRO produk sekaligus:
//
//   Tier mitra   | Fee produk Fast | Fee produk PRO
//   -------------|------------------|------------------
//   Baru         | 15%              | 13%
//   Reguler      | 14%              | 12%
//   Terpercaya   | 13%              | 11%
//
// Syarat tier (SAMA seperti migrasi 024, tier "Unggulan" DIHAPUS -- dokumen
// baru cuma menyebut 3 tier):
//   Baru       : 0-30 order selesai
//   Reguler    : >30 order selesai, rating >= 4.5
//   Terpercaya : >100 order selesai, rating >= 4.7 (ASUMSI: syarat "0
//                pelanggaran" dari migrasi 024 tetap dipakai di sini walau
//                dokumen baru tidak menyebutnya eksplisit -- TOLONG
//                DIKONFIRMASI, lihat migrasi 030 untuk catatan yang sama).
//
// SATU sumber kebenaran di sisi TS untuk ESTIMASI tampilan client-side
// (Dasbor Mitra, dropdown "Pilih mitra eligible" admin) -- potongan
// SEBENARNYA yang dipotong dari saldo deposit mitra tetap dihitung
// server-side oleh trigger di migrasi 030 (public.mitra_fee_percent(uuid,
// text)), HARUS disinkron manual kalau salah satu berubah.
export type MitraTierName = "Baru" | "Reguler" | "Terpercaya";

export const PLATFORM_FEE_TIERS: Record<MitraTierName, { fast: number; pro: number }> = {
  Baru: { fast: 0.15, pro: 0.13 },
  Reguler: { fast: 0.14, pro: 0.12 },
  Terpercaya: { fast: 0.13, pro: 0.11 },
};

/** Label Fast/PRO sebuah produk dari teks `service_type`/nama produk --
 *  SEMUA produk saat ini (Setrika, Cleaning, Les Private) namanya diakhiri
 *  "Fast" atau "PRO" persis, jadi cukup dicek dari `tier` field kalau match
 *  di `services`, atau fallback tebak dari teks kalau tidak ketemu (mis.
 *  teks bebas dari webhook yang penulisannya sedikit beda). */
export function getProductTierLabel(serviceType: string): "Fast" | "PRO" {
  const variant = findServiceByLabel(serviceType);
  if (variant) return variant.tier;
  return /pro\b/i.test(serviceType.trim()) ? "PRO" : "Fast";
}

/** Persentase fee platform ESTIMASI untuk kombinasi tier mitra x label
 *  produk tertentu. Dipakai di client (Dasbor Mitra, dropdown admin) --
 *  angka yang BENAR-BENAR dipotong selalu dihitung ulang server-side. */
export function getPlatformFeePercent(tierName: MitraTierName, serviceType: string): number {
  const label = getProductTierLabel(serviceType);
  const row = PLATFORM_FEE_TIERS[tierName] ?? PLATFORM_FEE_TIERS.Baru;
  return label === "PRO" ? row.pro : row.fast;
}

// ----------------------------------------------------------------------------
// Biaya Bahan Baku & Transport (Rupiah) -- BARU (20 September 2026). Berbeda
// dari SERVICE_MATERIALS di atas (yang cuma menyimpan nama MEREK bahan baku
// untuk jaminan kualitas ke klien), ini angka RUPIAH biaya bahan baku &
// transport yang mitra keluarkan sendiri di lapangan -- dipakai untuk
// menghitung "Upah Bersih Mitra" (Harga Jual - (Fee Platform + Bahan Baku +
// Transport)) yang ditampilkan transparan di Dasbor Mitra. TIDAK memotong
// saldo deposit mitra (yang dipotong wallet HANYA Fee Platform) -- ini murni
// biaya operasional mitra sendiri dari uang tunai yang diterima dari klien.
export const TRANSPORT_COST = 10000; // flat, SEMUA produk

const MATERIAL_COST_BY_CATEGORY_TIER: Record<string, { Fast: number; PRO: number }> = {
  "Setrika Pakaian": { Fast: 1250, PRO: 2500 },
  "Bersihkan Rumah": { Fast: 5000 + 3000, PRO: 10000 + 6000 }, // toilet + lantai
  "Les Private": { Fast: 2500, PRO: 5000 },
};

/** Biaya bahan baku (Rupiah) untuk sebuah pesanan. Balikan 0 kalau kategori
 *  produknya tidak dikenal (aman, tidak seharusnya terjadi untuk produk
 *  orderable saat ini). */
export function getMaterialCost(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return 0;
  const row = MATERIAL_COST_BY_CATEGORY_TIER[variant.category];
  if (!row) return 0;
  return variant.tier === "PRO" ? row.PRO : row.Fast;
}

/** Biaya transport (Rupiah) untuk sebuah pesanan -- flat Rp10.000 untuk
 *  semua produk yang dikenal, 0 kalau service_type tidak dikenal. */
export function getTransportCost(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  return variant ? TRANSPORT_COST : 0;
}

/** Upah bersih mitra ESTIMASI untuk sebuah pesanan & tier mitra tertentu:
 *  Harga Jual - (Fee Platform + Bahan Baku + Transport). Estimasi client-side
 *  murni untuk transparansi Dasbor Mitra -- fee platform SEBENARNYA yang
 *  memotong saldo deposit dihitung server-side (migrasi 030). */
export function getUpahMitraBersih(tierName: MitraTierName, serviceType: string, totalPrice: number): number {
  const feePct = getPlatformFeePercent(tierName, serviceType);
  const feePlatform = Math.round(totalPrice * feePct);
  const bahanBaku = getMaterialCost(serviceType);
  const transport = getTransportCost(serviceType);
  return totalPrice - (feePlatform + bahanBaku + transport);
}

// ============================================================================
// Fitur "Tambah Waktu Kerja" -- formula BARU (20 September 2026), dokumen
// "UPDATE WEBSITE KERJAKU.CLICK" bagian "Logika Hitung Biaya Tambah Waktu",
// MENGGANTIKAN TOTAL tabel rate flat `EXTRA_TIME_RATES` lama (skema "Biaya
// Teknologi" era migrasi 028, sudah dihapus dari sistem). Rumus baru punya
// 2 komponen:
//
//   Tambah Waktu = (Fee Platform Tambah Waktu % x Harga Jual) +
//                  Komponen Biaya Upah Mitra
//
// - "Fee Platform Tambah Waktu %" FLAT per LABEL produk & durasi (SAMA utk
//   semua tier mitra -- fee ini beda dari fee platform tier normal di atas):
//     Label Fast : 30 menit = 3%,   60 menit = 6%
//     Label PRO  : 30 menit = 4%,   60 menit = 8%
// - "Komponen Biaya Upah Mitra" = upah bersih mitra dari 1x harga jual dasar
//   produk ybs -- PERSIS rumus getUpahMitraBersih() di atas (jadi ini yang
//   TERGANTUNG TIER MITRA yang sedang mengerjakan order, lewat fee platform
//   tier normalnya 15/14/13% atau 13/12/11%).
//
// Contoh dari dokumen (Setrika Fast, tier Baru, tambah 30 menit):
//   Fee Platform Tambah Waktu = 3% x Rp55.000                     = Rp1.650
//   Komponen Biaya Upah Mitra = Rp55.000 - (Rp8.250 + Rp1.250 + Rp10.000)
//                             = Rp35.500
//   Total Tambah Waktu        = Rp1.650 + Rp35.500                = Rp37.150
//
// ASUMSI (TOLONG DIKONFIRMASI kalau salah): dokumen menjelaskan rumus ini
// generik per LABEL (Fast/PRO), bukan per kategori produk tertentu -- beda
// dari skema lama yang cuma berlaku utk 4 varian (Setrika/Cleaning
// Fast/PRO). Di sini rumus SEKARANG dibuat berlaku utk SEMUA produk
// orderable berlabel Fast/PRO, TERMASUK Les Private (karena Les Private
// sekarang juga berlabel Fast/PRO & sudah punya Bahan Baku sendiri, lihat
// MATERIAL_COST_BY_CATEGORY_TIER di atas). Kalau ternyata Tambah Waktu
// dimaksud TETAP cuma utk Setrika & Cleaning, tinggal beri tahu saya --
// tinggal tambah pengecualian kategori satu baris di getExtraTimePrice().
// ============================================================================

export const EXTRA_TIME_FEE_PERCENT: Record<"Fast" | "PRO", Record<ExtraTimeMinutes, number>> = {
  Fast: { 30: 0.03, 60: 0.06 },
  PRO: { 30: 0.04, 60: 0.08 },
};

/** Hitung total biaya "Tambah Waktu Kerja" (Rupiah, langsung ditambahkan ke
 *  total_price pesanan) untuk sebuah pesanan, berdasarkan `service_type`
 *  order ybs & TIER MITRA yang sedang mengerjakannya (lihat catatan rumus
 *  di atas -- tier mitra ikut menentukan "Komponen Biaya Upah Mitra").
 *  Balikan `null` kalau service_type tidak dikenali (mis. layanan yang
 *  sudah dihapus dari sistem). */
export function getExtraTimePrice(
  tierName: MitraTierName,
  serviceType: string,
  minutes: ExtraTimeMinutes
): number | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  const hargaJual = variant.price;
  const feeTambahWaktu = Math.round(hargaJual * EXTRA_TIME_FEE_PERCENT[variant.tier][minutes]);
  const upahMitra = getUpahMitraBersih(tierName, serviceType, hargaJual);
  return feeTambahWaktu + upahMitra;
}

// ----------------------------------------------------------------------------
// Ambang Saldo Minimum Mitra (BARU, 20 September 2026) -- "SISTEM DOMPET
// MITRA: AMBANG BATAS 15% dari produk berlabel FAST" dari dokumen struktur
// baru. Dibaca sebagai saldo minimum FLAT yang mitra harus jaga supaya tetap
// tampil eligible ditugaskan order APAPUN -- MENGGANTIKAN pengecekan dinamis
// per-order (saldo >= fee order spesifik itu) dari migrasi 024/028. Referensi
// "produk berlabel FAST" dipakai = Setrika Fast (produk FAST termurah &
// paling umum). HARUS disinkron manual dengan public.mitra_wallet_threshold()
// di migrasi 030 kalau berubah.
export const MITRA_WALLET_MIN_BALANCE = Math.round(
  0.15 * (services.find((s) => s.id === "setrika-fast")?.price ?? 55000)
); // = Rp8.250
