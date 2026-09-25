// GANTI ISI lib/services.ts Anda dengan file ini.
//
// REVISI (25 September 2026) -- 3 KONFIRMASI Anda (lihat juga migrasi
// 038_fee_penuh_tambah_waktu_dan_ambang_saldo_13persen.sql):
//   1. Fee Platform dari tambah waktu dipotong PENUH (dipakai platform utk
//      biaya marketing/promosi) -- lihat getExtraTimeBreakdown() di bawah.
//   2. Tambah waktu Fast & PRO sama-sama bisa +30 ATAU +60 menit; 60 menit
//      = 2x harga 30 menit (fee ikut 2x). EXTRA_TIME_MINUTES_BY_LABEL
//      (durasi fixed per label) DIHAPUS, diganti EXTRA_TIME_OPTIONS.
//   3. Ambang saldo minimum = 13% (persentase awal, tidak ikut tier) x
//      Setrika Fast = Rp9.100, satu angka flat (sebelumnya 15% = Rp10.500).
//
// Revisi FINAL (22 September 2026) -- 3 dokumen final yang Anda kirim &
// konfirmasi sebagai acuan resmi TERBARU ("Logika Hitung Harga Jual Paket",
// "Logika Hitung Harga Tambah Waktu", "Program Loyalty Tier Mitra"),
// MENGGANTIKAN TOTAL skema fee tier & sebagian harga dari migrasi 030 (20
// September 2026, cuma berumur 2 hari):
//
//   1. HARGA JUAL (HJ) SEMUA produk NAIK:
//        Setrika Fast   : Rp55.000 -> Rp70.000
//        Setrika PRO    : Rp85.000 -> Rp100.000
//        Cleaning Fast  : Rp65.000 -> Rp90.000
//        Cleaning PRO   : Rp100.000 -> Rp135.000
//        Les Private Fast : Rp65.000 -> Rp75.000 (semua 7 mata pelajaran)
//        Les Private PRO  : Rp100.000 -> Rp115.000 (semua 7 mata pelajaran)
//   2. Transport PP (T): flat Rp10.000 -> flat Rp25.000, SEMUA produk (dari
//      dokumen "Logika Hitung Harga Jual Paket", kolom TRANSPORT PP sama
//      persis Rp25.000 di setiap baris tabel FAST maupun PRO).
//   3. Bahan Baku (B) Les Private: Rp2.500/Rp5.000 -> Rp0 (dokumen baru
//      mengosongkan kolom BAHAN utk Les Private -- Setrika & Cleaning TIDAK
//      berubah, tetap Rp1.250/2.500 & Rp8.000/16.000).
//   4. Fee Platform SEKARANG murni fungsi TIER LOYALTY MITRA (skema baru: 4
//      tier New/Reguler/Commit/Pro, berdasar JUMLAH JOB SELESAI BULAN
//      KALENDER BERJALAN + status aktif + 0 pelanggaran + aktif sosmed) x
//      LABEL Fast/PRO produk -- MENGGANTIKAN TOTAL skema tier lama
//      "Baru/Reguler/Terpercaya" (berdasar total order seumur hidup +
//      rating) dari migrasi 024/030. Syarat RATING DIHAPUS TOTAL
//      (DIKONFIRMASI 22 September 2026) -- rating TIDAK lagi jadi syarat
//      kenaikan tier apa pun (kolom profiles.rating TETAP ada di database,
//      cuma tidak lagi dipakai untuk fee tier). Lihat PLATFORM_FEE_TIERS &
//      MitraLoyaltyTier di bawah, dan migrasi
//      034_program_loyalty_tier_dan_harga_final.sql untuk definisi tier
//      lengkap (dihitung ulang otomatis tiap tanggal 1, DIKONFIRMASI).
//   5. Fitur "Tambah Waktu Kerja" (getExtraTimePrice()) DIHITUNG ULANG TOTAL
//      dengan rumus jauh lebih sederhana dari dokumen "Logika Hitung Harga
//      Tambah Waktu": HT = (HJ - Fee Platform) : 2 + Fee Platform (Bahan
//      Baku & Transport TIDAK ikut dihitung lagi utk tambah waktu). DURASI
//      SEKARANG FIXED per label (Fast = cuma bisa +30 menit, PRO = cuma
//      bisa +60 menit -- BUKAN LAGI bebas pilih 30 ATAU 60 utk semua
//      produk, dokumen cuma menunjukkan 1 opsi durasi per label). Fee
//      Platform di rumus ini DIKONFIRMASI ikut tier loyalty mitra yang
//      sedang mengerjakan order (bukan flat tier 1), lihat catatan lengkap
//      di getExtraTimePrice() di bawah.
//   6. MITRA_WALLET_MIN_BALANCE ikut disinkronkan ke harga Setrika Fast yang
//      baru (15% x Rp70.000 = Rp10.500) mengikuti KONVENSI SINKRONISASI yang
//      SUDAH ADA sejak migrasi 030 -- dokumen baru tidak menyebut ambang ini
//      secara eksplisit, jadi TOLONG DIKONFIRMASI kalau ternyata seharusnya
//      TETAP di Rp8.250. Kalau perlu diubah balik, cukup ganti angka di
//      bawah + public.mitra_wallet_threshold() di migrasi 034.
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
//     PLATFORM_FEE_TIERS/getPlatformFeePercent di bawah).
//   - BARU: getMaterialCost()/getTransportCost() -- biaya bahan baku &
//     transport dalam Rupiah (sebelumnya SERVICE_MATERIALS cuma menyimpan
//     nama merek, tanpa angka), dipakai untuk breakdown "Upah Mitra" di
//     Dashboard Mitra (components/mitra/TaskList.tsx).
//
// Perubahan (riwayat lama, ringkas -- selengkapnya lihat riwayat git):
// - 18 September 2026: Setrika/Cleaning harga naik (Bagian 5.1 Dokumen
//   Bisnis Revisi Pasca-Audit Fraud), fee platform berubah dari flat 20%
//   jadi tier berjenjang 7-10% (migrasi 024), lalu 2 dimensi tier x label
//   Fast/PRO (migrasi 030, 15/14/13% Fast & 13/12/11% PRO -- SEKARANG SUDAH
//   DIGANTI lagi oleh skema loyalty baru di atas).
// - Cuci Kendaraan & Les Private sempat disembunyikan (`orderable: false`)
//   sebelum akhirnya Les Private jadi orderable & Cuci Kendaraan dihapus
//   total (20 September 2026).
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
  /** false = disembunyikan dari dropdown form pemesanan (ServiceSelect.tsx)
   *  -- dipakai untuk layanan yang belum siap operasional. Default true
   *  kalau field ini tidak diisi. */
  orderable?: boolean;
};

// BARU (23 September 2026) -- Revisi Formulir Pesanan: mata pelajaran ke-8
// "Belajar Membaca Anak" ditambahkan (dokumen daftar mapel dari Anda). Harga
// & durasi ikut pola Les Private biasa (lihat lesPrivateVariants di bawah) --
// tidak ada tarif khusus, murni menambah 1 varian Fast & 1 varian PRO baru.
export const LES_PRIVATE_SUBJECTS = [
  { slug: "mengaji", label: "Mengaji" },
  { slug: "bahasa-inggris", label: "Bahasa Inggris" },
  { slug: "matematika", label: "Matematika" },
  { slug: "fisika", label: "Fisika" },
  { slug: "kimia", label: "Kimia" },
  { slug: "biologi", label: "Biologi" },
  { slug: "komputer", label: "Komputer" },
  { slug: "membaca-anak", label: "Belajar Membaca Anak" },
];

const lesPrivateVariants: ServiceVariant[] = LES_PRIVATE_SUBJECTS.flatMap(({ slug, label }) => [
  {
    id: `les-${slug}-fast`,
    category: "Les Private",
    // Nama HARUS diakhiri "Fast"/"PRO" persis seperti Setrika/Cleaning --
    // dipakai order_product_tier_label() di database utk deteksi label
    // Fast/PRO dari teks service_type.
    name: `${label} Fast`,
    price: 75000, // 22 Sep 2026: Rp65.000 -> Rp75.000 (dokumen "Logika Hitung Harga Jual Paket", final)
    unit: "1x Pertemuan",
    duration: "1 Jam",
    tier: "Fast" as const,
    // orderable dihapus (20 Sep 2026) -- sekarang jadi produk sungguhan.
  },
  {
    id: `les-${slug}-pro`,
    category: "Les Private",
    name: `${label} PRO`,
    price: 115000, // 22 Sep 2026: Rp100.000 -> Rp115.000 (dokumen final)
    unit: "1x Pertemuan",
    duration: "2 Jam",
    tier: "PRO" as const,
  },
]);

// ============================================================================
// BARU (23 September 2026) -- Revisi Formulir Pesanan: Les Private sekarang
// juga menanyakan "Tingkat Pendidikan Anak" SEBELUM mata pelajaran (form
// pemesanan: [Tutor Fast/PRO] -> Tingkat Pendidikan Anak -> Mata Pelajaran ->
// ...). Ini MURNI dipakai untuk (a) menyaring mata pelajaran yang masuk akal
// ditampilkan ke klien di formulir, dan (b) disimpan di order
// (`orders.les_private_level`, migrasi 037) sebagai informasi buat mitra --
// TIDAK mengubah harga sama sekali (harga tetap flat per label Fast/PRO,
// sama seperti sebelumnya).
//
// DIKONFIRMASI (23 September 2026, lewat pertanyaan klarifikasi):
//   1. Mata pelajaran DIBATASI sesuai tingkat yang dipilih (bukan bebas
//      pilih semua tingkat) -- lihat LES_PRIVATE_LEVEL_SUBJECT_SLUGS.
//   2. Ejaan disamakan jadi "SMA" (bukan "SMU") di formulir klien MAUPUN
//      pendaftaran mitra.
// Pemetaan tingkat -> mapel di bawah keputusan bisnis SAYA (bukan dari
// dokumen Anda, karena Anda tidak merinci mata pelajaran per tingkat) --
// TOLONG DIKONFIRMASI, gampang diubah kalau ada mapel yang perlu
// ditambah/dikurangi per tingkat.
export const EDUCATION_LEVELS = ["TK", "SD", "SMP", "SMA"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Slug mata pelajaran (lihat LES_PRIVATE_SUBJECTS) yang masuk akal
 *  ditampilkan untuk tiap Tingkat Pendidikan Anak. TK & SD tidak
 *  menampilkan Fisika/Kimia/Biologi (belum diajarkan di jenjang itu);
 *  "Belajar Membaca Anak" cuma relevan untuk TK & SD (anak yang belum/baru
 *  bisa membaca), jadi tidak ditampilkan untuk SMP/SMA. */
export const LES_PRIVATE_LEVEL_SUBJECT_SLUGS: Record<EducationLevel, string[]> = {
  TK: ["mengaji", "membaca-anak", "bahasa-inggris"],
  SD: ["mengaji", "membaca-anak", "bahasa-inggris", "matematika", "komputer"],
  SMP: ["mengaji", "bahasa-inggris", "matematika", "fisika", "kimia", "biologi", "komputer"],
  SMA: ["mengaji", "bahasa-inggris", "matematika", "fisika", "kimia", "biologi", "komputer"],
};

/** Daftar mata pelajaran (slug + label) yang relevan untuk sebuah Tingkat
 *  Pendidikan Anak -- dipakai formulir pemesanan (components/OrderForm.tsx)
 *  untuk menyusun tombol pilihan mata pelajaran SETELAH tingkat dipilih. */
export function getLesPrivateSubjectsForLevel(
  level: EducationLevel
): { slug: string; label: string }[] {
  const allowedSlugs = LES_PRIVATE_LEVEL_SUBJECT_SLUGS[level];
  return LES_PRIVATE_SUBJECTS.filter((s) => allowedSlugs.includes(s.slug));
}

/** Opsi "Keahlian mengajar untuk tingkat pendidikan" di formulir pendaftaran
 *  & Kelola Mitra (khusus mitra Les Private) -- BEDA dari EDUCATION_LEVELS
 *  di atas (yang dipilih KLIEN per pesanan): mitra boleh pilih lebih dari 1
 *  tingkat sekaligus, DITAMBAH opsi "Umum" (sanggup mengajar lintas tingkat/
 *  mapel yang tidak terikat jenjang tertentu, mis. Komputer) yang tidak ada
 *  di pilihan klien. Murni informasi buat admin saat menugaskan mitra --
 *  TIDAK membatasi/memfilter dropdown "Pilih mitra eligible" (DIKONFIRMASI
 *  23 September 2026). */
export const MITRA_TEACHING_LEVEL_OPTIONS = ["TK", "SD", "SMP", "SMA", "Umum"] as const;
export type MitraTeachingLevel = (typeof MITRA_TEACHING_LEVEL_OPTIONS)[number];

export const services: ServiceVariant[] = [
  {
    id: "setrika-fast",
    category: "Setrika Pakaian",
    name: "Setrika Fast",
    price: 70000, // 22 Sep 2026: Rp55.000 -> Rp70.000 (dokumen "Logika Hitung Harga Jual Paket", final)
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
    price: 100000, // 22 Sep 2026: Rp85.000 -> Rp100.000 (dokumen final)
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
    price: 90000, // 22 Sep 2026: Rp65.000 -> Rp90.000 (dokumen final)
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
    price: 135000, // 22 Sep 2026: Rp100.000 -> Rp135.000 (dokumen final)
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
// tidak ada migrasi baru yang diperlukan), jadi cukup didata di sini.
// Dipakai untuk menampilkan jaminan kualitas bahan baku di invoice
// konfirmasi & invoice pembayaran (lib/pdf/invoice-templates.tsx) serta
// pesan WA konfirmasi pesanan (buildOrderApprovedMessage, lib/whatsapp.ts).
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
// Skema Fee Platform FINAL (22 September 2026) -- dokumen "Program Loyalty
// Tier Mitra" yang Anda konfirmasi sebagai acuan resmi TERBARU, MENGGANTIKAN
// TOTAL skema tier "Baru/Reguler/Terpercaya" (berdasar total order seumur
// hidup + rating, migrasi 024/030) yang baru berumur 2 hari.
//
// 4 tier loyalty BARU, ditentukan dari JUMLAH JOB SELESAI BULAN KALENDER
// BERJALAN (reset & dievaluasi ulang otomatis tiap tanggal 1, DIKONFIRMASI)
// + status mitra + 0 pelanggaran + aktif sosmed -- BUKAN LAGI dari total
// order seumur hidup ataupun rating (rating DIHAPUS TOTAL dari syarat tier):
//
//   Tier     | Syarat                                          | Fee Fast | Fee PRO
//   ---------|--------------------------------------------------|----------|--------
//   New      | status TRAINING (default mitra baru)             | 13%      | 10%
//   Reguler  | status AKTIF, >30 job selesai bulan ini           | 12%      | 9%
//   Commit   | status AKTIF, >60 job selesai bulan ini,          | 11%      | 8%
//            | 0 pelanggaran                                     |          |
//   Pro      | status AKTIF, >90 job selesai bulan ini,          | 10%      | 7%
//            | 0 pelanggaran, AKTIF SOSMED                       |          |
//
// "status AKTIF/TRAINING" pakai KOLOM `profiles.status` yang SUDAH ADA
// ('training'/'ahli', dari schema awal) -- 'training' = tier New, 'ahli' =
// syarat dasar utk naik ke Reguler/Commit/Pro (lihat migrasi
// 034_program_loyalty_tier_dan_harga_final.sql: public.mitra_loyalty_tier()
// utk definisi cascading lengkap, IDENTIK gaya penulisan dgn
// mitra_fee_percent() migrasi 024/030). `violation_count` (migrasi 024) &
// kolom BARU `sosmed_active` (migrasi 034) DIISI MANUAL oleh admin lewat
// halaman Kelola Mitra -- persis pola "Trust & Safety" yang sudah ada.
//
// SATU sumber kebenaran di sisi TS untuk ESTIMASI tampilan client-side
// (Dasbor Mitra, dropdown "Pilih mitra eligible" admin) -- potongan
// SEBENARNYA yang dipotong dari saldo deposit mitra tetap dihitung
// server-side oleh trigger di database (public.mitra_fee_percent(uuid,
// text)), HARUS disinkron manual kalau salah satu berubah.
export type MitraLoyaltyTier = "New" | "Reguler" | "Commit" | "Pro";

export const PLATFORM_FEE_TIERS: Record<MitraLoyaltyTier, { fast: number; pro: number }> = {
  New: { fast: 0.13, pro: 0.1 },
  Reguler: { fast: 0.12, pro: 0.09 },
  Commit: { fast: 0.11, pro: 0.08 },
  Pro: { fast: 0.1, pro: 0.07 },
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

/** Persentase fee platform ESTIMASI untuk kombinasi tier loyalty mitra x
 *  label produk tertentu. Dipakai di client (Dasbor Mitra, dropdown admin)
 *  -- angka yang BENAR-BENAR dipotong selalu dihitung ulang server-side. */
export function getPlatformFeePercent(tierName: MitraLoyaltyTier, serviceType: string): number {
  const label = getProductTierLabel(serviceType);
  const row = PLATFORM_FEE_TIERS[tierName] ?? PLATFORM_FEE_TIERS.New;
  return label === "PRO" ? row.pro : row.fast;
}

// ----------------------------------------------------------------------------
// Biaya Bahan Baku & Transport (Rupiah) -- BARU (20 September 2026), angka
// DIPERBARUI (22 September 2026) mengikuti dokumen final "Logika Hitung
// Harga Jual Paket". Berbeda dari SERVICE_MATERIALS di atas (yang cuma
// menyimpan nama MEREK bahan baku untuk jaminan kualitas ke klien), ini
// angka RUPIAH biaya bahan baku & transport yang mitra keluarkan sendiri di
// lapangan -- dipakai untuk menghitung "Upah Bersih Mitra" (Harga Jual -
// (Fee Platform + Bahan Baku + Transport)) yang ditampilkan transparan di
// Dasbor Mitra. TIDAK memotong saldo deposit mitra (yang dipotong wallet
// HANYA Fee Platform) -- ini murni biaya operasional mitra sendiri dari
// uang tunai yang diterima dari klien.
export const TRANSPORT_COST = 25000; // 22 Sep 2026: Rp10.000 -> Rp25.000 flat, SEMUA produk (dokumen final)

const MATERIAL_COST_BY_CATEGORY_TIER: Record<string, { Fast: number; PRO: number }> = {
  "Setrika Pakaian": { Fast: 1250, PRO: 2500 },
  "Bersihkan Rumah": { Fast: 5000 + 3000, PRO: 10000 + 6000 }, // toilet + lantai
  // 22 Sep 2026: Les Private Rp2.500/Rp5.000 -> Rp0 -- dokumen final
  // "Logika Hitung Harga Jual Paket" mengosongkan kolom BAHAN utk Les
  // Private (beda dari Setrika/Cleaning yang tetap ada bahan bakunya).
  "Les Private": { Fast: 0, PRO: 0 },
};

/** Biaya bahan baku (Rupiah) untuk sebuah pesanan. Balikan 0 kalau kategori
 *  produknya tidak dikenal (aman, tidak seharusnya terjadi untuk produk
 *  orderable saat ini) ATAU kalau kategorinya memang Rp0 (Les Private,
 *  sejak 22 September 2026). */
export function getMaterialCost(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return 0;
  const row = MATERIAL_COST_BY_CATEGORY_TIER[variant.category];
  if (!row) return 0;
  return variant.tier === "PRO" ? row.PRO : row.Fast;
}

/** Biaya transport (Rupiah) untuk sebuah pesanan -- flat Rp25.000 untuk
 *  semua produk yang dikenal, 0 kalau service_type tidak dikenal. */
export function getTransportCost(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  return variant ? TRANSPORT_COST : 0;
}

/** Upah bersih mitra ESTIMASI untuk sebuah pesanan & tier loyalty tertentu:
 *  Harga Jual - (Fee Platform + Bahan Baku + Transport). Estimasi client-side
 *  murni untuk transparansi Dasbor Mitra -- fee platform SEBENARNYA yang
 *  memotong saldo deposit dihitung server-side (database). */
export function getUpahMitraBersih(tierName: MitraLoyaltyTier, serviceType: string, totalPrice: number): number {
  const feePct = getPlatformFeePercent(tierName, serviceType);
  const feePlatform = Math.round(totalPrice * feePct);
  const bahanBaku = getMaterialCost(serviceType);
  const transport = getTransportCost(serviceType);
  return totalPrice - (feePlatform + bahanBaku + transport);
}

// ============================================================================
// [RIWAYAT -- durasi fixed per label & cara potong fee di catatan ini sudah
// DIGANTI 25 September 2026, lihat blok REVISI tepat di bawahnya.]
// Fitur "Tambah Waktu Kerja" -- rumus FINAL (22 September 2026), dokumen
// "Logika Hitung Harga Tambah Waktu" yang Anda konfirmasi sebagai acuan
// resmi TERBARU, MENGGANTIKAN TOTAL rumus 2-komponen (Fee Tambah Waktu % +
// Komponen Upah Mitra) dari migrasi 030 (20 September 2026, cuma berumur 2
// hari). Rumus baru jauh lebih sederhana -- 1 komponen saja:
//
//   Harga Tambah Waktu (HT) = (Harga Jual - Fee Platform) : 2 + Fee Platform
//
// dengan "Fee Platform" = persentase tier loyalty mitra YANG SEDANG
// MENGERJAKAN order ini x label Fast/PRO produk (PERSIS getPlatformFeePercent()
// di atas -- DIKONFIRMASI 22 September 2026: mitra tier lebih tinggi dapat
// harga Tambah Waktu yang lebih rendah juga, bukan flat tier 1 seperti
// contoh di dokumen). Bahan Baku & Transport TIDAK ikut dihitung sama
// sekali di sini (beda dari harga jual paket biasa).
//
// PERUBAHAN PENTING: durasi tambah waktu SEKARANG FIXED per label produk,
// BUKAN LAGI bebas pilih 30 ATAU 60 menit utk semua produk seperti
// sebelumnya -- dokumen final cuma menunjukkan SATU opsi durasi per label:
//   Label Fast : HANYA bisa tambah +30 menit
//   Label PRO  : HANYA bisa tambah +60 menit
// (rumus HT di atas tidak punya faktor pengali "menit" sama sekali -- angka
// HT yang dihasilkan MEMANG mewakili paket tambahan waktu yang fixed itu,
// bukan tarif per-menit yang bisa dikalikan bebas). TOLONG DIKONFIRMASI
// kalau ternyata maksud dokumen bukan begini -- kalau salah, cukup ubah
// EXTRA_TIME_MINUTES_BY_LABEL di bawah + UI-nya (ExtraTimeButton.tsx).
//
// Contoh dari dokumen (Setrika Fast, tier New/tier-1, +30 menit):
//   Fee Platform = 13% x Rp70.000                     = Rp9.100
//   HT = (Rp70.000 - Rp9.100) : 2 + Rp9.100
//      = Rp60.900 : 2 + Rp9.100 = Rp30.450 + Rp9.100   = Rp39.550 ✓ (cocok dokumen)
// ============================================================================

// ----------------------------------------------------------------------------
// REVISI (25 September 2026, konfirmasi Anda) -- MENGGANTIKAN durasi fixed
// per label di atas:
//   - Fast & PRO sama-sama bisa tambah +30 ATAU +60 menit.
//   - Rumus dokumen = harga per 30 menit:
//       HT_30 = ROUND((HJ - Fee) / 2) + Fee,   Fee = ROUND(HJ x Fee% tier)
//     60 menit = 2 x HT_30 (Fee ikut 2x).
//   - Fee di dalam HT dipotong PENUH dari saldo deposit mitra saat order
//     selesai (disimpan di orders.extra_time_fee, migrasi 038).
// Contoh Setrika Fast, tier New: Fee Rp9.100 -> +30 menit Rp39.550 (fee
// Rp9.100), +60 menit Rp79.100 (fee Rp18.200).
// ----------------------------------------------------------------------------

/** Pilihan durasi tambah waktu -- berlaku untuk label Fast maupun PRO. */
export const EXTRA_TIME_OPTIONS: ExtraTimeMinutes[] = [30, 60];

export type ExtraTimeBreakdown = {
  minutes: ExtraTimeMinutes;
  /** Harga tambah waktu yang dibayar klien (ditambahkan ke total_price). */
  price: number;
  /** Fee Platform di dalam harga itu -- dipotong penuh dari deposit mitra. */
  fee: number;
};

/** Rincian harga & fee tambah waktu utk sebuah pesanan, berdasarkan
 *  `service_type` & TIER LOYALTY MITRA yang mengerjakannya. Balikan `null`
 *  kalau layanan tidak dikenali atau durasi bukan 30/60. */
export function getExtraTimeBreakdown(
  tierName: MitraLoyaltyTier,
  serviceType: string,
  minutes: ExtraTimeMinutes
): ExtraTimeBreakdown | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  if (!EXTRA_TIME_OPTIONS.includes(minutes)) return null;

  const units = minutes / 30; // 30 menit = 1 unit, 60 menit = 2 unit
  const hargaJual = variant.price;
  const feePer30 = Math.round(hargaJual * getPlatformFeePercent(tierName, serviceType));
  const bagianMitraPer30 = Math.round((hargaJual - feePer30) / 2);
  return {
    minutes,
    price: (bagianMitraPer30 + feePer30) * units,
    fee: feePer30 * units,
  };
}

/** Harga tambah waktu saja (Rupiah) -- pembungkus getExtraTimeBreakdown()
 *  supaya pemanggil lama tetap jalan. */
export function getExtraTimePrice(
  tierName: MitraLoyaltyTier,
  serviceType: string,
  minutes: ExtraTimeMinutes
): number | null {
  return getExtraTimeBreakdown(tierName, serviceType, minutes)?.price ?? null;
}

/** Fee Platform total yang AKAN dipotong dari deposit mitra utk sebuah
 *  order (estimasi tampilan -- angka sebenarnya dihitung trigger database
 *  dengan rumus yang sama): fee paket utama (tier saat ini) + fee tambah
 *  waktu yang sudah tersimpan di order. Order lama (tambah waktu sebelum
 *  migrasi 038, extraTimeFee = 0) memakai cara lama: Fee% x total. */
export function estimateOrderPlatformFee(
  tierName: MitraLoyaltyTier,
  serviceType: string,
  totalPrice: number,
  extraTimePrice: number,
  extraTimeFee: number
): number {
  const pct = getPlatformFeePercent(tierName, serviceType);
  if (extraTimePrice > 0 && extraTimeFee === 0) {
    return Math.round(totalPrice * pct);
  }
  return Math.round((totalPrice - extraTimePrice) * pct) + extraTimeFee;
}

// ----------------------------------------------------------------------------
// Ambang Saldo Minimum Mitra -- REVISI (25 September 2026, konfirmasi Anda):
// "minimal potongan produk terkecil berlabel Fast, persentase awal (tidak
// berdasarkan tier)". Persentase awal = fee tier New label Fast (13%),
// produk Fast terkecil = Setrika Fast (Rp70.000) -> Rp9.100, SATU angka flat
// utk semua jenis order. Sebelumnya 15% = Rp10.500.
// HARUS sinkron dengan public.mitra_wallet_threshold() (migrasi 038).
export const WALLET_THRESHOLD_BASE_PERCENT = PLATFORM_FEE_TIERS.New.fast; // 13%

export const MITRA_WALLET_MIN_BALANCE = Math.round(
  WALLET_THRESHOLD_BASE_PERCENT *
    Math.min(...services.filter((s) => s.tier === "Fast").map((s) => s.price))
); // = Rp9.100

// ============================================================================
// BARU (22 September 2026) -- fitur "Alarm Waktu Habis" (migrasi 035), diangkat
// dari temuan audit lapangan: hampir seluruh klien mengabaikan durasi & cakupan
// kerja yang disepakati, dan mitra segan menegur klien secara langsung --
// menyebabkan kerja lembur tanpa tambahan bayaran. Solusinya 3 bagian:
//   1. WA "pesanan disetujui" (buildOrderApprovedMessage, lib/whatsapp.ts)
//      SEKARANG mencantumkan durasi & cakupan kerja secara eksplisit, supaya
//      batasannya sudah disampaikan SISTEM sejak awal -- bukan mitra yang
//      harus "menegur" klien di lapangan.
//   2. Dasbor Mitra menghitung mundur otomatis dari `working_started_at`
//      (diisi migrasi 035 saat mitra klik "Mulai Kerjakan") + durasi/tambah
//      waktu, dan menampilkan alarm + tombol "Ingatkan Klien" begitu waktu
//      habis (components/mitra/TaskList.tsx).
//   3. pg_cron (Supabase) mengecek tiap 5 menit lewat
//      app/api/cron/time-up-check/route.ts, kirim WA otomatis ke klien kalau
//      mitra belum sempat klik tombol pengingat manual.
// Dua fungsi di bawah ini MURNI helper tampilan/perhitungan waktu (tidak ada
// perhitungan uang) -- dipakai oleh lib/whatsapp.ts, TaskList.tsx, dan kedua
// API route "time-up" di atas supaya format & cara hitungnya konsisten di
// semua tempat.

/** Ubah teks durasi bebas dari katalog (mis. "1 Jam", "1.5 Jam", "2,5 Jam")
 *  jadi jumlah menit. Balikan 60 (fallback aman, kira-kira durasi Fast
 *  tersingkat) kalau formatnya tidak dikenali -- seharusnya tidak pernah
 *  terjadi untuk produk yang terdaftar di `services` di atas. */
export function parseDurationMinutes(duration: string): number {
  const match = duration.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*jam/i);
  if (!match) return 60;
  return Math.round(parseFloat(match[1]) * 60);
}

/** Estimasi durasi (menit) sebuah pesanan, dari `service_type` yang
 *  tersimpan di tabel orders. Dipakai untuk MENGISI snapshot
 *  `orders.duration_minutes` saat mitra klik "Mulai Kerjakan" (migrasi 035) --
 *  DIKUNCI di kolom itu supaya tidak ikut berubah kalau durasi produk di
 *  katalog ini berubah belakangan (order yang sudah berjalan tetap pakai
 *  acuan durasi saat itu). */
export function getDurationMinutes(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  return parseDurationMinutes(variant?.duration ?? "1 Jam");
}

/** Teks "Cakupan Area Kerja" siap-tampil untuk sebuah pesanan -- unit paket +
 *  estimasi durasi + rincian pekerjaan (kalau ada). Dipakai di 3 tempat:
 *  WA "pesanan disetujui" (klien tahu batasannya sejak awal), snapshot
 *  `orders.work_scope_snapshot` yang dikunci saat "Mulai Kerjakan" (migrasi
 *  035, supaya mitra & klien punya acuan identik yang tidak berubah walau
 *  katalog berubah), dan WA "waktu habis" (mengingatkan cakupan yang
 *  disepakati). Balikan "-" kalau service_type tidak dikenali (seharusnya
 *  tidak pernah terjadi untuk produk yang terdaftar). */
export function getWorkScopeText(serviceType: string): string {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return "-";
  const lines = [`Cakupan: ${variant.unit}`, `Estimasi durasi: ${variant.duration}`];
  if (variant.detilPekerjaan && variant.detilPekerjaan.length > 0) {
    lines.push(...variant.detilPekerjaan.map((d) => `• ${d}`));
  }
  return lines.join("\n");
}

/** Format jumlah menit jadi teks Indonesia ringkas ("90 menit" -> "1 jam 30
 *  menit"). Dipakai untuk menampilkan sisa waktu/keterlambatan di Dasbor
 *  Mitra & WA "waktu habis" -- angka menit mentah kurang enak dibaca kalau
 *  sudah lebih dari 1 jam. */
export function formatMinutesAsDurasi(minutes: number): string {
  const bulat = Math.max(0, Math.round(minutes));
  if (bulat === 0) return "0 menit";
  const jam = Math.floor(bulat / 60);
  const sisaMenit = bulat % 60;
  if (jam === 0) return `${sisaMenit} menit`;
  if (sisaMenit === 0) return `${jam} jam`;
  return `${jam} jam ${sisaMenit} menit`;
}
