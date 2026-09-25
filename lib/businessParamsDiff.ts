// lib/businessParamsDiff.ts -- FILE BARU (25 September 2026).
// Validasi + hitung perubahan Parameter Bisnis (halaman /admin/parameter,
// khusus Super Admin). Fungsi MURNI (tanpa database) supaya bisa dites:
//   validateAndDiff(current, proposed) -> { errors } | { changes, history }
//
// Aturan penting:
//   - Harga yang diisi = HARGA JUAL FINAL (dihitung di luar sistem).
//   - Nama produk, kategori produk & label Fast/PRO TIDAK bisa diganti
//     setelah dibuat (nama tersimpan di orders.service_type & dipakai
//     riwayat/invoice). Produk/kategori tidak dihapus -- cukup
//     dinonaktifkan ("Bisa dipesan" / "Aktif" dimatikan).
//   - Nama kategori & jenis (Les Private atau bukan) juga tetap.

import {
  EDUCATION_LEVELS,
  LOYALTY_TIERS,
  slugify,
  type BusinessParams,
  type FeeTierParam,
  type ServiceCategory,
  type ServiceVariant,
} from "@/lib/services";

export type HistoryRow = {
  entity: "settings" | "fee_tier" | "category" | "product";
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
};

export type DiffResult =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      settings: BusinessParams["settings"] | null;
      feeTiers: FeeTierParam[];
      categories: { row: ServiceCategory; isNew: boolean }[];
      products: { row: ServiceVariant; isNew: boolean }[];
      history: HistoryRow[];
    };

const MAX_PRICE = 50_000_000;

const isInt = (n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
/** Angka dari input; kosong/null = NaN (ditolak validasi, bukan jadi 0). */
const n = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown) =>
  Array.isArray(v) ? v.map((x) => str(x)).filter((x) => x.length > 0) : [];
const show = (v: unknown): string | null =>
  v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : String(v);
const norm = (v: unknown) =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0) ? null : v;
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;

function uniqueId(base: string, taken: Set<string>): string {
  let id = base || "item";
  let i = 2;
  while (taken.has(id)) id = `${base}-${i++}`;
  taken.add(id);
  return id;
}

export function validateAndDiff(current: BusinessParams, proposed: unknown): DiffResult {
  const errors: string[] = [];
  const history: HistoryRow[] = [];
  const p = (proposed ?? {}) as Partial<BusinessParams>;

  // ------------------------------------------------------------ settings
  let settingsOut: BusinessParams["settings"] | null = null;
  const s = (p.settings ?? {}) as Partial<BusinessParams["settings"]>;
  const transport = n(s.transportCost);
  const unit = n(s.extraTimeUnitMinutes);
  const options = Array.isArray(s.extraTimeOptions)
    ? Array.from(new Set(s.extraTimeOptions.map(Number))).sort((a, b) => a - b)
    : [];
  if (!isInt(transport, 0, 1_000_000)) errors.push("Biaya transport harus angka bulat Rp0–Rp1.000.000.");
  if (!isInt(unit, 5, 240)) errors.push("Durasi 1 unit tambah waktu harus 5–240 menit.");
  if (options.length === 0) errors.push("Pilihan tambah waktu minimal 1.");
  for (const o of options) {
    if (!isInt(o, 1, 480) || (isInt(unit, 5, 240) && o % unit !== 0)) {
      errors.push(`Pilihan tambah waktu ${o} menit harus kelipatan ${unit} menit (maks. 480).`);
    }
  }
  const newSettings = { transportCost: transport, extraTimeUnitMinutes: unit, extraTimeOptions: options };
  const cs = current.settings;
  const settingFields: [keyof typeof newSettings, string][] = [
    ["transportCost", "transport_cost"],
    ["extraTimeUnitMinutes", "extra_time_unit_minutes"],
    ["extraTimeOptions", "extra_time_options"],
  ];
  for (const [k, field] of settingFields) {
    if (!same(cs[k], newSettings[k])) {
      history.push({ entity: "settings", entity_id: "1", field, old_value: show(cs[k]), new_value: show(newSettings[k]) });
      settingsOut = newSettings;
    }
  }

  // ------------------------------------------------------------ fee tiers
  const tiersOut: FeeTierParam[] = [];
  const tiersIn = Array.isArray(p.feeTiers) ? p.feeTiers : [];
  const byTier = new Map(tiersIn.map((t) => [t?.tier, t]));
  let prevJobs = -1;
  for (const tierName of LOYALTY_TIERS) {
    const t = byTier.get(tierName) as FeeTierParam | undefined;
    const cur = current.feeTiers.find((x) => x.tier === tierName)!;
    if (!t) {
      errors.push(`Data tier ${tierName} tidak lengkap.`);
      continue;
    }
    const next: FeeTierParam = {
      tier: tierName,
      fastPct: Math.round(n(t.fastPct) * 10000) / 10000,
      proPct: Math.round(n(t.proPct) * 10000) / 10000,
      minMonthlyJobs: tierName === "New" ? 0 : n(t.minMonthlyJobs),
      requireZeroViolations: tierName === "New" ? false : Boolean(t.requireZeroViolations),
      requireSosmed: tierName === "New" ? false : Boolean(t.requireSosmed),
    };
    for (const k of ["fastPct", "proPct"] as const) {
      if (!(next[k] >= 0 && next[k] <= 0.5)) errors.push(`Fee ${tierName} ${k === "fastPct" ? "Fast" : "PRO"} harus 0–50%.`);
    }
    if (!isInt(next.minMonthlyJobs, 0, 1000)) errors.push(`Syarat job/bulan tier ${tierName} harus angka bulat 0–1000.`);
    else if (tierName !== "New") {
      if (next.minMonthlyJobs <= prevJobs) {
        errors.push(`Syarat job/bulan tier ${tierName} harus lebih besar dari tier sebelumnya.`);
      }
      prevJobs = next.minMonthlyJobs;
    }
    let changed = false;
    const labels: Record<string, (v: unknown) => string | null> = {
      fastPct: (v) => pct(Number(v)),
      proPct: (v) => pct(Number(v)),
    };
    for (const k of ["fastPct", "proPct", "minMonthlyJobs", "requireZeroViolations", "requireSosmed"] as const) {
      if (!same(cur[k], next[k])) {
        changed = true;
        const f = labels[k] ?? show;
        history.push({ entity: "fee_tier", entity_id: tierName, field: k, old_value: f(cur[k]), new_value: f(next[k]) });
      }
    }
    if (changed) tiersOut.push(next);
  }

  // ------------------------------------------------------------ categories
  const catsOut: { row: ServiceCategory; isNew: boolean }[] = [];
  const catsIn = (Array.isArray(p.categories) ? p.categories : []) as Partial<ServiceCategory>[];
  const curCats = new Map(current.categories.map((c) => [c.id, c]));
  const catIds = new Set(current.categories.map((c) => c.id));
  const catNames = new Set<string>();
  const finalCats: ServiceCategory[] = [];
  // ID sementara dari browser (kategori baru) -> ID final.
  const catIdMap = new Map<string, string>();

  for (const cur of current.categories) {
    if (!catsIn.some((c) => c.id === cur.id)) errors.push(`Kategori "${cur.name}" tidak boleh dihapus (nonaktifkan saja).`);
  }

  for (const c of catsIn) {
    const cur = c.id ? curCats.get(c.id) : undefined;
    const name = cur ? cur.name : str(c.name);
    const isLes = cur ? cur.isLesPrivate : Boolean(c.isLesPrivate);
    const materials = Array.isArray(c.materials)
      ? c.materials
          .map((m) => ({ label: str(m?.label), merek: str(m?.merek) }))
          .filter((m) => m.label || m.merek)
      : [];
    const row: ServiceCategory = {
      id: cur ? cur.id : "",
      name,
      buttonLabel: str(c.buttonLabel) || name,
      skillLabel: isLes ? null : str(c.skillLabel) || null,
      isLesPrivate: isLes,
      materialCostFast: n(c.materialCostFast),
      materialCostPro: n(c.materialCostPro),
      materials,
      active: c.active !== false,
      sortOrder: Number(c.sortOrder ?? 0),
    };
    const label = `Kategori "${name || "(tanpa nama)"}"`;
    if (!name) errors.push("Nama kategori baru wajib diisi.");
    if (name && catNames.has(name.toLowerCase())) errors.push(`${label} dobel.`);
    catNames.add(name.toLowerCase());
    if (!isLes && !row.skillLabel) errors.push(`${label}: label keahlian mitra wajib diisi.`);
    if (!isInt(row.materialCostFast, 0, 1_000_000) || !isInt(row.materialCostPro, 0, 1_000_000)) {
      errors.push(`${label}: biaya bahan harus angka bulat Rp0–Rp1.000.000.`);
    }
    if (materials.some((m) => !m.label || !m.merek)) errors.push(`${label}: tiap bahan wajib punya nama & merek.`);
    if (!Number.isFinite(row.sortOrder)) row.sortOrder = 0;
    row.sortOrder = Math.round(row.sortOrder);

    if (!cur) {
      row.id = uniqueId(slugify(name), catIds);
      if (c.id) catIdMap.set(c.id, row.id);
      catsOut.push({ row, isNew: true });
      history.push({
        entity: "category",
        entity_id: row.id,
        field: "(kategori baru)",
        old_value: null,
        new_value: show({ nama: row.name, tombol: row.buttonLabel, keahlian: row.skillLabel, lesPrivate: row.isLesPrivate }),
      });
    } else {
      let changed = false;
      for (const k of ["buttonLabel", "skillLabel", "materialCostFast", "materialCostPro", "materials", "active", "sortOrder"] as const) {
        if (!same(cur[k], row[k])) {
          changed = true;
          history.push({ entity: "category", entity_id: cur.id, field: k, old_value: show(cur[k]), new_value: show(row[k]) });
        }
      }
      if (changed) catsOut.push({ row, isNew: false });
    }
    finalCats.push(row);
  }

  // ------------------------------------------------------------ products
  const prodsOut: { row: ServiceVariant; isNew: boolean }[] = [];
  const prodsIn = (Array.isArray(p.products) ? p.products : []) as Partial<ServiceVariant>[];
  const curProds = new Map(current.products.map((x) => [x.id, x]));
  const prodIds = new Set(current.products.map((x) => x.id));
  const prodNames = new Set<string>();
  const finalProds: ServiceVariant[] = [];
  const catById = new Map(finalCats.map((c) => [c.id, c]));

  for (const cur of current.products) {
    if (!prodsIn.some((x) => x.id === cur.id)) errors.push(`Produk "${cur.name}" tidak boleh dihapus (matikan "Bisa dipesan").`);
  }

  for (const x of prodsIn) {
    const cur = x.id ? curProds.get(x.id) : undefined;
    const categoryId = cur ? cur.categoryId : catIdMap.get(str(x.categoryId)) ?? str(x.categoryId);
    const cat = catById.get(categoryId);
    const tier = cur ? cur.tier : x.tier === "PRO" ? "PRO" : "Fast";
    const isLes = Boolean(cat?.isLesPrivate);
    const subjectLabel = cur && isLes ? cur.subjectLabel ?? null : isLes ? str(x.subjectLabel) || null : null;
    let name = cur ? cur.name : str(x.name);
    if (!cur && isLes && subjectLabel) name = `${subjectLabel} ${tier}`;
    const detil = strList(x.detilPekerjaan);
    const levels = isLes
      ? EDUCATION_LEVELS.filter((l) => strList(x.subjectLevels).includes(l))
      : [];
    const row: ServiceVariant = {
      id: cur ? cur.id : "",
      category: cat?.name ?? "",
      categoryId,
      name,
      price: n(x.price),
      unit: str(x.unit),
      duration: str(x.duration),
      tier,
      desc: str(x.desc) || undefined,
      detilPekerjaan: detil.length ? detil : undefined,
      subjectLabel,
      subjectLevels: isLes ? levels : null,
      orderable: x.orderable !== false,
      sortOrder: Math.round(Number(x.sortOrder ?? 0)) || 0,
    };
    const label = `Produk "${name || "(tanpa nama)"}"`;
    if (!cat) errors.push(`${label}: kategori tidak ditemukan.`);
    if (!name) errors.push(isLes ? "Mata pelajaran varian Les baru wajib diisi." : "Nama produk baru wajib diisi.");
    if (name && prodNames.has(name.toLowerCase())) errors.push(`${label} dobel (nama produk harus unik).`);
    prodNames.add(name.toLowerCase());
    if (!isInt(row.price, 1, MAX_PRICE)) errors.push(`${label}: harga jual final harus angka bulat > Rp0.`);
    if (!row.unit) errors.push(`${label}: satuan wajib diisi.`);
    if (!row.duration) errors.push(`${label}: durasi wajib diisi (mis. "1 Jam").`);
    if (isLes && levels.length === 0) errors.push(`${label}: pilih minimal 1 tingkat pendidikan.`);

    if (!cur) {
      row.id = uniqueId(slugify(`${cat?.id ?? "produk"}-${name}`), prodIds);
      prodsOut.push({ row, isNew: true });
      history.push({
        entity: "product",
        entity_id: row.id,
        field: "(produk baru)",
        old_value: null,
        new_value: show({ nama: row.name, kategori: row.category, label: row.tier, harga: row.price }),
      });
    } else {
      let changed = false;
      const before = { ...cur, orderable: cur.orderable !== false, sortOrder: cur.sortOrder ?? 0 };
      for (const k of ["price", "unit", "duration", "desc", "detilPekerjaan", "subjectLevels", "orderable", "sortOrder"] as const) {
        if (!same(before[k] ?? null, row[k] ?? null)) {
          changed = true;
          history.push({ entity: "product", entity_id: cur.id, field: k, old_value: show(before[k]), new_value: show(row[k]) });
        }
      }
      if (changed) prodsOut.push({ row, isNew: false });
    }
    finalProds.push(row);
  }

  // Ambang saldo butuh minimal 1 produk Fast yang bisa dipesan.
  const activeCatIds = new Set(finalCats.filter((c) => c.active).map((c) => c.id));
  if (!finalProds.some((x) => x.tier === "Fast" && x.orderable !== false && activeCatIds.has(x.categoryId))) {
    errors.push("Minimal harus ada 1 produk Fast aktif yang bisa dipesan (acuan ambang saldo mitra).");
  }

  if (errors.length) return { ok: false, errors: Array.from(new Set(errors)) };
  return { ok: true, settings: settingsOut, feeTiers: tiersOut, categories: catsOut, products: prodsOut, history };
}
