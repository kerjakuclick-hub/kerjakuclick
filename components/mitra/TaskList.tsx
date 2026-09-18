// GANTI ISI components/mitra/TaskList.tsx Anda dengan file ini.
//
// Perubahan (fitur "Invoice Pembayaran"): terima prop baru `invoices`
// (invoice pembayaran, purpose='pembayaran', dari app/mitra/page.tsx). Baris
// riwayat yang statusnya "completed" sekarang menampilkan tombol "Unduh
// Invoice" untuk arsip pribadi mitra. Invoice yang baru saja terbit (dari
// response advanceStatus) langsung digabung ke state lokal supaya tombolnya
// muncul tanpa perlu refresh.
//
// Perubahan BARU (18 September 2026) -- fitur "Transparansi Rincian Biaya"
// (Bagian 6.1 Dokumen Bisnis Revisi Pasca-Audit Fraud): terima prop baru
// `feePercent` & `tierName` dari app/mitra/page.tsx (hasil RPC
// mitra_tier_info()). Setiap order aktif (assigned/working) sekarang
// menampilkan rincian: nilai order, potongan platform (nominal + tier +
// persen), dan estimasi tunai bersih yang akan diterima mitra dari klien --
// SEBELUM order itu diselesaikan, bukan cuma sesudahnya. Tabel riwayat juga
// ditambah kolom "Potongan Platform" supaya angka fee yang benar-benar
// terpotong (bukan estimasi) tetap terlihat berdampingan dengan "Pendapatan
// Anda".
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2 "Komunikasi Ter-mediasi"
// & 8.2 "Hybrid WA + In-App": setiap order aktif (assigned/working) sekarang
// menampilkan <OrderChat /> -- Chat Pesanan in-app dengan klien, pengganti
// pertukaran nomor WA pribadi. Terima prop baru `mitraName` (dipakai sebagai
// nama pengirim di chat).
//
// Perubahan BARU (18 September 2026) -- fitur "Tambah Waktu Kerja" (diangkat
// dari DOK BISNIS SEPT 2026.pdf): kartu order aktif sekarang menampilkan
// info kalau klien sudah mengajukan tambah waktu (extra_time_minutes > 0) --
// MURNI INFORMASI, mitra tidak mengajukan/menyetujui apa pun di sini karena
// tombol tambah waktu ada di dashboard KLIEN (app/riwayat/page.tsx), sesuai
// dokumen sumbernya.
//
// Perubahan BARU (18 September 2026) -- fitur "Otomatisasi Invoice
// Pembayaran": tombol "Kirim ke WA Klien" (manual) DIHAPUS -- sistem
// sekarang otomatis mengirim invoice lewat Chat Pesanan & WA Fonnte begitu
// tugas diselesaikan (app/api/mitra/orders/update/route.ts). Baris riwayat
// sekarang menampilkan status pengiriman otomatis itu (badge hijau/merah,
// field invoice_notified_at/invoice_notify_error, migrasi 027) -- mitra
// TIDAK PERLU lagi unduh & kirim manual, cukup beri tahu klien secara
// lisan/Chat Pesanan bahwa pekerjaan sudah selesai.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, getServiceTechFee } from "@/lib/services";
import OrderChat from "@/components/shared/OrderChat";
import type { Order, OrderStatus, Transaction, Earning, Invoice } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  unassigned: "Belum Ditugaskan",
  assigned: "Menunggu Dikerjakan",
  working: "Sedang Dikerjakan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  unassigned: "bg-line text-ink/60",
  assigned: "bg-bridge/25 text-bay-deep",
  working: "bg-bay-deep text-white",
  completed: "bg-wa/20 text-wa",
  cancelled: "bg-red-100 text-red-600",
};

export default function TaskList({
  initialOrders,
  mitraId,
  mitraName,
  transactions,
  earnings,
  invoices: initialInvoices,
  feePercent,
  tierName,
}: {
  initialOrders: Order[];
  mitraId: string;
  /** Nama mitra ini -- dipakai sebagai nama pengirim di Chat Pesanan (Bagian 7.2). */
  mitraName: string;
  transactions: Transaction[];
  earnings: Earning[];
  invoices: Invoice[];
  /** Persentase fee tier mitra saat ini (0.07/0.08/0.10) -- Bagian 6.2. */
  feePercent: number;
  /** Nama tier mitra saat ini ("Baru"/"Reguler"/"Terpercaya"/"Unggulan"). */
  tierName: string;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [savingId, setSavingId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("mitra-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `mitra_id=eq.${mitraId}` },
        (payload) => {
          setOrders((prev) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new as Order;
              if (prev.some((o) => o.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Order;
              return prev.map((o) => (o.id === updated.id ? updated : o));
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Order;
              return prev.filter((o) => o.id !== oldRow.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mitraId]);

  async function advanceStatus(orderId: number, nextStatus: OrderStatus) {
    setSavingId(orderId);
    try {
      const res = await fetch("/api/mitra/orders/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      if (res.ok) {
        const { order, invoice } = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
        if (invoice) {
          setInvoices((prev) => [...prev.filter((i) => i.id !== invoice.id), invoice]);
        }
        if (nextStatus === "completed") {
          // Saldo & pendapatan di kartu atas dihitung server-side lewat
          // trigger database — refresh supaya angkanya langsung ter-update.
          router.refresh();
        }
      }
    } finally {
      setSavingId(null);
    }
  }

  // Cek model baru (earnings) dulu, fallback ke model lama (transactions)
  // untuk order yang completed sebelum migrasi 008.
  function pendapatanUntukOrder(orderId: number): number | null {
    const earning = earnings.find((e) => e.order_id === orderId);
    if (earning) return earning.amount;
    const legacy = transactions.find((t) => t.order_id === orderId);
    if (legacy) return legacy.mitra_share;
    return null;
  }

  /** Potongan platform AKTUAL untuk order yang sudah completed (nilai order
   * dikurangi pendapatan bersih yang benar-benar tercatat) -- bukan estimasi,
   * supaya tetap akurat walau tier mitra berubah setelah order itu selesai. */
  function potonganAktualUntukOrder(orderId: number, totalPrice: number): number | null {
    const pendapatan = pendapatanUntukOrder(orderId);
    if (pendapatan === null) return null;
    return totalPrice - pendapatan;
  }

  function invoicePembayaranUntukOrder(orderId: number): Invoice | undefined {
    return invoices.find((i) => i.order_id === orderId && i.purpose === "pembayaran");
  }

  const active = orders.filter((o) => o.status === "assigned" || o.status === "working");
  const history = orders.filter((o) => o.status === "completed" || o.status === "cancelled");
  const feePctLabel = `${Math.round(feePercent * 100)}%`;

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center text-sm text-ink/50">
        Belum ada tugas yang ditugaskan untuk Anda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((o) => {
            // Estimasi -- fee sebenarnya baru dikunci saat order berstatus
            // completed (dihitung trigger database dengan tier mitra PADA
            // SAAT itu). Ditandai "estimasi" supaya tidak disalahpahami
            // sebagai janji pasti kalau tier mitra berubah di tengah jalan.
            // o.total_price di sini SUDAH termasuk tambah waktu kalau klien
            // pernah mengajukannya (lihat extra_time_minutes di bawah).
            //
            // BARU (migrasi 028) -- potongan platform = persentase tier (di
            // atas, TURUN seiring tier naik) + Biaya Teknologi KONSTAN
            // (Rp2.000 Fast / Rp5.000 PRO, TIDAK ikut turun per tier).
            const techFee = getServiceTechFee(o.service_type);
            const estimasiFee = Math.round(o.total_price * feePercent) + techFee;
            const estimasiTunai = o.total_price - estimasiFee;
            return (
              <div key={o.id} className="rounded-card border border-line bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">
                      {o.service_type}
                    </p>
                    <p className="text-sm text-ink/70">{o.customer_name}</p>
                    <p className="text-xs text-ink/50">{o.customer_phone}</p>
                    <p className="mt-1 text-xs text-ink/50">{o.address}</p>
                    <p className="mt-1 text-xs text-ink/60">
                      {o.scheduled_date ?? "-"} &middot; {o.preferred_time ?? "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[o.status]}`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                    <p className="mt-2 font-mono text-sm text-ink">{formatRupiah(o.total_price)}</p>
                  </div>
                </div>

                {o.extra_time_minutes > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⏱️ Klien menambah waktu kerja <strong>+{o.extra_time_minutes} menit</strong> (
                    {formatRupiah(o.extra_time_price)}) -- sudah termasuk di total pesanan di atas.
                    Mohon sesuaikan waktu pengerjaan Anda.
                  </div>
                )}

                <div className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink/70">
                  <p>
                    Potongan platform (tier {tierName} {feePctLabel}
                    {techFee > 0 ? ` + ${formatRupiah(techFee)} teknologi` : ""}):{" "}
                    <span className="font-mono">{formatRupiah(estimasiFee)}</span>
                  </p>
                  <p className="mt-0.5">
                    Estimasi tunai bersih dari klien:{" "}
                    <span className="font-mono font-semibold text-wa">
                      {formatRupiah(estimasiTunai)}
                    </span>
                  </p>
                </div>

                <div className="mt-4">
                  <OrderChat orderId={o.id} role="mitra" currentUserId={mitraId} currentUserName={mitraName} />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {o.status === "assigned" && (
                    <button
                      onClick={() => advanceStatus(o.id, "working")}
                      disabled={savingId === o.id}
                      className="rounded-full bg-bay-deep px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                    >
                      {savingId === o.id ? "Memproses..." : "Mulai Kerjakan"}
                    </button>
                  )}
                  {o.status === "working" && (
                    <button
                      onClick={() => advanceStatus(o.id, "completed")}
                      disabled={savingId === o.id}
                      className="rounded-full bg-wa px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                    >
                      {savingId === o.id ? "Memproses..." : "Selesaikan Tugas"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-ink/50">Riwayat</p>
          <div className="overflow-x-auto rounded-card border border-line bg-white shadow-card">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Nilai</th>
                  <th className="px-4 py-3">Potongan Platform</th>
                  <th className="px-4 py-3">Pendapatan Anda</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Invoice ke Klien</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => {
                  const pendapatan = pendapatanUntukOrder(o.id);
                  const potongan = potonganAktualUntukOrder(o.id, o.total_price);
                  const invoice = invoicePembayaranUntukOrder(o.id);
                  return (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-ink">
                        {o.service_type}
                        {o.extra_time_minutes > 0 && (
                          <span className="mt-0.5 block text-[11px] font-normal text-amber-700">
                            ⏱️ +{o.extra_time_minutes} menit ({formatRupiah(o.extra_time_price)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/70">{o.customer_name}</td>
                      <td className="px-4 py-3 font-mono text-ink/70">
                        {formatRupiah(o.total_price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-ink/50">
                        {potongan !== null ? formatRupiah(potongan) : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-wa">
                        {pendapatan !== null ? formatRupiah(pendapatan) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[o.status]}`}
                        >
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {o.status !== "completed" ? (
                          <span className="text-xs text-ink/30">-</span>
                        ) : invoice?.file_url ? (
                          <div className="flex flex-col items-start gap-1.5 text-xs">
                            <a
                              href={invoice.file_url}
                              download={`invoice-${invoice.invoice_number}.pdf`}
                              className="inline-block rounded-lg border border-bay-deep px-2.5 py-1.5 font-medium text-bay-deep hover:bg-bay-deep hover:text-white"
                            >
                              Unduh Invoice
                            </a>
                            {o.invoice_notified_at ? (
                              <span className="rounded-full bg-wa/20 px-2 py-0.5 text-wa">
                                ✓ Terkirim otomatis ke klien (chat &amp; WA)
                              </span>
                            ) : o.invoice_notify_error ? (
                              <span className="max-w-[220px] rounded-full bg-red-100 px-2 py-0.5 text-red-600">
                                Gagal kirim WA otomatis -- klien tetap bisa lihat di chat/dasbornya
                              </span>
                            ) : (
                              <span className="text-ink/40">Mengirim ke klien...</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-red-500">Belum ter-generate</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
