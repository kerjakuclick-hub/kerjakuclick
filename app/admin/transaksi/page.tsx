// GANTI ISI app/admin/transaksi/page.tsx Anda dengan file ini.
//
// Perubahan: menambahkan 3 laporan keuangan baru (Deposito Mitra,
// Pendapatan Mitra, Fee Platform) lewat komponen <FinancialReports />,
// ditaruh SEBELUM bagian "Riwayat Model Lama" yang sudah ada — arsip lama
// tetap dipertahankan apa adanya di bagian bawah halaman.

import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/services";
import FinancialReports from "@/components/admin/FinancialReports";

export const dynamic = "force-dynamic";

type LegacyTransactionRow = {
  id: number;
  order_id: number;
  gross_amount: number;
  mitra_share: number;
  platform_share: number;
  created_at: string;
  profiles: { name: string } | null;
};

export default async function AdminTransaksiPage() {
  const supabase = createClient();

  const { data: mitraList } = await supabase
    .from("profiles")
    .select("id, name, wallet_balance")
    .eq("role", "mitra")
    .order("name");

  const { data: walletTxData } = await supabase
    .from("wallet_transactions")
    .select("id, mitra_id, type, amount, related_order_id, created_at, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(1000);

  const { data: earningsData } = await supabase
    .from("earnings")
    .select("id, mitra_id, order_id, amount, created_at, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(1000);

  const { data: legacyData } = await supabase
    .from("transactions")
    .select("id, order_id, gross_amount, mitra_share, platform_share, created_at, profiles(name)")
    .order("created_at", { ascending: false });
  const legacyTransactions = (legacyData ?? []) as unknown as LegacyTransactionRow[];

  const totalGrossLama = legacyTransactions.reduce((sum, t) => sum + t.gross_amount, 0);
  const totalMitraLama = legacyTransactions.reduce((sum, t) => sum + t.mitra_share, 0);
  const totalPlatformLama = legacyTransactions.reduce((sum, t) => sum + t.platform_share, 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Laporan Keuangan</h1>
        <p className="mt-1 text-sm text-ink/60">
          Deposito mitra, pendapatan mitra, dan fee/pendapatan platform — model deposit
          (Addendum Fase 1.1).
        </p>
      </div>

      <FinancialReports
        mitraList={mitraList ?? []}
        walletTransactions={(walletTxData ?? []) as never}
        earnings={(earningsData ?? []) as never}
      />

      <section>
        <h2 className="font-display text-lg font-semibold text-ink/70">
          Riwayat Model Lama (arsip, tidak bertambah lagi)
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-paper p-5">
            <p className="text-xs uppercase text-ink/50">Total Omzet (lama)</p>
            <p className="mt-1 font-display text-lg font-semibold text-ink/70">
              {formatRupiah(totalGrossLama)}
            </p>
          </div>
          <div className="rounded-card border border-line bg-paper p-5">
            <p className="text-xs uppercase text-ink/50">Ke Mitra (lama, 80%)</p>
            <p className="mt-1 font-display text-lg font-semibold text-ink/70">
              {formatRupiah(totalMitraLama)}
            </p>
          </div>
          <div className="rounded-card border border-line bg-paper p-5">
            <p className="text-xs uppercase text-ink/50">Platform (lama, 20%)</p>
            <p className="mt-1 font-display text-lg font-semibold text-ink/70">
              {formatRupiah(totalPlatformLama)}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white shadow-card opacity-75">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Mitra</th>
                <th className="px-4 py-3">Omzet</th>
                <th className="px-4 py-3">Bagian Mitra</th>
                <th className="px-4 py-3">Bagian Platform</th>
              </tr>
            </thead>
            <tbody>
              {legacyTransactions.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">
                    {new Date(t.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-ink/70">#{t.order_id}</td>
                  <td className="px-4 py-3 font-medium text-ink">{t.profiles?.name ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-ink/70">{formatRupiah(t.gross_amount)}</td>
                  <td className="px-4 py-3 font-mono text-ink/50">{formatRupiah(t.mitra_share)}</td>
                  <td className="px-4 py-3 font-mono text-ink/50">
                    {formatRupiah(t.platform_share)}
                  </td>
                </tr>
              ))}
              {legacyTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/50">
                    Tidak ada riwayat dari model lama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
