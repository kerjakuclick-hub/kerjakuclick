// lib/businessParams.ts -- HANYA untuk server (route handler, server
// component, layout). Memuat Parameter Bisnis dari database (migrasi 040),
// cache 60 detik, lalu menerapkannya ke lib/services.ts.
//
// Pola pakai di server:
//   await ensureBusinessParams();   // di awal route/page yang memakai katalog
//
// Kalau database belum siap (mis. migrasi 040 belum dijalankan) atau gagal
// dijangkau, dipakai DEFAULT_BUSINESS_PARAMS -- website tidak pernah kosong.

import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  applyBusinessParams,
  DEFAULT_BUSINESS_PARAMS,
  LOYALTY_TIERS,
  type BusinessParams,
  type FeeTierParam,
  type MitraLoyaltyTier,
  type ServiceCategory,
  type ServiceMaterial,
  type ServiceVariant,
} from "@/lib/services";

export const BUSINESS_PARAMS_TAG = "business-params";

/** Ambil langsung dari database (tanpa cache). Melempar error kalau gagal. */
export async function fetchBusinessParamsFresh(): Promise<BusinessParams> {
  const admin = getSupabaseAdmin();
  const [settingsRes, tiersRes, catsRes, prodsRes] = await Promise.all([
    admin.from("business_settings").select("*").eq("id", 1).maybeSingle(),
    admin.from("fee_tiers").select("*").order("sort_order"),
    admin.from("service_categories").select("*").order("sort_order"),
    admin.from("service_products").select("*").order("sort_order"),
  ]);
  const err = settingsRes.error || tiersRes.error || catsRes.error || prodsRes.error;
  if (err) throw new Error(`Gagal memuat Parameter Bisnis: ${err.message}`);
  if (!settingsRes.data || !tiersRes.data?.length || !catsRes.data?.length || !prodsRes.data?.length) {
    throw new Error("Parameter Bisnis belum terisi (migrasi 040 belum dijalankan?)");
  }

  const s = settingsRes.data;
  const feeTiers: FeeTierParam[] = tiersRes.data
    .filter((t) => (LOYALTY_TIERS as string[]).includes(t.tier))
    .map((t) => ({
      tier: t.tier as MitraLoyaltyTier,
      fastPct: Number(t.fast_pct),
      proPct: Number(t.pro_pct),
      minMonthlyJobs: Number(t.min_monthly_jobs),
      requireZeroViolations: Boolean(t.require_zero_violations),
      requireSosmed: Boolean(t.require_sosmed),
    }));

  const categories: ServiceCategory[] = catsRes.data.map((c) => ({
    id: c.id,
    name: c.name,
    buttonLabel: c.button_label,
    skillLabel: c.skill_label ?? null,
    isLesPrivate: Boolean(c.is_les_private),
    materialCostFast: Number(c.material_cost_fast),
    materialCostPro: Number(c.material_cost_pro),
    materials: Array.isArray(c.materials) ? (c.materials as ServiceMaterial[]) : [],
    active: Boolean(c.active),
    sortOrder: Number(c.sort_order),
  }));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const products: ServiceVariant[] = prodsRes.data.map((p) => ({
    id: p.id,
    category: catName.get(p.category_id) ?? p.category_id,
    categoryId: p.category_id,
    name: p.name,
    price: Number(p.price),
    unit: p.unit,
    duration: p.duration,
    tier: p.tier === "PRO" ? "PRO" : "Fast",
    desc: p.description ?? undefined,
    detilPekerjaan: p.detil_pekerjaan ?? undefined,
    subjectLabel: p.subject_label ?? null,
    subjectLevels: p.subject_levels ?? null,
    orderable: Boolean(p.orderable),
    sortOrder: Number(p.sort_order),
  }));

  const stamps = [s, ...tiersRes.data, ...catsRes.data, ...prodsRes.data]
    .map((r) => String(r.updated_at ?? ""))
    .sort();
  const version = `db:${stamps[stamps.length - 1]}:${products.length}:${categories.length}`;

  return {
    version,
    settings: {
      transportCost: Number(s.transport_cost),
      extraTimeUnitMinutes: Number(s.extra_time_unit_minutes) || 30,
      extraTimeOptions: (s.extra_time_options ?? [30, 60]).map(Number),
    },
    feeTiers: feeTiers.length === 4 ? feeTiers : DEFAULT_BUSINESS_PARAMS.feeTiers,
    categories,
    products,
  };
}

const getCachedParams = unstable_cache(fetchBusinessParamsFresh, ["business-params-v1"], {
  tags: [BUSINESS_PARAMS_TAG],
  revalidate: 60,
});

/** Muat Parameter Bisnis (cache 60 detik) & terapkan ke lib/services.ts.
 *  Tidak pernah melempar error -- fallback ke nilai default. */
export async function ensureBusinessParams(): Promise<BusinessParams> {
  let params: BusinessParams;
  try {
    params = await getCachedParams();
  } catch (err) {
    console.error("[businessParams] memakai nilai default:", err);
    params = DEFAULT_BUSINESS_PARAMS;
  }
  applyBusinessParams(params);
  return params;
}

/** Versi untuk halaman publik: angka internal (fee, transport, bahan baku)
 *  DIKOSONGKAN supaya tidak ikut terkirim ke browser pengunjung umum --
 *  rincian bagi hasil bersifat rahasia (lihat Q&A mitra). Dasbor mitra &
 *  admin menerima versi lengkap lewat layout masing-masing. */
export function toPublicBusinessParams(params: BusinessParams): BusinessParams {
  return {
    version: `pub:${params.version}`,
    settings: { ...params.settings, transportCost: 0 },
    feeTiers: params.feeTiers.map((t) => ({ ...t, fastPct: 0, proPct: 0, minMonthlyJobs: 0 })),
    categories: params.categories.map((c) => ({ ...c, materialCostFast: 0, materialCostPro: 0 })),
    products: params.products,
  };
}
