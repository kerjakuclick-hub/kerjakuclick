// components/admin/BusinessParamsEditor.tsx -- FILE BARU (25 September 2026).
// Editor "Parameter Bisnis" (khusus Super Admin, /admin/parameter).
// Semua angka acuan perhitungan bisnis kerjaku.click diisi di sini:
//   1. Katalog & harga jual FINAL (produk, varian, kategori baru, bahan)
//   2. Fee platform per tier & label + syarat tier loyalty
//   3. Transport & tambah waktu
//   4. Riwayat perubahan (siapa, kapan, lama -> baru)
// Perubahan disimpan sekaligus lewat tombol "Simpan", berlaku ±1 menit di
// seluruh sistem (website, dasbor, bot WA, potongan saldo mitra).

"use client";

import { useMemo, useState } from "react";
import {
  EDUCATION_LEVELS,
  LOYALTY_TIERS,
  formatRupiah,
  type BusinessParams,
  type FeeTierParam,
  type ServiceCategory,
  type ServiceVariant,
} from "@/lib/services";

export type HistoryEntry = {
  id: number;
  changed_at: string;
  changed_by_name: string | null;
  entity: string;
  entity_id: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
};

// Penomor ID sementara item baru (belum disimpan) -- unik per halaman.
let tempSeq = 0;

type Tab = "katalog" | "fee" | "transport" | "riwayat";

const FIELD_LABELS: Record<string, string> = {
  transport_cost: "Biaya transport",
  extra_time_unit_minutes: "Durasi 1 unit tambah waktu (menit)",
  extra_time_options: "Pilihan tambah waktu (menit)",
  fastPct: "Fee Fast",
  proPct: "Fee PRO",
  minMonthlyJobs: "Syarat job/bulan (lebih dari)",
  requireZeroViolations: "Wajib 0 pelanggaran",
  requireSosmed: "Wajib ikut sosmed",
  buttonLabel: "Label tombol",
  skillLabel: "Label keahlian mitra",
  materialCostFast: "Biaya bahan Fast",
  materialCostPro: "Biaya bahan PRO",
  materials: "Merek bahan",
  active: "Aktif",
  sortOrder: "Urutan",
  price: "Harga jual final",
  unit: "Satuan",
  duration: "Durasi",
  desc: "Deskripsi",
  detilPekerjaan: "Detil pekerjaan",
  subjectLevels: "Tingkat pendidikan",
  orderable: "Bisa dipesan",
};
const ENTITY_LABELS: Record<string, string> = {
  settings: "Umum",
  fee_tier: "Tier",
  category: "Kategori",
  product: "Produk",
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const toPct = (n: number) => Math.round(n * 10000) / 100;
const fromPct = (s: string) => Math.round(Number(s.replace(",", ".")) * 100) / 10000;
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/\./g, "").replace(",", ".")));

const inputCls =
  "w-full rounded-md border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink focus:border-ink/40 focus:outline-none disabled:bg-paper disabled:text-ink/50";
const labelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/50";
const cardCls = "rounded-card border border-ink/10 bg-white p-4 shadow-card sm:p-5";

function formatWita(iso: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function prettyValue(v: string | null) {
  if (v === null || v === "") return "—";
  if (v === "true") return "Ya";
  if (v === "false") return "Tidak";
  return v;
}

export default function BusinessParamsEditor({
  initialParams,
  initialHistory,
}: {
  initialParams: BusinessParams;
  initialHistory: HistoryEntry[];
}) {
  const [original, setOriginal] = useState<BusinessParams>(initialParams);
  const [draft, setDraft] = useState<BusinessParams>(() => clone(initialParams));
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [tab, setTab] = useState<Tab>("katalog");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string; list?: string[] } | null>(null);
  const [openProduct, setOpenProduct] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(original), [draft, original]);

  // ---------------------------------------------------------------- helpers
  function nextTempId(prefix: string) {
    tempSeq += 1;
    return `new-${prefix}-${tempSeq}-${Date.now().toString(36)}`;
  }
  function updateSettings(patch: Partial<BusinessParams["settings"]>) {
    setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }
  function updateTier(tier: string, patch: Partial<FeeTierParam>) {
    setDraft((d) => ({ ...d, feeTiers: d.feeTiers.map((t) => (t.tier === tier ? { ...t, ...patch } : t)) }));
  }
  function updateCategory(id: string, patch: Partial<ServiceCategory>) {
    setDraft((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }
  function updateProduct(id: string, patch: Partial<ServiceVariant>) {
    setDraft((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }
  const isNewId = (id: string) => id.startsWith("new-");

  const originalProductIds = useMemo(() => new Set(original.products.map((p) => p.id)), [original]);
  const originalCategoryIds = useMemo(() => new Set(original.categories.map((c) => c.id)), [original]);

  // Ambang saldo mitra: fee New Fast x harga Fast termurah yang bisa dipesan.
  const threshold = useMemo(() => {
    const activeCats = new Set(draft.categories.filter((c) => c.active).map((c) => c.id));
    const fast = draft.products
      .filter((p) => p.tier === "Fast" && p.orderable !== false && activeCats.has(p.categoryId) && p.price > 0)
      .map((p) => p.price);
    const newTier = draft.feeTiers.find((t) => t.tier === "New");
    if (!fast.length || !newTier) return null;
    const min = Math.min(...fast);
    return { value: Math.round(newTier.fastPct * min), min, pct: newTier.fastPct };
  }, [draft]);

  // ---------------------------------------------------------------- tambah
  function addCategory() {
    const id = nextTempId("c");
    const sortOrder = Math.max(0, ...draft.categories.map((c) => c.sortOrder)) + 1;
    setDraft((d) => ({
      ...d,
      categories: [
        ...d.categories,
        {
          id,
          name: "",
          buttonLabel: "",
          skillLabel: "",
          isLesPrivate: false,
          materialCostFast: 0,
          materialCostPro: 0,
          materials: [],
          active: true,
          sortOrder,
        },
      ],
    }));
  }

  function addProduct(cat: ServiceCategory, tier: "Fast" | "PRO", subject?: { label: string; levels: string[] }) {
    const id = nextTempId("p");
    const sortOrder = Math.max(0, ...draft.products.map((p) => p.sortOrder ?? 0)) + 1;
    const product: ServiceVariant = {
      id,
      category: cat.name,
      categoryId: cat.id,
      name: subject ? `${subject.label} ${tier}` : "",
      price: 0,
      unit: cat.isLesPrivate ? "sesi" : "",
      duration: "",
      tier,
      desc: undefined,
      detilPekerjaan: undefined,
      subjectLabel: subject ? subject.label : null,
      subjectLevels: subject ? subject.levels : null,
      orderable: true,
      sortOrder,
    };
    setDraft((d) => ({ ...d, products: [...d.products, product] }));
    setOpenProduct(id);
  }

  function removeNewItem(kind: "c" | "p", id: string) {
    setDraft((d) =>
      kind === "c"
        ? { ...d, categories: d.categories.filter((c) => c.id !== id), products: d.products.filter((p) => p.categoryId !== id) }
        : { ...d, products: d.products.filter((p) => p.id !== id) }
    );
  }

  // ---------------------------------------------------------------- simpan
  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/business-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseVersion: original.version, params: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "Gagal menyimpan.", list: data.errors });
        return;
      }
      setOriginal(data.params);
      setDraft(clone(data.params));
      setHistory(data.history ?? []);
      setMessage({
        kind: "ok",
        text:
          data.changed > 0
            ? `${data.changed} perubahan tersimpan & tercatat di riwayat. Berlaku di seluruh sistem dalam ±1 menit.`
            : "Tidak ada perubahan.",
      });
    } catch {
      setMessage({ kind: "err", text: "Koneksi gagal. Coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(clone(original));
    setMessage(null);
  }

  // ---------------------------------------------------------------- render
  const sortedCats = [...draft.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const entityName = (entity: string, id: string | null) => {
    if (!id) return "";
    if (entity === "product") return draft.products.find((p) => p.id === id)?.name ?? id;
    if (entity === "category") return draft.categories.find((c) => c.id === id)?.name ?? id;
    if (entity === "settings") return "";
    return id;
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Ringkasan */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cardCls}>
          <p className={labelCls}>Ambang saldo mitra (otomatis)</p>
          <p className="font-display text-xl font-semibold text-ink">
            {threshold ? formatRupiah(threshold.value) : "—"}
          </p>
          {threshold && (
            <p className="mt-1 text-xs text-ink/55">
              Fee New Fast {toPct(threshold.pct)}% × produk Fast termurah {formatRupiah(threshold.min)}
            </p>
          )}
        </div>
        <div className={cardCls}>
          <p className={labelCls}>Transport mitra</p>
          <p className="font-display text-xl font-semibold text-ink">{formatRupiah(draft.settings.transportCost || 0)}</p>
          <p className="mt-1 text-xs text-ink/55">Flat per order (acuan upah bersih mitra)</p>
        </div>
        <div className={cardCls}>
          <p className={labelCls}>Katalog</p>
          <p className="font-display text-xl font-semibold text-ink">
            {draft.products.filter((p) => p.orderable !== false).length} produk aktif
          </p>
          <p className="mt-1 text-xs text-ink/55">
            {draft.categories.filter((c) => c.active).length} kategori aktif · {draft.products.length} total produk
          </p>
        </div>
      </div>

      {/* Tab */}
      <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-2">
        {(
          [
            ["katalog", "Katalog & Harga Jual"],
            ["fee", "Fee & Tier Loyalty"],
            ["transport", "Transport & Tambah Waktu"],
            ["riwayat", `Riwayat (${history.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              tab === key ? "bg-ink text-white" : "text-ink/60 hover:bg-white hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ============================ KATALOG ============================ */}
      {tab === "katalog" && (
        <div className="space-y-6">
          <p className="rounded-md bg-bridge/15 px-3 py-2 text-xs leading-relaxed text-ink/75">
            Harga yang diisi adalah <b>harga jual FINAL</b> ke klien (dihitung terpisah di luar sistem). Nama produk,
            kategori & label Fast/PRO tidak bisa diubah setelah disimpan karena tercatat di pesanan &amp; invoice.
            Produk tidak dihapus — matikan <b>Bisa dipesan</b> untuk menyembunyikannya.
          </p>

          {sortedCats.map((cat) => {
            const catIsNew = !originalCategoryIds.has(cat.id);
            const products = draft.products
              .filter((p) => p.categoryId === cat.id)
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            return (
              <section key={cat.id} className={`${cardCls} ${cat.active ? "" : "opacity-70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {catIsNew ? (
                      <input
                        className={`${inputCls} font-semibold`}
                        placeholder="Nama kategori baru, mis. Cuci Sofa"
                        value={cat.name}
                        onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                      />
                    ) : (
                      <h2 className="font-display text-lg font-semibold text-ink">{cat.name}</h2>
                    )}
                    <p className="mt-0.5 text-xs text-ink/50">
                      {cat.isLesPrivate ? "Kategori Les Private (varian per mata pelajaran)" : "Kategori rumah tangga"}
                      {catIsNew && " · baru, belum disimpan"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={cat.active}
                        onChange={(e) => updateCategory(cat.id, { active: e.target.checked })}
                      />
                      Aktif
                    </label>
                    {catIsNew && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600"
                        onClick={() => removeNewItem("c", cat.id)}
                      >
                        Batal tambah
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className={labelCls}>Label tombol pesan</label>
                    <input
                      className={inputCls}
                      value={cat.buttonLabel}
                      placeholder={cat.name}
                      onChange={(e) => updateCategory(cat.id, { buttonLabel: e.target.value })}
                    />
                  </div>
                  {!cat.isLesPrivate && (
                    <div>
                      <label className={labelCls}>Label keahlian mitra</label>
                      <input
                        className={inputCls}
                        value={cat.skillLabel ?? ""}
                        onChange={(e) => updateCategory(cat.id, { skillLabel: e.target.value })}
                      />
                    </div>
                  )}
                  {catIsNew && (
                    <div>
                      <label className={labelCls}>Jenis</label>
                      <select
                        className={inputCls}
                        value={cat.isLesPrivate ? "les" : "rt"}
                        onChange={(e) =>
                          updateCategory(cat.id, {
                            isLesPrivate: e.target.value === "les",
                            skillLabel: e.target.value === "les" ? null : "",
                          })
                        }
                      >
                        <option value="rt">Rumah tangga</option>
                        <option value="les">Les / per mata pelajaran</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Biaya bahan Fast (Rp)</label>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={Number.isFinite(cat.materialCostFast) ? String(cat.materialCostFast) : ""}
                      onChange={(e) => updateCategory(cat.id, { materialCostFast: num(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Biaya bahan PRO (Rp)</label>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={Number.isFinite(cat.materialCostPro) ? String(cat.materialCostPro) : ""}
                      onChange={(e) => updateCategory(cat.id, { materialCostPro: num(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Urutan</label>
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={String(cat.sortOrder)}
                      onChange={(e) => updateCategory(cat.id, { sortOrder: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Merek bahan */}
                <div className="mt-4">
                  <p className={labelCls}>Bahan standar &amp; merek (tampil di invoice / WA)</p>
                  <div className="space-y-2">
                    {cat.materials.map((m, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className={inputCls}
                          placeholder="Nama bahan"
                          value={m.label}
                          onChange={(e) =>
                            updateCategory(cat.id, {
                              materials: cat.materials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                            })
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="Merek"
                          value={m.merek}
                          onChange={(e) =>
                            updateCategory(cat.id, {
                              materials: cat.materials.map((x, j) => (j === i ? { ...x, merek: e.target.value } : x)),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="px-2 text-sm text-red-600"
                          aria-label="Hapus bahan"
                          onClick={() => updateCategory(cat.id, { materials: cat.materials.filter((_, j) => j !== i) })}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs font-semibold text-ink/70 underline"
                      onClick={() => updateCategory(cat.id, { materials: [...cat.materials, { label: "", merek: "" }] })}
                    >
                      + Tambah bahan
                    </button>
                  </div>
                </div>

                {/* Produk */}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink/50">
                        <th className="py-2 pr-2">Produk</th>
                        <th className="py-2 pr-2">Label</th>
                        <th className="py-2 pr-2">Harga jual final</th>
                        <th className="py-2 pr-2">Fee New / Pro</th>
                        <th className="py-2 pr-2">Bisa dipesan</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <ProductRows
                          key={p.id}
                          product={p}
                          category={cat}
                          isNew={!originalProductIds.has(p.id)}
                          open={openProduct === p.id}
                          onToggle={() => setOpenProduct((o) => (o === p.id ? null : p.id))}
                          onChange={(patch) => updateProduct(p.id, patch)}
                          onRemove={() => removeNewItem("p", p.id)}
                          feeTiers={draft.feeTiers}
                        />
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-3 text-xs text-ink/50">
                            Belum ada produk.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {cat.isLesPrivate ? (
                    <AddLesSubject onAdd={(label, levels) => {
                      addProduct(cat, "Fast", { label, levels });
                      addProduct(cat, "PRO", { label, levels });
                    }} />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper"
                        onClick={() => addProduct(cat, "Fast")}
                      >
                        + Produk Fast
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper"
                        onClick={() => addProduct(cat, "PRO")}
                      >
                        + Produk PRO
                      </button>
                    </>
                  )}
                </div>
              </section>
            );
          })}

          <button
            type="button"
            onClick={addCategory}
            className="w-full rounded-card border-2 border-dashed border-ink/20 py-4 text-sm font-semibold text-ink/70 hover:border-ink/40 hover:text-ink"
          >
            + Tambah kategori jasa baru
          </button>
          <p className="text-xs text-ink/50">
            Kategori baru otomatis muncul di formulir pesan, kartu Layanan di beranda (ikon default — foto bisa diupload di
            Media dengan slug <code>service_&lt;id-kategori&gt;</code>), balasan harga WA, dan checkbox keahlian mitra.
          </p>
        </div>
      )}

      {/* ============================ FEE & TIER ============================ */}
      {tab === "fee" && (
        <section className={cardCls}>
          <p className="mb-4 text-xs leading-relaxed text-ink/60">
            Fee platform dipotong dari saldo deposit mitra saat order selesai: <b>harga jual × fee%</b> (sesuai tier
            mitra &amp; label produk) + fee penuh dari tambah waktu. Tier dihitung dari job selesai <b>bulan kalender
            berjalan</b>: mitra naik ke tier jika jumlah job-nya <b>lebih dari</b> angka syarat.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink/50">
                  <th className="py-2 pr-2">Tier</th>
                  <th className="py-2 pr-2">Fee Fast (%)</th>
                  <th className="py-2 pr-2">Fee PRO (%)</th>
                  <th className="py-2 pr-2">Job/bulan lebih dari</th>
                  <th className="py-2 pr-2">0 pelanggaran</th>
                  <th className="py-2 pr-2">Ikut sosmed</th>
                </tr>
              </thead>
              <tbody>
                {LOYALTY_TIERS.map((name) => {
                  const t = draft.feeTiers.find((x) => x.tier === name)!;
                  const isNew = name === "New";
                  return (
                    <tr key={name} className="border-b border-ink/5">
                      <td className="py-2 pr-2 font-semibold text-ink">{name}</td>
                      <td className="py-2 pr-2">
                        <PctInput value={t.fastPct} onChange={(v) => updateTier(name, { fastPct: v })} />
                      </td>
                      <td className="py-2 pr-2">
                        <PctInput value={t.proPct} onChange={(v) => updateTier(name, { proPct: v })} />
                      </td>
                      <td className="py-2 pr-2">
                        {isNew ? (
                          <span className="text-xs text-ink/50">Awal (semua mitra baru)</span>
                        ) : (
                          <input
                            className={`${inputCls} w-24`}
                            inputMode="numeric"
                            value={Number.isFinite(t.minMonthlyJobs) ? String(t.minMonthlyJobs) : ""}
                            onChange={(e) => updateTier(name, { minMonthlyJobs: num(e.target.value) })}
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          disabled={isNew}
                          checked={t.requireZeroViolations}
                          onChange={(e) => updateTier(name, { requireZeroViolations: e.target.checked })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          disabled={isNew}
                          checked={t.requireSosmed}
                          onChange={(e) => updateTier(name, { requireSosmed: e.target.checked })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink/50">
            Catatan: order yang sedang berjalan dipotong memakai fee yang berlaku saat order <b>selesai</b>. Fee tambah
            waktu memakai angka saat klien mengajukan tambah waktu.
          </p>
        </section>
      )}

      {/* ============================ TRANSPORT ============================ */}
      {tab === "transport" && (
        <section className={`${cardCls} space-y-5`}>
          <div className="max-w-xs">
            <label className={labelCls}>Biaya transport mitra per order (Rp)</label>
            <input
              className={inputCls}
              inputMode="numeric"
              value={Number.isFinite(draft.settings.transportCost) ? String(draft.settings.transportCost) : ""}
              onChange={(e) => updateSettings({ transportCost: num(e.target.value) })}
            />
            <p className="mt-1 text-xs text-ink/50">Acuan perhitungan upah bersih mitra (laporan & dasbor).</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Durasi 1 unit tambah waktu (menit)</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={Number.isFinite(draft.settings.extraTimeUnitMinutes) ? String(draft.settings.extraTimeUnitMinutes) : ""}
                onChange={(e) => updateSettings({ extraTimeUnitMinutes: num(e.target.value) })}
              />
              <p className="mt-1 text-xs text-ink/50">
                Harga per unit = (harga jual − fee) ÷ 2 + fee. Fee tambah waktu dipotong penuh.
              </p>
            </div>
            <div>
              <label className={labelCls}>Pilihan tambah waktu untuk klien (menit, pisahkan koma)</label>
              <input
                className={inputCls}
                defaultValue={draft.settings.extraTimeOptions.join(", ")}
                key={draft.settings.extraTimeOptions.join(",") + original.version}
                onBlur={(e) =>
                  updateSettings({
                    extraTimeOptions: e.target.value
                      .split(/[,\s]+/)
                      .filter(Boolean)
                      .map((x) => Number(x)),
                  })
                }
              />
              <p className="mt-1 text-xs text-ink/50">Harus kelipatan durasi unit, mis. 30, 60.</p>
            </div>
          </div>
        </section>
      )}

      {/* ============================ RIWAYAT ============================ */}
      {tab === "riwayat" && (
        <section className={cardCls}>
          {history.length === 0 ? (
            <p className="text-sm text-ink/50">Belum ada perubahan tercatat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink/50">
                    <th className="py-2 pr-2">Waktu (WITA)</th>
                    <th className="py-2 pr-2">Oleh</th>
                    <th className="py-2 pr-2">Bagian</th>
                    <th className="py-2 pr-2">Parameter</th>
                    <th className="py-2">Lama → Baru</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-ink/5 align-top">
                      <td className="whitespace-nowrap py-2 pr-2 text-ink/70">{formatWita(h.changed_at)}</td>
                      <td className="py-2 pr-2 text-ink">{h.changed_by_name ?? "—"}</td>
                      <td className="py-2 pr-2 text-ink">
                        {ENTITY_LABELS[h.entity] ?? h.entity} {entityName(h.entity, h.entity_id)}
                      </td>
                      <td className="py-2 pr-2 text-ink/80">{FIELD_LABELS[h.field] ?? h.field}</td>
                      <td className="max-w-[320px] break-words py-2 text-ink">
                        <span className="text-ink/50 line-through decoration-ink/30">{prettyValue(h.old_value)}</span>{" "}
                        → <span className="font-semibold">{prettyValue(h.new_value)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Bar simpan */}
      {(dirty || message) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(18,32,42,0.25)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              {message ? (
                <div className={message.kind === "ok" ? "text-emerald-700" : "text-red-600"}>
                  <p className="font-semibold">{message.text}</p>
                  {message.list && (
                    <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5 text-xs">
                      {message.list.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-ink/70">Ada perubahan yang belum disimpan.</p>
              )}
            </div>
            <div className="flex gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={reset}
                  disabled={saving}
                  className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-paper"
                >
                  Batalkan
                </button>
              )}
              {dirty ? (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-bridge px-5 py-2 text-sm font-bold text-ink hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan perubahan"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(toPct(value)));
  const [last, setLast] = useState(value);
  if (value !== last && Number.isFinite(value) && fromPct(text) !== value) {
    setLast(value);
    setText(String(toPct(value)));
  }
  return (
    <input
      className={`${inputCls} w-24`}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = fromPct(e.target.value);
        setLast(v);
        onChange(v);
      }}
    />
  );
}

function ProductRows({
  product: p,
  category,
  isNew,
  open,
  onToggle,
  onChange,
  onRemove,
  feeTiers,
}: {
  product: ServiceVariant;
  category: ServiceCategory;
  isNew: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ServiceVariant>) => void;
  onRemove: () => void;
  feeTiers: FeeTierParam[];
}) {
  const key = p.tier === "PRO" ? "proPct" : "fastPct";
  const feeNew = feeTiers.find((t) => t.tier === "New")?.[key] ?? 0;
  const feePro = feeTiers.find((t) => t.tier === "Pro")?.[key] ?? 0;
  const validPrice = Number.isFinite(p.price) && p.price > 0;

  return (
    <>
      <tr className="border-b border-ink/5">
        <td className="py-2 pr-2">
          {isNew && !category.isLesPrivate ? (
            <input
              className={inputCls}
              placeholder={`Nama produk, mis. ${category.name || "Cuci Sofa"} ${p.tier}`}
              value={p.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          ) : (
            <span className="font-medium text-ink">{p.name || "(isi mata pelajaran)"}</span>
          )}
          {isNew && <span className="ml-1 text-[10px] font-semibold uppercase text-bridge">baru</span>}
        </td>
        <td className="py-2 pr-2 text-ink/70">{p.tier}</td>
        <td className="py-2 pr-2">
          <input
            className={`${inputCls} w-32`}
            inputMode="numeric"
            value={Number.isFinite(p.price) && p.price !== 0 ? String(p.price) : ""}
            placeholder="0"
            onChange={(e) => onChange({ price: num(e.target.value) })}
          />
        </td>
        <td className="whitespace-nowrap py-2 pr-2 text-xs text-ink/60">
          {validPrice ? `${formatRupiah(Math.round(p.price * feeNew))} / ${formatRupiah(Math.round(p.price * feePro))}` : "—"}
        </td>
        <td className="py-2 pr-2">
          <input type="checkbox" checked={p.orderable !== false} onChange={(e) => onChange({ orderable: e.target.checked })} />
        </td>
        <td className="whitespace-nowrap py-2 text-right">
          <button type="button" className="text-xs font-semibold text-ink/70 underline" onClick={onToggle}>
            {open ? "Tutup" : "Detail"}
          </button>
          {isNew && (
            <button type="button" className="ml-3 text-xs font-semibold text-red-600" onClick={onRemove}>
              Batal
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-ink/10 bg-paper/60">
          <td colSpan={6} className="p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Satuan</label>
                <input
                  className={inputCls}
                  placeholder="mis. 25 pcs / sesi / rumah"
                  value={p.unit}
                  onChange={(e) => onChange({ unit: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Durasi kerja</label>
                <input
                  className={inputCls}
                  placeholder="mis. 1 Jam / 1,5 Jam"
                  value={p.duration}
                  onChange={(e) => onChange({ duration: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Urutan</label>
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={String(p.sortOrder ?? 0)}
                  onChange={(e) => onChange({ sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Deskripsi</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={p.desc ?? ""}
                  onChange={(e) => onChange({ desc: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Detil pekerjaan (satu per baris)</label>
                <textarea
                  className={inputCls}
                  rows={4}
                  value={(p.detilPekerjaan ?? []).join("\n")}
                  onChange={(e) => onChange({ detilPekerjaan: e.target.value.split("\n") })}
                />
              </div>
              {category.isLesPrivate && (
                <div className="sm:col-span-3">
                  <label className={labelCls}>Tingkat pendidikan</label>
                  <div className="flex flex-wrap gap-3">
                    {EDUCATION_LEVELS.map((lvl) => (
                      <label key={lvl} className="flex items-center gap-1.5 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={(p.subjectLevels ?? []).includes(lvl)}
                          onChange={(e) => {
                            const cur = new Set(p.subjectLevels ?? []);
                            if (e.target.checked) cur.add(lvl);
                            else cur.delete(lvl);
                            onChange({ subjectLevels: EDUCATION_LEVELS.filter((l) => cur.has(l)) });
                          }}
                        />
                        {lvl}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AddLesSubject({ onAdd }: { onAdd: (label: string, levels: string[]) => void }) {
  const [label, setLabel] = useState("");
  const [levels, setLevels] = useState<string[]>(["SD", "SMP", "SMA"]);
  return (
    <div className="flex w-full flex-wrap items-end gap-3 rounded-md border border-dashed border-ink/20 p-3">
      <div className="min-w-[180px] flex-1">
        <label className={labelCls}>Mata pelajaran baru</label>
        <input
          className={inputCls}
          placeholder="mis. Bahasa Arab"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3 pb-1.5">
        {EDUCATION_LEVELS.map((lvl) => (
          <label key={lvl} className="flex items-center gap-1 text-sm text-ink">
            <input
              type="checkbox"
              checked={levels.includes(lvl)}
              onChange={(e) =>
                setLevels((cur) =>
                  e.target.checked ? EDUCATION_LEVELS.filter((l) => l === lvl || cur.includes(l)) : cur.filter((l) => l !== lvl)
                )
              }
            />
            {lvl}
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!label.trim() || levels.length === 0}
        onClick={() => {
          onAdd(label.trim(), levels);
          setLabel("");
        }}
        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-50"
      >
        + Tambah varian Fast &amp; PRO
      </button>
    </div>
  );
}
