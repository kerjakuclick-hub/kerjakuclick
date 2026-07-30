import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/services";

export const dynamic = "force-dynamic";

type TransactionRow = {
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

  const { data } = await supabase
    .from("transactions")
    .select("id, order_id, gross_amount, mitra_share, platform_share, created_at, profiles(name)")
    .order("created_at", { ascending: false });

  const transactions = (data ?? []) as unknown as TransactionRow[];

  const totalGross = transactions.reduce((sum, t) => sum + t.gross_amount, 0);
  const totalMitra = transactions.reduce((sum, t) => sum + t.mitra_share, 0);
  const totalPlatform = transactions.reduce((sum, t) => sum + t.platform_share, 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Laporan Transaksi</h1>
      <p className="mt-1 text-sm text-ink/60">
        Setiap baris tercatat otomatis saat sebuah order ditandai "Selesai" — bagi hasil 80% mitra /
        20% platform.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Total Omzet</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {formatRupiah(totalGross)}
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Total ke Mitra (80%)</p>
          <p className="mt-1 font-display text-xl font-semibold text-wa">
            {formatRupiah(totalMitra)}
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Pendapatan Platform (20%)</p>
          <p className="mt-1 font-display text-xl font-semibold text-bay-deep">
            {formatRupiah(totalPlatform)}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-line bg-white shadow-card">
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
            {transactions.map((t) => (
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
                <td className="px-4 py-3 font-mono text-ink/70">
                  {formatRupiah(t.gross_amount)}
                </td>
                <td className="px-4 py-3 font-mono text-wa">{formatRupiah(t.mitra_share)}</td>
                <td className="px-4 py-3 font-mono text-bay-deep">
                  {formatRupiah(t.platform_share)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/50">
                  Belum ada transaksi selesai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
