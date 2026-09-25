// lib/services.ts -- KATALOG PRODUK & LOGIKA HITUNG BISNIS kerjaku.click
//
// REVISI BESAR (25 September 2026) -- "Parameter Bisnis" di Dasbor Admin:
// SEMUA angka acuan (harga jual final per produk, katalog produk & varian,
// kategori, fee platform per tier x label, syarat tier, transport, bahan
// baku, aturan tambah waktu) sekarang DISIMPAN DI DATABASE (migrasi 040)
// dan diisi Super Admin lewat halaman /admin/parameter -- TIDAK PERLU lagi
// mengubah kode ini untuk ganti angka.
//
// Cara kerjanya:
//   - File ini tetap menyediakan fungsi & daftar yang SAMA seperti sebelumnya
//     (services, findServiceByLabel, getPlatformFeePercent, getMaterialCost,
//     getExtraTimeBreakdown, dst), jadi halaman lain tidak perlu berubah cara
//     pakainya.
//   - Isinya diisi oleh applyBusinessParams(): di server lewat
//     ensureBusinessParams() (lib/businessParams.ts, cache 60 detik), di
//     browser lewat <BusinessParamsProvider> di app/layout.tsx.
//   - DEFAULT_BUSINESS_PARAMS di bawah = nilai resmi 25 Sep 2026 (sama
//     persis dengan seed migrasi 040). Dipakai sebagai cadangan kalau
//     database tidak bisa dijangkau, supaya website tidak pernah kosong.
//
// Riwayat angka sebelum 25 Sep 2026: lihat riwayat git & migrasi 024-039.

// ============================================================================
// TIPE
// ============================================================================

export type ServiceVariant = {
  id: string;
  /** Nama kategori (mis. "Setrika Pakaian") -- dipakai seluruh UI. */
  category: string;
  categoryId: string;
  /** Nama produk -- TERSIMPAN di orders.service_type, jadi tidak boleh
   *  diganti setelah produk dibuat (lihat halaman Parameter Bisnis). */
  name: string;
  price: number;
  unit: string;
  duration: string;
  tier: "Fast" | "PRO";
  desc?: string;
  detilPekerjaan?: string[];
  /** Khusus kategori Les Private: nama mata pelajaran & tingkat pendidikan. */
  subjectLabel?: string | null;
  subjectLevels?: string[] | null;
  /** false = disembunyikan dari formulir pemesanan. Default true. */
  orderable?: boolean;
  sortOrder?: number;
};

export type ServiceMaterial = { label: string; merek: string };

export type ServiceCategory = {
  id: string;
  /** Nama kategori, mis. "Setrika Pakaian". */
  name: string;
  /** Label tombol di formulir pemesanan, mis. "Setrika". */
  buttonLabel: string;
  /** Label keahlian mitra yang cocok (checkbox Kelola Mitra/pendaftaran).
   *  NULL untuk Les Private -- keahliannya per mata pelajaran. */
  skillLabel: string | null;
  isLesPrivate: boolean;
  materialCostFast: number;
  materialCostPro: number;
  /** Merek bahan standar (ditampilkan di invoice & WA konfirmasi). */
  materials: ServiceMaterial[];
  active: boolean;
  sortOrder: number;
};

export type MitraLoyaltyTier = "New" | "Reguler" | "Commit" | "Pro";

export const LOYALTY_TIERS: MitraLoyaltyTier[] = ["New", "Reguler", "Commit", "Pro"];

export type FeeTierParam = {
  tier: MitraLoyaltyTier;
  fastPct: number;
  proPct: number;
  /** Syarat naik tier: job selesai bulan kalender berjalan LEBIH DARI angka
   *  ini (tidak dipakai untuk New). */
  minMonthlyJobs: number;
  requireZeroViolations: boolean;
  requireSosmed: boolean;
};

export type BusinessSettings = {
  transportCost: number;
  /** Durasi 1 unit tambah waktu (menit) -- rumus dokumen berlaku per unit. */
  extraTimeUnitMinutes: number;
  /** Pilihan durasi tambah waktu (menit), kelipatan unit. */
  extraTimeOptions: number[];
};

export type BusinessParams = {
  /** Penanda versi (updated_at terakhir) -- dipakai supaya apply idempoten. */
  version: string;
  settings: BusinessSettings;
  feeTiers: FeeTierParam[];
  categories: ServiceCategory[];
  products: ServiceVariant[];
};

// ============================================================================
// NILAI DEFAULT (resmi 25 September 2026) -- sama dengan seed migrasi 040
// ============================================================================

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    id: "setrika",
    name: "Setrika Pakaian",
    buttonLabel: "Setrika",
    skillLabel: "Setrika",
    isLesPrivate: false,
    materialCostFast: 1250,
    materialCostPro: 2500,
    materials: [{ label: "Pelembut & pewangi pakaian", merek: "Kispray" }],
    active: true,
    sortOrder: 1,
  },
  {
    id: "bersihkan-rumah",
    name: "Bersihkan Rumah",
    buttonLabel: "Bersihkan Rumah",
    skillLabel: "Bersihkan Rumah",
    isLesPrivate: false,
    materialCostFast: 8000,
    materialCostPro: 16000,
    materials: [
      { label: "Pembersih toilet", merek: "Vixal" },
      { label: "Cairan pel lantai", merek: "Super Pel" },
    ],
    active: true,
    sortOrder: 2,
  },
  {
    id: "les-private",
    name: "Les Private",
    buttonLabel: "Les Private",
    skillLabel: null,
    isLesPrivate: true,
    materialCostFast: 0,
    materialCostPro: 0,
    materials: [],
    active: true,
    sortOrder: 3,
  },
];

const DEFAULT_LES_SUBJECTS: { slug: string; label: string; levels: string[] }[] = [
  { slug: "mengaji", label: "Mengaji", levels: ["TK", "SD", "SMP", "SMA"] },
  { slug: "bahasa-inggris", label: "Bahasa Inggris", levels: ["TK", "SD", "SMP", "SMA"] },
  { slug: "matematika", label: "Matematika", levels: ["SD", "SMP", "SMA"] },
  { slug: "fisika", label: "Fisika", levels: ["SMP", "SMA"] },
  { slug: "kimia", label: "Kimia", levels: ["SMP", "SMA"] },
  { slug: "biologi", label: "Biologi", levels: ["SMP", "SMA"] },
  { slug: "komputer", label: "Komputer", levels: ["SD", "SMP", "SMA"] },
  { slug: "membaca-anak", label: "Belajar Membaca Anak", levels: ["TK", "SD"] },
];

const DEFAULT_PRODUCTS: ServiceVariant[] = [
  {
    id: "setrika-fast",
    category: "Setrika Pakaian",
    categoryId: "setrika",
    name: "Setrika Fast",
    price: 60000,
    unit: "25 Pcs / Paket",
    duration: "1 Jam",
    tier: "Fast",
    desc: "Layanan setrika pakaian harian yang dikerjakan dengan waktu singkat dan padat.",
    detilPekerjaan: [
      "Setrika rapi hingga 25 Pcs pakaian (dewasa & anak)",
      "Pakaian disemprot pelembut & pewangi Kispray sebelum disetrika",
      "Pilihan finishing: dilipat rapi atau digantung (hanger)",
    ],
    sortOrder: 1,
  },
  {
    id: "setrika-pro",
    category: "Setrika Pakaian",
    categoryId: "setrika",
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
    sortOrder: 2,
  },
  {
    id: "cleaning-fast",
    category: "Bersihkan Rumah",
    categoryId: "bersihkan-rumah",
    name: "Cleaning Fast",
    price: 80000,
    unit: "1 Rumah (Tipe 36/40)",
    duration: "1.5 Jam",
    tier: "Fast",
    desc: "Layanan pembersihan harian rumah/properti kecil yang dikerjakan dengan waktu singkat dan padat.",
    detilPekerjaan: [
      "Menyapu & mengepel seluruh ruangan",
      "Penataan ruang: kamar, toilet, ruang tamu (living room), dapur",
    ],
    sortOrder: 3,
  },
  {
    id: "cleaning-pro",
    category: "Bersihkan Rumah",
    categoryId: "bersihkan-rumah",
    name: "Cleaning PRO",
    price: 125000,
    unit: "1 Rumah (Tipe 50/80)",
    duration: "2.5 Jam",
    tier: "PRO",
    desc: "Layanan pembersihan harian rumah/properti menengah yang dikerjakan lebih lengkap dan menyeluruh.",
    detilPekerjaan: [
      "Menyapu & mengepel seluruh ruangan",
      "Penataan ruang: kamar, toilet, ruang tamu, teras, dapur",
      "Mencuci alat makan & peralatan dapur",
    ],
    sortOrder: 4,
  },
  ...DEFAULT_LES_SUBJECTS.flatMap(({ slug, label, levels }, i) => [
    {
      id: `les-${slug}-fast`,
      category: "Les Private",
      categoryId: "les-private",
      name: `${label} Fast`,
      price: 65000,
      unit: "1x Pertemuan",
      duration: "1 Jam",
      tier: "Fast" as const,
      subjectLabel: label,
      subjectLevels: levels,
      sortOrder: 10 + i * 2,
    },
    {
      id: `les-${slug}-pro`,
      category: "Les Private",
      categoryId: "les-private",
      name: `${label} PRO`,
      price: 90000,
      unit: "1x Pertemuan",
      duration: "2 Jam",
      tier: "PRO" as const,
      subjectLabel: label,
      subjectLevels: levels,
      sortOrder: 11 + i * 2,
    },
  ]),
];

export const DEFAULT_BUSINESS_PARAMS: BusinessParams = {
  version: "default-2026-09-25",
  settings: {
    transportCost: 20000,
    extraTimeUnitMinutes: 30,
    extraTimeOptions: [30, 60],
  },
  feeTiers: [
    { tier: "New", fastPct: 0.11, proPct: 0.1, minMonthlyJobs: 0, requireZeroViolations: false, requireSosmed: false },
    { tier: "Reguler", fastPct: 0.1, proPct: 0.09, minMonthlyJobs: 30, requireZeroViolations: false, requireSosmed: false },
    { tier: "Commit", fastPct: 0.09, proPct: 0.08, minMonthlyJobs: 60, requireZeroViolations: true, requireSosmed: false },
    { tier: "Pro", fastPct: 0.08, proPct: 0.07, minMonthlyJobs: 90, requireZeroViolations: true, requireSosmed: true },
  ],
  categories: DEFAULT_CATEGORIES,
  products: DEFAULT_PRODUCTS,
};

// ============================================================================
// STATE AKTIF -- diisi applyBusinessParams(). Array/objek diekspor & diubah
// DI TEMPAT (bukan diganti), jadi semua file yang mengimpornya otomatis
// melihat nilai terbaru.
// ============================================================================

/** Semua produk (termasuk yang disembunyikan). */
export const services: ServiceVariant[] = [];
/** Produk yang bisa dipesan klien. */
export const orderableServices: ServiceVariant[] = [];
/** Nama kategori aktif (urut). */
export const serviceCategories: string[] = [];
/** Nama kategori yang punya produk bisa dipesan. */
export const orderableServiceCategories: string[] = [];
/** Data lengkap kategori aktif. */
export const serviceCategoryList: ServiceCategory[] = [];
/** Semua kategori (termasuk nonaktif) -- untuk halaman Parameter Bisnis. */
export const allServiceCategories: ServiceCategory[] = [];

export const PLATFORM_FEE_TIERS: Record<MitraLoyaltyTier, { fast: number; pro: number }> = {
  New: { fast: 0, pro: 0 },
  Reguler: { fast: 0, pro: 0 },
  Commit: { fast: 0, pro: 0 },
  Pro: { fast: 0, pro: 0 },
};
export const FEE_TIER_PARAMS: FeeTierParam[] = [];

export type ExtraTimeMinutes = number;
/** Pilihan durasi tambah waktu (menit), berlaku untuk Fast & PRO. */
export const EXTRA_TIME_OPTIONS: ExtraTimeMinutes[] = [];

export const EDUCATION_LEVELS = ["TK", "SD", "SMP", "SMA"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Mata pelajaran Les Private (diturunkan dari produk Les Private). */
export const LES_PRIVATE_SUBJECTS: { slug: string; label: string }[] = [];
/** Slug mata pelajaran per tingkat pendidikan (diturunkan dari produk). */
export const LES_PRIVATE_LEVEL_SUBJECT_SLUGS: Record<EducationLevel, string[]> = {
  TK: [],
  SD: [],
  SMP: [],
  SMA: [],
};

let transportCost = 0;
let extraTimeUnitMinutes = 30;
let activeVersion = "";

/** Slug sederhana dari teks (mis. "Bahasa Inggris" -> "bahasa-inggris"). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function replaceArray<T>(target: T[], items: T[]) {
  target.length = 0;
  target.push(...items);
}

/** Terapkan parameter bisnis ke seluruh state di atas. Idempoten (versi
 *  sama = tidak melakukan apa-apa). */
export function applyBusinessParams(params: BusinessParams): void {
  if (params.version && params.version === activeVersion) return;

  const cats = [...params.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  replaceArray(allServiceCategories, cats);
  const activeCats = cats.filter((c) => c.active);
  replaceArray(serviceCategoryList, activeCats);
  const activeCatIds = new Set(activeCats.map((c) => c.id));
  const catById = new Map(cats.map((c) => [c.id, c]));

  const products = params.products
    .map((p) => ({ ...p, category: catById.get(p.categoryId)?.name ?? p.category }))
    .sort((a, b) => {
      const ca = catById.get(a.categoryId)?.sortOrder ?? 999;
      const cb = catById.get(b.categoryId)?.sortOrder ?? 999;
      return ca - cb || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  replaceArray(services, products);
  const orderable = products.filter((p) => p.orderable !== false && activeCatIds.has(p.categoryId));
  replaceArray(orderableServices, orderable);
  replaceArray(serviceCategories, activeCats.map((c) => c.name));
  replaceArray(
    orderableServiceCategories,
    activeCats.filter((c) => orderable.some((p) => p.categoryId === c.id)).map((c) => c.name)
  );

  replaceArray(FEE_TIER_PARAMS, params.feeTiers);
  for (const t of LOYALTY_TIERS) {
    const row = params.feeTiers.find((f) => f.tier === t);
    if (row) PLATFORM_FEE_TIERS[t] = { fast: row.fastPct, pro: row.proPct };
  }

  transportCost = params.settings.transportCost;
  extraTimeUnitMinutes = params.settings.extraTimeUnitMinutes || 30;
  replaceArray(EXTRA_TIME_OPTIONS, [...params.settings.extraTimeOptions].sort((a, b) => a - b));

  // Mata pelajaran Les Private -- dari produk kategori Les Private yang bisa
  // dipesan, urut sesuai produk.
  const lesCatIds = new Set(activeCats.filter((c) => c.isLesPrivate).map((c) => c.id));
  const subjects: { slug: string; label: string; levels: Set<string> }[] = [];
  for (const p of orderable) {
    if (!lesCatIds.has(p.categoryId) || !p.subjectLabel) continue;
    let s = subjects.find((x) => x.label === p.subjectLabel);
    if (!s) {
      s = { slug: slugify(p.subjectLabel), label: p.subjectLabel, levels: new Set() };
      subjects.push(s);
    }
    for (const lvl of p.subjectLevels ?? []) s.levels.add(lvl);
  }
  replaceArray(
    LES_PRIVATE_SUBJECTS,
    subjects.map(({ slug, label }) => ({ slug, label }))
  );
  for (const lvl of EDUCATION_LEVELS) {
    LES_PRIVATE_LEVEL_SUBJECT_SLUGS[lvl] = subjects.filter((s) => s.levels.has(lvl)).map((s) => s.slug);
  }

  activeVersion = params.version;
}

/** Versi parameter yang sedang aktif (untuk diagnosa). */
export function getActiveParamsVersion(): string {
  return activeVersion;
}

// Isi awal dengan nilai default -- diganti nilai database begitu tersedia.
applyBusinessParams(DEFAULT_BUSINESS_PARAMS);

// ============================================================================
// LES PRIVATE -- tingkat pendidikan & mata pelajaran
// ============================================================================

/** Daftar mata pelajaran yang relevan untuk sebuah Tingkat Pendidikan Anak
 *  (formulir pemesanan, components/OrderForm.tsx). */
export function getLesPrivateSubjectsForLevel(level: EducationLevel): { slug: string; label: string }[] {
  const allowed = LES_PRIVATE_LEVEL_SUBJECT_SLUGS[level];
  return LES_PRIVATE_SUBJECTS.filter((s) => allowed.includes(s.slug));
}

/** Opsi "Keahlian mengajar untuk tingkat pendidikan" mitra Les Private
 *  (formulir pendaftaran & Kelola Mitra) -- ditambah "Umum". */
export const MITRA_TEACHING_LEVEL_OPTIONS = ["TK", "SD", "SMP", "SMA", "Umum"] as const;
export type MitraTeachingLevel = (typeof MITRA_TEACHING_LEVEL_OPTIONS)[number];

/** Apakah nama kategori ini kategori Les Private (wizard khusus). */
export function isLesPrivateCategory(categoryName: string): boolean {
  return allServiceCategories.some((c) => c.name === categoryName && c.isLesPrivate);
}

/** Kelompok checkbox keahlian mitra (Kelola Mitra & formulir pendaftaran):
 *  "Rumah Tangga" = label keahlian kategori non-Les, "Les Private" = mata
 *  pelajaran. Otomatis bertambah saat kategori/varian baru ditambahkan. */
export function getSkillGroups(): { label: string; options: string[] }[] {
  const household = serviceCategoryList
    .filter((c) => !c.isLesPrivate && c.skillLabel)
    .map((c) => c.skillLabel as string);
  const les = LES_PRIVATE_SUBJECTS.map((s) => s.label);
  const groups: { label: string; options: string[] }[] = [];
  if (household.length) groups.push({ label: "Rumah Tangga", options: household });
  if (les.length) groups.push({ label: "Les Private", options: les });
  return groups;
}

// ============================================================================
// KATALOG
// ============================================================================

/** Harga termurah (produk bisa dipesan) pada satu kategori -- kartu "Layanan
 *  Unggulan" di beranda. */
export function cheapestPriceInCategory(category: string): number | null {
  const prices = orderableServices.filter((s) => s.category === category).map((s) => s.price);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Cocokkan teks bebas (nama produk dari WA/order, atau id) ke varian. */
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

function categoryOf(variant: ServiceVariant): ServiceCategory | undefined {
  return allServiceCategories.find((c) => c.id === variant.categoryId || c.name === variant.category);
}

/** Merek bahan baku standar untuk sebuah pesanan (invoice & WA). */
export function getServiceMaterials(serviceType: string): ServiceMaterial[] | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  const mats = categoryOf(variant)?.materials ?? [];
  return mats.length > 0 ? mats : null;
}

// ============================================================================
// FEE PLATFORM, BIAYA MITRA, UPAH
// ============================================================================

/** Label Fast/PRO sebuah produk dari teks service_type. */
export function getProductTierLabel(serviceType: string): "Fast" | "PRO" {
  const variant = findServiceByLabel(serviceType);
  if (variant) return variant.tier;
  return /pro\b/i.test(serviceType.trim()) ? "PRO" : "Fast";
}

/** Persentase fee platform ESTIMASI (tier loyalty mitra x label produk).
 *  Potongan sebenarnya dihitung trigger database (mitra_fee_percent). */
export function getPlatformFeePercent(tierName: MitraLoyaltyTier, serviceType: string): number {
  const label = getProductTierLabel(serviceType);
  const row = PLATFORM_FEE_TIERS[tierName] ?? PLATFORM_FEE_TIERS.New;
  return label === "PRO" ? row.pro : row.fast;
}

/** Biaya transport flat (Rupiah) yang ditanggung mitra. */
export function getTransportCostValue(): number {
  return transportCost;
}

/** Biaya bahan baku (Rupiah) untuk sebuah pesanan. */
export function getMaterialCost(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return 0;
  const cat = categoryOf(variant);
  if (!cat) return 0;
  return variant.tier === "PRO" ? cat.materialCostPro : cat.materialCostFast;
}

/** Biaya transport (Rupiah) untuk sebuah pesanan -- 0 kalau tidak dikenal. */
export function getTransportCost(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  return variant ? transportCost : 0;
}

/** Upah bersih mitra ESTIMASI: Harga - (Fee + Bahan + Transport). */
export function getUpahMitraBersih(tierName: MitraLoyaltyTier, serviceType: string, totalPrice: number): number {
  const feePct = getPlatformFeePercent(tierName, serviceType);
  const feePlatform = Math.round(totalPrice * feePct);
  return totalPrice - (feePlatform + getMaterialCost(serviceType) + getTransportCost(serviceType));
}

// ============================================================================
// TAMBAH WAKTU -- per unit (default 30 menit):
//   HT_unit = ROUND((HJ - Fee) / 2) + Fee,  Fee = ROUND(HJ x Fee% tier)
//   Durasi = n unit -> harga & fee x n. Fee dipotong PENUH dari deposit mitra
//   (orders.extra_time_fee, migrasi 038).
// ============================================================================

export type ExtraTimeBreakdown = {
  minutes: ExtraTimeMinutes;
  /** Harga tambah waktu yang dibayar klien. */
  price: number;
  /** Fee platform di dalam harga itu (dipotong penuh dari deposit). */
  fee: number;
};

/** Durasi 1 unit tambah waktu (menit). */
export function getExtraTimeUnitMinutes(): number {
  return extraTimeUnitMinutes;
}

export function getExtraTimeBreakdown(
  tierName: MitraLoyaltyTier,
  serviceType: string,
  minutes: ExtraTimeMinutes
): ExtraTimeBreakdown | null {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return null;
  if (!EXTRA_TIME_OPTIONS.includes(minutes)) return null;
  if (minutes % extraTimeUnitMinutes !== 0) return null;

  const units = minutes / extraTimeUnitMinutes;
  const hargaJual = variant.price;
  const feePerUnit = Math.round(hargaJual * getPlatformFeePercent(tierName, serviceType));
  const bagianMitraPerUnit = Math.round((hargaJual - feePerUnit) / 2);
  return {
    minutes,
    price: (bagianMitraPerUnit + feePerUnit) * units,
    fee: feePerUnit * units,
  };
}

export function getExtraTimePrice(
  tierName: MitraLoyaltyTier,
  serviceType: string,
  minutes: ExtraTimeMinutes
): number | null {
  return getExtraTimeBreakdown(tierName, serviceType, minutes)?.price ?? null;
}

/** Fee platform total ESTIMASI untuk sebuah order (fee paket + fee tambah
 *  waktu tersimpan). Order lama (extraTimeFee = 0) memakai cara lama. */
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

// ============================================================================
// AMBANG SALDO MINIMUM = fee awal (tier New, label Fast) x harga produk Fast
// termurah yang bisa dipesan. Sama dengan mitra_wallet_threshold() di DB.
// ============================================================================

export function getWalletMinBalance(): number {
  const fastPrices = orderableServices.filter((s) => s.tier === "Fast").map((s) => s.price);
  if (fastPrices.length === 0) return 0;
  return Math.round(PLATFORM_FEE_TIERS.New.fast * Math.min(...fastPrices));
}

// ============================================================================
// DURASI & CAKUPAN KERJA (fitur Alarm Waktu Habis, migrasi 035)
// ============================================================================

/** "1 Jam" / "1.5 Jam" / "2,5 Jam" -> menit. Fallback 60. */
export function parseDurationMinutes(duration: string): number {
  const match = duration.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*jam/i);
  if (!match) return 60;
  return Math.round(parseFloat(match[1]) * 60);
}

export function getDurationMinutes(serviceType: string): number {
  const variant = findServiceByLabel(serviceType);
  return parseDurationMinutes(variant?.duration ?? "1 Jam");
}

/** Teks "Cakupan Area Kerja" siap tampil (WA & snapshot order). */
export function getWorkScopeText(serviceType: string): string {
  const variant = findServiceByLabel(serviceType);
  if (!variant) return "-";
  const lines = [`Cakupan: ${variant.unit}`, `Estimasi durasi: ${variant.duration}`];
  if (variant.detilPekerjaan && variant.detilPekerjaan.length > 0) {
    lines.push(...variant.detilPekerjaan.map((d) => `• ${d}`));
  }
  return lines.join("\n");
}

/** 90 -> "1 jam 30 menit". */
export function formatMinutesAsDurasi(minutes: number): string {
  const bulat = Math.max(0, Math.round(minutes));
  if (bulat === 0) return "0 menit";
  const jam = Math.floor(bulat / 60);
  const sisaMenit = bulat % 60;
  if (jam === 0) return `${sisaMenit} menit`;
  if (sisaMenit === 0) return `${jam} jam`;
  return `${jam} jam ${sisaMenit} menit`;
}
