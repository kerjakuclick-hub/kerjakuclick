// app/api/admin/business-params/route.ts -- FILE BARU (25 September 2026).
// API halaman "Parameter Bisnis" (/admin/parameter). KHUSUS SUPER ADMIN
// (profiles.is_super_admin, migrasi 040) -- admin biasa mendapat 404
// supaya fitur ini tetap tersembunyi.
//
//   GET  -> parameter terkini (langsung dari database) + 100 riwayat terakhir
//   POST -> { baseVersion, params } : validasi, simpan yang berubah, catat
//           riwayat (siapa, kapan, lama -> baru), lalu reset cache sehingga
//           seluruh sistem memakai angka baru (±1 menit).

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentSuperAdmin } from "@/lib/superAdmin";
import { BUSINESS_PARAMS_TAG, fetchBusinessParamsFresh } from "@/lib/businessParams";
import { validateAndDiff } from "@/lib/businessParamsDiff";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });

async function loadHistory() {
  const { data } = await getSupabaseAdmin()
    .from("business_param_history")
    .select("id, changed_at, changed_by_name, entity, entity_id, field, old_value, new_value")
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function GET() {
  const me = await getCurrentSuperAdmin();
  if (!me) return notFound();
  try {
    const [params, history] = await Promise.all([fetchBusinessParamsFresh(), loadHistory()]);
    return NextResponse.json({ params, history });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const me = await getCurrentSuperAdmin();
  if (!me) return notFound();

  let body: { baseVersion?: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  let current;
  try {
    current = await fetchBusinessParamsFresh();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }

  // Cegah menimpa perubahan Super Admin lain yang tersimpan lebih dulu.
  if (body.baseVersion && body.baseVersion !== current.version) {
    return NextResponse.json(
      {
        error:
          "Parameter sudah diubah (oleh Anda di tab lain atau Super Admin lain) sejak halaman ini dibuka. Muat ulang halaman lalu ulangi perubahan Anda.",
      },
      { status: 409 }
    );
  }

  const diff = validateAndDiff(current, body.params);
  if (!diff.ok) {
    return NextResponse.json({ error: "Periksa kembali isian:", errors: diff.errors }, { status: 400 });
  }
  if (diff.history.length === 0) {
    return NextResponse.json({ ok: true, changed: 0, params: current, history: await loadHistory() });
  }

  const admin = getSupabaseAdmin();
  const fail = (step: string, message: string) =>
    NextResponse.json({ error: `Gagal menyimpan ${step}: ${message}` }, { status: 500 });

  if (diff.settings) {
    const { error } = await admin
      .from("business_settings")
      .update({
        transport_cost: diff.settings.transportCost,
        extra_time_unit_minutes: diff.settings.extraTimeUnitMinutes,
        extra_time_options: diff.settings.extraTimeOptions,
      })
      .eq("id", 1);
    if (error) return fail("transport & tambah waktu", error.message);
  }

  for (const t of diff.feeTiers) {
    const { error } = await admin
      .from("fee_tiers")
      .update({
        fast_pct: t.fastPct,
        pro_pct: t.proPct,
        min_monthly_jobs: t.minMonthlyJobs,
        require_zero_violations: t.requireZeroViolations,
        require_sosmed: t.requireSosmed,
      })
      .eq("tier", t.tier);
    if (error) return fail(`fee tier ${t.tier}`, error.message);
  }

  // Kategori dulu (produk baru bisa merujuk kategori baru).
  for (const { row, isNew } of diff.categories) {
    const values = {
      button_label: row.buttonLabel,
      skill_label: row.skillLabel,
      material_cost_fast: row.materialCostFast,
      material_cost_pro: row.materialCostPro,
      materials: row.materials,
      active: row.active,
      sort_order: row.sortOrder,
    };
    const { error } = isNew
      ? await admin
          .from("service_categories")
          .insert({ id: row.id, name: row.name, is_les_private: row.isLesPrivate, ...values })
      : await admin.from("service_categories").update(values).eq("id", row.id);
    if (error) return fail(`kategori "${row.name}"`, error.message);
  }

  for (const { row, isNew } of diff.products) {
    const values = {
      price: row.price,
      unit: row.unit,
      duration: row.duration,
      description: row.desc ?? null,
      detil_pekerjaan: row.detilPekerjaan ?? null,
      subject_levels: row.subjectLevels ?? null,
      orderable: row.orderable !== false,
      sort_order: row.sortOrder ?? 0,
    };
    const { error } = isNew
      ? await admin.from("service_products").insert({
          id: row.id,
          category_id: row.categoryId,
          name: row.name,
          tier: row.tier,
          subject_label: row.subjectLabel ?? null,
          ...values,
        })
      : await admin.from("service_products").update(values).eq("id", row.id);
    if (error) return fail(`produk "${row.name}"`, error.message);
  }

  const { error: histError } = await admin.from("business_param_history").insert(
    diff.history.map((h) => ({ ...h, changed_by: me.id, changed_by_name: me.name }))
  );
  if (histError) console.error("[business-params] gagal mencatat riwayat:", histError.message);

  // Semua server (API, WA bot, halaman) memuat ulang parameter; halaman
  // publik yang di-cache ikut dibangun ulang.
  revalidateTag(BUSINESS_PARAMS_TAG);
  revalidatePath("/", "layout");

  const [params, history] = await Promise.all([fetchBusinessParamsFresh(), loadHistory()]);
  return NextResponse.json({ ok: true, changed: diff.history.length, params, history });
}
