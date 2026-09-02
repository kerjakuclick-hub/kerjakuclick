// GANTI ISI components/admin/OrdersFeed.tsx Anda dengan file ini.
//
// Perubahan dari versi sebelumnya (streamlining alur konfirmasi klien,
// karena Fonnte API kirim belum terkoneksi -- masih webhook/terima saja):
//   1. Kolom "Invoice" lama (Klien + Mitra) dipecah: baris Klien pindah
//      gabung ke kolom "Konfirmasi Klien" yang baru, kolom "Invoice Mitra"
//      sekarang cuma urus invoice Mitra saja.
//   2. Kolom "ID Mitra" lama diganti "Konfirmasi Klien" -- satu kolom
//      berisi: link unduh ID Card (pakai atribut `download`, jadi
//      langsung ke-download, tidak perlu buka tab lalu save-as manual
//      lagi), link "Lihat Invoice" klien, tombol buka WA klien, dan SATU
//      tombol "Tandai Terkirim" yang menandai invoice klien + ID card
//      sekaligus (bukan dua tombol terpisah seperti sebelumnya).
//   3. Layout tabel (spacing kolom + scrollbar horizontal) tetap seperti
//      perbaikan sebelumnya, tidak diubah lagi di file ini.

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/services";
import { buildClientWaLink } from "@/lib/whatsapp";
import type { Order, OrderStatus, EligibleMitra, Invoice } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  unassigned: "Belum Ditugaskan",
  assigned: "Ditugaskan",
  working: "Sedang Dikerjakan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  unassigned: "bg-bridge/25 text-bay-deep",
  assigned: "bg-bay-light/30 text-bay-deep",
  working: "bg-bay-deep text-white",
  completed: "bg-wa/20 text-wa",
  cancelled: "bg-red-100 text-red-600",
};

export default function OrdersFeed({
  initialOrders,
  initialInvoices,
}: {
  initialOrders: Order[];
  initialInvoices: Invoice[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [eligibleMap, setEligibleMap] = useState<Record<number, EligibleMitra[]>>({});
  const [loadingEligible, setLoadingEligible] = useState<number | null>(null);
  const [estimasi, setEstimasi] = useState<Record<number, string>>({});
  const [invoiceBusy, setInvoiceBusy] = useState<number | null>(null);
  const [invoiceError, setInvoiceError] = useState<Record<number, string>>({});
  const [confirmBusy, setConfirmBusy] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
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

    const invoiceChannel = supabase
      .channel("invoices-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        (payload) => {
          setInvoices((prev) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new as Invoice;
              if (prev.some((i) => i.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Invoice;
              return prev.map((i) => (i.id === updated.id ? updated : i));
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(invoiceChannel);
    };
  }, []);

  async function loadEligibleMitra(orderId: number) {
    if (eligibleMap[orderId]) return;
    setLoadingEligible(orderId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("eligible_mitra_for_order", {
        p_order_id: orderId,
      });
      if (!error) {
        setEligibleMap((prev) => ({ ...prev, [orderId]: (data ?? []) as EligibleMitra[] }));
      }
    } finally {
      setLoadingEligible(null);
    }
  }

  async function assignMitra(orderId: number, mitraId: string) {
    setSavingId(orderId);
    try {
      const res = await fetch("/api/admin/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          mitra_id: mitraId || null,
          status: mitraId ? "assigned" : "unassigned",
          estimasiWaktu: estimasi[orderId] || "segera",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
        if (!data.invoice) {
          setInvoiceError((prev) => ({
            ...prev,
            [orderId]:
              "Invoice tidak otomatis ter-generate (kemungkinan bucket Storage 'invoices' belum ada). Coba tombol Generate di bawah.",
          }));
        }
      } else {
        alert(data.error ?? "Gagal menugaskan mitra.");
      }
    } finally {
      setSavingId(null);
    }
  }

  async function updateStatus(orderId: number, status: OrderStatus) {
    setSavingId(orderId);
    try {
      const res = await fetch("/api/admin/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        const { order } = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      }
    } finally {
      setSavingId(null);
    }
  }

  async function retryGenerateInvoice(orderId: number) {
    setInvoiceBusy(orderId);
    setInvoiceError((prev) => ({ ...prev, [orderId]: "" }));
    try {
      const res = await fetch("/api/admin/orders/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, estimasiWaktu: estimasi[orderId] || "segera" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInvoiceError((prev) => ({ ...prev, [orderId]: data.error ?? "Gagal generate invoice." }));
        return;
      }
      // Invoice baru masuk lewat realtime subscription di atas, tapi jaga-jaga
      // kalau realtime belum tersambung, tetap refresh manual dari sini.
      const supabase = createClient();
      const { data: fresh } = await supabase.from("invoices").select("*").eq("order_id", orderId);
      if (fresh) {
        setInvoices((prev) => [...prev.filter((i) => i.order_id !== orderId), ...fresh]);
      }
    } finally {
      setInvoiceBusy(null);
    }
  }

  async function markSent(invoiceId: number) {
    setInvoiceBusy(invoiceId);
    try {
      const res = await fetch("/api/admin/invoices/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      if (res.ok) {
        const { invoice } = await res.json();
        setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoice : i)));
      }
    } finally {
      setInvoiceBusy(null);
    }
  }

  /**
   * "Konfirmasi Klien" -- satu tombol untuk mempersingkat alur lama yang
   * butuh buka-tab-terpisah lalu save-as manual. Sekarang: (1) ID Card
   * ter-download otomatis lewat klik <a download> di JSX (browser tidak
   * menganggap itu popup, jadi aman), lalu (2) chat WA klien langsung
   * kebuka dengan teks siap kirim -- cuma 1 window.open() supaya tidak
   * kena popup blocker (pernah kejadian sebelumnya kalau 2 sekaligus).
   * Invoice PDF klien tetap dibuka lewat link "Lihat Invoice" terpisah di
   * kolom yang sama (klik manual kalau memang belum kebuka), karena PDF-nya
   * di-host Supabase Storage (beda origin) sehingga tidak bisa dipaksa ikut
   * ter-download otomatis dari sini.
   *
   * Belum ada kirim otomatis lewat Fonnte API (baru webhook/terima yang
   * aktif) -- begitu device-token Fonnte untuk kirim sudah di-setup, alur
   * ini bisa diganti jadi benar-benar 1 klik tanpa perlu attach manual di
   * WA sama sekali.
   */
  function openWaKonfirmasiKlien(order: Order) {
    const text = `Halo ${order.customer_name}, pesanan Anda di Kerjaku.click sudah kami tugaskan ke mitra kami. Berikut ID Mitra terverifikasi & invoice pesanan (terlampir) untuk memastikan keamanan dan transparansi biaya Anda. Terima kasih! - Kerjaku.click`;
    window.open(buildClientWaLink(order.customer_phone, text), "_blank");
  }

  /** Menandai SEKALIGUS invoice klien + ID Card sebagai terkirim -- satu tombol, bukan dua. */
  async function markKlienConfirmed(orderId: number, klienInvoiceId?: number) {
    setConfirmBusy(orderId);
    try {
      const res = await fetch("/api/admin/orders/mark-klien-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, klienInvoiceId }),
      });
      if (res.ok) {
        const { order, invoice } = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
        if (invoice) {
          setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoice : i)));
        }
      }
    } finally {
      setConfirmBusy(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center text-sm text-ink/50">
        Belum ada pesanan masuk.
      </div>
    );
  }

  return (
    // max-h + overflow-auto (bukan cuma overflow-x-auto) supaya scrollbar
    // horizontal selalu ada di dekat bagian atas layar -- tidak perlu
    // scroll ke bawah dulu buat nemuin scrollbar-nya kalau baris pesanan
    // banyak. Header ikut sticky supaya nama kolom tetap kelihatan saat
    // scroll ke bawah.
    <div className="max-h-[75vh] overflow-auto rounded-card border border-line bg-white shadow-card">
      <table className="w-full min-w-[1350px] text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-line bg-paper text-xs uppercase text-ink/50 shadow-sm">
          <tr className="divide-x divide-line">
            <th className="px-5 py-4">Waktu Masuk</th>
            <th className="px-5 py-4">Pelanggan</th>
            <th className="px-5 py-4">Layanan</th>
            <th className="px-5 py-4">Jadwal</th>
            <th className="px-5 py-4">Preferensi</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Mitra</th>
            <th className="px-5 py-4">Invoice Mitra</th>
            <th className="px-5 py-4">Konfirmasi Klien</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const eligible = eligibleMap[o.id] ?? [];
            const showEligibleHint = o.status === "unassigned";
            const orderInvoices = invoices.filter((i) => i.order_id === o.id);
            const klienInvoice = orderInvoices.find((i) => i.recipient_type === "klien");
            const mitraInvoice = orderInvoices.find((i) => i.recipient_type === "mitra");

            return (
              <tr
                key={o.id}
                className="divide-x divide-line border-b border-line align-top last:border-0"
              >
                <td className="whitespace-nowrap px-5 py-4 text-xs text-ink/60">
                  {new Date(o.created_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-ink">{o.customer_name}</p>
                  <p className="text-xs text-ink/50">{o.customer_phone}</p>
                  <p className="max-w-[180px] truncate text-xs text-ink/50">{o.address}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-ink">{o.service_type}</p>
                  <p className="text-xs text-ink/50">{formatRupiah(o.total_price)}</p>
                  <p className="text-xs text-ink/40">
                    Ambang saldo: {formatRupiah(o.min_wallet_required)}
                  </p>
                </td>
                <td className="px-5 py-4 text-xs text-ink/70">
                  {o.scheduled_date ?? "-"}
                  <br />
                  {o.preferred_time ?? "-"}
                </td>
                <td className="px-5 py-4 text-xs text-ink/70">{o.mitra_gender_preference ?? "-"}</td>
                <td className="px-5 py-4">
                  <select
                    value={o.status}
                    disabled={savingId === o.id}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[o.status]}`}
                  >
                    {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((value) => (
                      <option key={value} value={value} className="bg-white text-ink">
                        {STATUS_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  {showEligibleHint ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Estimasi waktu (mis. 1 jam lagi)"
                        value={estimasi[o.id] ?? ""}
                        onChange={(e) =>
                          setEstimasi((prev) => ({ ...prev, [o.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-line px-2 py-1 text-xs"
                      />
                      <select
                        defaultValue=""
                        disabled={savingId === o.id}
                        onFocus={() => loadEligibleMitra(o.id)}
                        onChange={(e) => e.target.value && assignMitra(o.id, e.target.value)}
                        className="w-full rounded-lg border border-line px-2 py-1.5 text-xs text-ink"
                      >
                        <option value="">
                          {loadingEligible === o.id ? "Memuat mitra..." : "Pilih mitra eligible"}
                        </option>
                        {eligible.map((m) => (
                          <option key={m.mitra_id} value={m.mitra_id}>
                            {m.name} · {formatRupiah(m.wallet_balance)} · {m.gender ?? "?"} ·{" "}
                            {m.status}
                          </option>
                        ))}
                        {eligible.length === 0 && loadingEligible !== o.id && (
                          <option value="" disabled>
                            Tidak ada mitra memenuhi syarat (saldo/gender/keahlian)
                          </option>
                        )}
                      </select>
                    </div>
                  ) : (
                    <select
                      value={o.mitra_id ?? ""}
                      disabled={savingId === o.id}
                      onFocus={() => loadEligibleMitra(o.id)}
                      onChange={(e) =>
                        e.target.value
                          ? assignMitra(o.id, e.target.value)
                          : updateStatus(o.id, "unassigned")
                      }
                      className="w-full rounded-lg border border-line px-2 py-1.5 text-xs text-ink"
                    >
                      <option value={o.mitra_id ?? ""} disabled>
                        Mitra sudah ditugaskan
                      </option>
                      <option value="">Batalkan penugasan</option>
                    </select>
                  )}
                </td>
                <td className="px-5 py-4">
                  {o.status === "unassigned" ? (
                    <span className="text-xs text-ink/30">-</span>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {mitraInvoice ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={mitraInvoice.file_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-bay-deep underline"
                          >
                            Lihat PDF
                          </a>
                          {mitraInvoice.sent_at ? (
                            <span className="rounded-full bg-wa/20 px-2 py-0.5 text-wa">
                              Terkirim
                            </span>
                          ) : (
                            <button
                              onClick={() => markSent(mitraInvoice.id)}
                              disabled={invoiceBusy === mitraInvoice.id}
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 disabled:opacity-50"
                            >
                              Tandai Terkirim
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-red-500">Belum ter-generate</span>
                      )}
                      {(!klienInvoice || !mitraInvoice) && (
                        <button
                          onClick={() => retryGenerateInvoice(o.id)}
                          disabled={invoiceBusy === o.id}
                          className="mt-1 rounded-lg bg-bay-deep px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          {invoiceBusy === o.id ? "Memproses..." : "Generate Invoice"}
                        </button>
                      )}
                      {invoiceError[o.id] && (
                        <p className="mt-1 max-w-[200px] text-red-600">{invoiceError[o.id]}</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  {!o.mitra_id ? (
                    <span className="text-xs text-ink/30">-</span>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {/* download otomatis, bukan cuma "buka tab lalu save manual" --
                          sama origin (route API kita sendiri) jadi atribut download
                          jalan normal di browser. */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a
                          href={`/api/admin/mitra/id-card?mitraId=${o.mitra_id}`}
                          download={`id-card-mitra-order-${o.id}.png`}
                          className="inline-block rounded-lg border border-bay-deep px-2.5 py-1.5 text-xs font-medium text-bay-deep hover:bg-bay-deep hover:text-white"
                        >
                          Unduh ID Mitra
                        </a>
                        {klienInvoice?.file_url && (
                          <a
                            href={klienInvoice.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-bay-deep underline"
                          >
                            Lihat Invoice
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => openWaKonfirmasiKlien(o)}
                        className="block rounded-lg bg-bay-deep px-2.5 py-1.5 text-xs font-medium text-white hover:bg-bay-deep/90"
                      >
                        Kirim ke WA Klien
                      </button>
                      {o.mitra_id_card_sent_at ? (
                        <span className="inline-block rounded-full bg-wa/20 px-2 py-0.5 text-wa">
                          Terkirim
                        </span>
                      ) : (
                        <button
                          onClick={() => markKlienConfirmed(o.id, klienInvoice?.id)}
                          disabled={confirmBusy === o.id}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 disabled:opacity-50"
                        >
                          {confirmBusy === o.id ? "Memproses..." : "Tandai Terkirim"}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
