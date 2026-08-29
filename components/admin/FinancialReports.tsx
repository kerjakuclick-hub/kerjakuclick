// GANTI ISI components/admin/FinancialReports.tsx Anda dengan file ini.
//
// Perubahan dari versi sebelumnya: menambahkan tombol "Unduh PDF" di
// masing-masing dari 3 laporan (Deposito Mitra, Pendapatan Mitra, Fee
// Platform). Setiap tombol men-generate PDF dari data yang SUDAH
// difilter oleh periode yang sedang aktif -- bukan seluruh data mentah.
//
// Catatan penting soal makna data:
// - "Deposito" = saldo titipan mitra (dari top up), TIDAK sama dengan
//   pendapatan mereka.
// - "Fee Platform" = jumlah yang dipotong dari deposito mitra tiap order
//   selesai (kolom `type = 'deduction'` di wallet_transactions) — ini
//   adalah pendapatan RESMI Kerjaku.click.
// - "Pendapatan Mitra" = uang tunai yang diterima mitra langsung dari
//   klien (tabel `earnings`), TIDAK melewati platform sama sekali.

"use client";

import { useMemo, useState } from "react";
import { formatRupiah } from "@/lib/services";
import { exportFinancialReportPdf } from "@/lib/pdf/exportFinancialReportPdf";

type Period = "today" | "week" | "month" | "all";

interface WalletTx {
  id: number;
  mitra_id: string;
  type: "topup" | "deduction";
  amount: number;
  related_order_id: number | null;
  created_at: string;
  profiles: { name: string } | null;
}

interface Earning {
  id: number;
  mitra_id: string;
  order_id: number;
  amount: number;
  created_at: string;
  profiles: { name: string } | null;
}

interface MitraRow {
  id: string;
  name: string;
  wallet_balance: number;
}

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hari Ini",
  week: "7 Hari Terakhir",
  month: "Bulan Ini",
  all: "Semua Waktu",
};

function isInPeriod(dateStr: string, period: Period): boolean {
  if (period === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (period === "today") return date.toDateString() === now.toDateString();
  if (period === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }
  if (period === "month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
}

/** Tombol unduh PDF -- dipakai berulang di 3 section, styling seragam. */
function DownloadPdfButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-bay-deep px-4 py-1.5 text-xs font-semibold text-bay-deep transition hover:bg-bay-deep hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3.5 h-3.5"
      >
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M4 19h16" />
      </svg>
      Unduh PDF
    </button>
  );
}

export default function FinancialReports({
  mitraList,
  walletTransactions,
  earnings,
}: {
  mitraList: MitraRow[];
  walletTransactions: WalletTx[];
  earnings: Earning[];
}) {
  const [period, setPeriod] = useState<Period>("month");

  const filteredWalletTx = useMemo(
    () => walletTransactions.filter((t) => isInPeriod(t.created_at, period)),
    [walletTransactions, period]
  );
  const filteredEarnings = useMemo(
    () => earnings.filter((e) => isInPeriod(e.created_at, period)),
    [earnings, period]
  );

  // ---------- 1. Laporan Deposito ----------
  const totalDepositoAktif = mitraList.reduce((sum, m) => sum + m.wallet_balance, 0);
  const totalTopupPeriode = filteredWalletTx
    .filter((t) => t.type === "topup")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPotonganPeriode = filteredWalletTx
    .filter((t) => t.type === "deduction")
    .reduce((sum, t) => sum + t.amount, 0);

  const depositoPerMitra = mitraList.map((m) => {
    const topup = filteredWalletTx
      .filter((t) => t.mitra_id === m.id && t.type === "topup")
      .reduce((sum, t) => sum + t.amount, 0);
    const potongan = filteredWalletTx
      .filter((t) => t.mitra_id === m.id && t.type === "deduction")
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...m, topup, potongan };
  });

  // ---------- 2. Laporan Pendapatan Mitra ----------
  const totalPendapatanMitra = filteredEarnings.reduce((sum, e) => sum + e.amount, 0);

  const pendapatanMap = new Map<string, { name: string; total: number; count: number }>();
  filteredEarnings.forEach((e) => {
    const key = e.mitra_id;
    const name = e.profiles?.name ?? "-";
    const existing = pendapatanMap.get(key) ?? { name, total: 0, count: 0 };
    existing.total += e.amount;
    existing.count += 1;
    pendapatanMap.set(key, existing);
  });
  const pendapatanPerMitra = Array.from(pendapatanMap.values()).sort((a, b) => b.total - a.total);

  // ---------- 3. Laporan Fee Platform ----------
  const totalFeePlatform = totalPotonganPeriode; // sama persis: potongan dari deposito = fee platform
  const feeTransactions = filteredWalletTx.filter((t) => t.type === "deduction");

  // ---------- Handler unduh PDF ----------
  function handleDownloadDeposito() {
    exportFinancialReportPdf({
      title: "Laporan Deposito Mitra",
      periodLabel: PERIOD_LABEL[period],
      summary: [
        { label: "Total Saldo Aktif (Saat Ini)", value: formatRupiah(totalDepositoAktif) },
        { label: `Total Top Up (${PERIOD_LABEL[period]})`, value: formatRupiah(totalTopupPeriode) },
        {
          label: `Total Terpotong Fee (${PERIOD_LABEL[period]})`,
          value: formatRupiah(totalPotonganPeriode),
        },
      ],
      columns: ["Mitra", "Saldo Saat Ini", `Top Up (${PERIOD_LABEL[period]})`, `Terpotong (${PERIOD_LABEL[period]})`],
      rows: depositoPerMitra.map((m) => [
        m.name,
        formatRupiah(m.wallet_balance),
        formatRupiah(m.topup),
        formatRupiah(m.potongan),
      ]),
      fileName: `laporan-deposito-mitra-${period}-${Date.now()}.pdf`,
      note: "Saldo deposito adalah dana titipan mitra (dari top up) untuk jaminan fee platform, bukan pendapatan mitra.",
    });
  }

  function handleDownloadPendapatan() {
    exportFinancialReportPdf({
      title: "Laporan Pendapatan Mitra",
      periodLabel: PERIOD_LABEL[period],
      summary: [
        {
          label: `Total Pendapatan Semua Mitra (${PERIOD_LABEL[period]})`,
          value: formatRupiah(totalPendapatanMitra),
        },
      ],
      columns: ["Mitra", "Jumlah Pekerjaan", "Total Pendapatan"],
      rows: pendapatanPerMitra.map((m) => [m.name, `${m.count}x`, formatRupiah(m.total)]),
      fileName: `laporan-pendapatan-mitra-${period}-${Date.now()}.pdf`,
      note: "Uang tunai yang diterima mitra langsung dari klien (sudah dikurangi fee platform), tidak melewati rekening perusahaan.",
    });
  }

  function handleDownloadFeePlatform() {
    exportFinancialReportPdf({
      title: "Laporan Fee / Pendapatan Platform",
      periodLabel: PERIOD_LABEL[period],
      summary: [
        { label: `Total Fee Platform (${PERIOD_LABEL[period]})`, value: formatRupiah(totalFeePlatform) },
      ],
      columns: ["Waktu", "Mitra", "Order #", "Fee Terpotong"],
      rows: feeTransactions.map((t) => [
        new Date(t.created_at).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        t.profiles?.name ?? "-",
        t.related_order_id ? `#${t.related_order_id}` : "-",
        formatRupiah(t.amount),
      ]),
      fileName: `laporan-fee-platform-${period}-${Date.now()}.pdf`,
      note: "Fee 20% yang dipotong dari saldo deposito mitra tiap pesanan selesai — pendapatan resmi Kerjaku.click. PDF ini memuat seluruh transaksi periode terpilih (tabel di layar hanya menampilkan 50 terbaru).",
    });
  }

  return (
    <div className="space-y-10">
      {/* Filter periode berlaku untuk ketiga laporan sekaligus */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
              period === p
                ? "bg-bay-deep text-white border-bay-deep"
                : "border-line text-ink/60 hover:border-bay-deep/40"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {/* ============ 1. LAPORAN DEPOSITO MITRA ============ */}
      <section>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Laporan Deposito Mitra</h2>
            <p className="text-sm text-ink/60 mt-1">
              Saldo deposito adalah dana titipan mitra (dari top up) untuk jaminan fee platform —
              bukan pendapatan mitra.
            </p>
          </div>
          <DownloadPdfButton onClick={handleDownloadDeposito} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-xs uppercase text-ink/50">Total Saldo Aktif (Saat Ini)</p>
            <p className="mt-1 font-display text-xl font-semibold text-bay-deep">
              {formatRupiah(totalDepositoAktif)}
            </p>
          </div>
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-xs uppercase text-ink/50">Total Top Up ({PERIOD_LABEL[period]})</p>
            <p className="mt-1 font-display text-xl font-semibold text-wa">
              {formatRupiah(totalTopupPeriode)}
            </p>
          </div>
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-xs uppercase text-ink/50">
              Total Terpotong Fee ({PERIOD_LABEL[period]})
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-red-600">
              {formatRupiah(totalPotonganPeriode)}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white shadow-card">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Mitra</th>
                <th className="px-4 py-3">Saldo Saat Ini</th>
                <th className="px-4 py-3">Top Up ({PERIOD_LABEL[period]})</th>
                <th className="px-4 py-3">Terpotong ({PERIOD_LABEL[period]})</th>
              </tr>
            </thead>
            <tbody>
              {depositoPerMitra.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-4 py-3">{formatRupiah(m.wallet_balance)}</td>
                  <td className="px-4 py-3 text-wa">{formatRupiah(m.topup)}</td>
                  <td className="px-4 py-3 text-red-600">{formatRupiah(m.potongan)}</td>
                </tr>
              ))}
              {depositoPerMitra.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink/50">
                    Belum ada data mitra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ 2. LAPORAN PENDAPATAN MITRA ============ */}
      <section>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Laporan Pendapatan Mitra</h2>
            <p className="text-sm text-ink/60 mt-1">
              Uang tunai yang diterima mitra langsung dari klien (sudah dikurangi fee platform,
              TIDAK melewati rekening perusahaan).
            </p>
          </div>
          <DownloadPdfButton onClick={handleDownloadPendapatan} />
        </div>
        <div className="mt-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card inline-block">
            <p className="text-xs uppercase text-ink/50">
              Total Pendapatan Semua Mitra ({PERIOD_LABEL[period]})
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-wa">
              {formatRupiah(totalPendapatanMitra)}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white shadow-card">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Mitra</th>
                <th className="px-4 py-3">Jumlah Pekerjaan</th>
                <th className="px-4 py-3">Total Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {pendapatanPerMitra.map((m, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-4 py-3 text-ink/70">{m.count}x</td>
                  <td className="px-4 py-3 text-wa font-medium">{formatRupiah(m.total)}</td>
                </tr>
              ))}
              {pendapatanPerMitra.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-ink/50">
                    Belum ada pendapatan tercatat di periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ 3. LAPORAN FEE / PENDAPATAN PLATFORM ============ */}
      <section>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Laporan Fee / Pendapatan Platform
            </h2>
            <p className="text-sm text-ink/60 mt-1">
              Fee 20% yang dipotong dari saldo deposito mitra tiap pesanan selesai — ini pendapatan
              resmi Kerjaku.click.
            </p>
          </div>
          <DownloadPdfButton onClick={handleDownloadFeePlatform} />
        </div>
        <div className="mt-4">
          <div className="rounded-card border-2 border-bay-deep bg-bay-deep/5 p-6 shadow-card inline-block">
            <p className="text-xs uppercase text-ink/50">Total Fee Platform ({PERIOD_LABEL[period]})</p>
            <p className="mt-1 font-display text-3xl font-bold text-bay-deep">
              {formatRupiah(totalFeePlatform)}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-line bg-white shadow-card">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Mitra</th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Fee Terpotong</th>
              </tr>
            </thead>
            <tbody>
              {feeTransactions.slice(0, 50).map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {new Date(t.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{t.profiles?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {t.related_order_id ? `#${t.related_order_id}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-bay-deep font-medium">{formatRupiah(t.amount)}</td>
                </tr>
              ))}
              {feeTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink/50">
                    Belum ada fee tercatat di periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {feeTransactions.length > 50 && (
            <p className="px-4 py-2 text-xs text-ink/40">
              Menampilkan 50 transaksi terbaru dari periode ini (total {feeTransactions.length}
              transaksi). PDF berisi seluruh transaksi periode ini.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
