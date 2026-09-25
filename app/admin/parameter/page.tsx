// app/admin/parameter/page.tsx -- FILE BARU (25 September 2026).
// "Parameter Bisnis" -- seluruh angka acuan perhitungan bisnis
// kerjaku.click (harga jual final, katalog & varian, fee per tier & label,
// syarat tier loyalty, transport, bahan, tambah waktu). KHUSUS SUPER ADMIN:
// admin biasa tidak melihat menunya & mendapat halaman 404 kalau membuka
// URL ini langsung.

import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentSuperAdmin } from "@/lib/superAdmin";
import { fetchBusinessParamsFresh } from "@/lib/businessParams";
import BusinessParamsEditor, { type HistoryEntry } from "@/components/admin/BusinessParamsEditor";

export const dynamic = "force-dynamic";

export const metadata = { title: "Parameter Bisnis — Kerjaku.click Admin" };

export default async function ParameterBisnisPage() {
  const me = await getCurrentSuperAdmin();
  if (!me) notFound();

  let params;
  try {
    params = await fetchBusinessParamsFresh();
  } catch (err) {
    return (
      <div className="rounded-card border border-red-200 bg-white p-6">
        <h1 className="font-display text-xl font-semibold text-ink">Parameter Bisnis belum siap</h1>
        <p className="mt-2 text-sm text-ink/70">
          Tabel parameter belum ditemukan di database. Jalankan migrasi{" "}
          <code>040_parameter_bisnis_dinamis.sql</code> di Supabase SQL Editor, lalu muat ulang halaman ini.
        </p>
        <p className="mt-2 text-xs text-ink/40">{(err as Error).message}</p>
      </div>
    );
  }

  const { data: history } = await getSupabaseAdmin()
    .from("business_param_history")
    .select("id, changed_at, changed_by_name, entity, entity_id, field, old_value, new_value")
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Parameter Bisnis</h1>
        <p className="mt-1 text-sm text-ink/60">
          Angka acuan seluruh perhitungan bisnis kerjaku.click. Hanya Super Admin ({me.name}) yang dapat melihat &amp;
          mengubah halaman ini. Setiap perubahan tercatat di Riwayat dan berlaku di seluruh sistem dalam ±1 menit.
        </p>
      </div>
      <BusinessParamsEditor initialParams={params} initialHistory={(history ?? []) as HistoryEntry[]} />
    </div>
  );
}
