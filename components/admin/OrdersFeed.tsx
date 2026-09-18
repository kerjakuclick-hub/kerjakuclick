// GANTI ISI components/admin/OrdersFeed.tsx Anda dengan file ini.
//
// Perubahan (fitur "Notifikasi Klien Otomatis + Invoice Pembayaran"):
//   1. Kolom "Konfirmasi Klien" LAMA (unduh ID Card + tombol WA manual +
//      "Tandai Terkirim") DIHAPUS TOTAL -- sejak assign/route.ts mengirim
//      notifikasi WA "pesanan disetujui" ke klien secara OTOMATIS lewat
//      Fonnte begitu mitra ditugaskan, admin tidak perlu klik apa pun lagi.
//   2. Kolom baru "Notifikasi Klien" menggantikannya: cuma status (badge
//      hijau "Terkirim otomatis [jam]" atau badge merah + tombol "Coba Kirim
//      Lagi" kalau pengiriman gagal -- field client_notified_at /
//      client_notify_error, migrasi 020). Bukan langkah rutin, cuma jaring
//      pengaman kalau Fonnte gagal kirim.
//   3. Kolom "Invoice Mitra" tetap ada (dokumen konfirmasi/task-slip saat
//      penugasan, tidak berubah), difilter eksplisit purpose='konfirmasi'.
//   4. Kolom baru "Invoice Pembayaran" (VIEW ONLY buat admin) -- muncul
//      setelah mitra klik "Selesaikan Tugas" dari dashboard-nya. Mitra
//      sendiri yang mengirim ke klien (karena mitra yang menerima
//      pembayaran tunai/transfer), admin cuma bisa lihat/pantau di sini.
//   5. Kolom BARU "Notifikasi Mitra" (fitur "Notifikasi Mitra Otomatis",
//      migrasi 022) -- status kirim WA "tugas baru" ke mitra begitu
//      ditugaskan, pola sama persis dengan "Notifikasi Klien" (badge hijau
//      / badge merah + "Coba Kirim Lagi"). Tombol retry-nya sama-sama
//      memanggil retryNotify() -- endpoint retry-notify sekarang menangani
//      klien & mitra sekaligus, cuma mengirim ulang yang memang masih gagal.
//
// Perubahan BARU (18 September 2026) -- fitur "Skema Fee Berjenjang" (Bagian
// 6.2 Dokumen Bisnis Revisi Pasca-Audit Fraud), migrasi 024:
//   6. eligible_mitra_for_order() sekarang juga mengembalikan fee_percent
//      tier mitra ybs -- ditampilkan di dropdown "Pilih mitra eligible" biar
//      admin tahu potongan platform per mitra tidak lagi flat 20%.
//   7. Label "Ambang saldo" (kolom Layanan) diperjelas: angka itu SEKARANG
//      cuma acuan lama (flat 20%, migrasi 007), ambang kelayakan riil per
//      mitra mengikuti fee_percent masing-masing (lihat dropdown mitra).
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2 "Komunikasi Ter-mediasi",
// 8.2 "Hybrid WA + In-App" & 8.4 "Dashboard & Modul Pendukung": kolom baru
// "Chat" -- tombol untuk membuka/tutup panel <OrderChat /> per pesanan
// (order yang sudah punya mitra), supaya admin bisa memantau atau turun
// tangan langsung di percakapan mitra<->klien tanpa harus lihat/minta nomor
// WA pribadi siapa pun. Terima prop baru `adminId`/`adminName` (identitas
// pengirim kalau admin ikut mengirim pesan).

"use client";

import { Fragment, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/services";
import OrderChat from "@/components/shared/OrderChat";
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
  adminId,
  adminName,
}: {
  initialOrders: Order[];
  initialInvoices: Invoice[];
  /** Identitas admin yang sedang login -- dipakai kalau admin ikut mengirim
   *  pesan lewat Chat Pesanan (Bagian 7.2/8.4). */
  adminId: string;
  adminName: string;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [eligibleMap, setEligibleMap] = useState<Record<number, EligibleMitra[]>>({});
  const [loadingEligible, setLoadingEligible] = useState<number | null>(null);
  const [estimasi, setEstimasi] = useState<Record<number, string>>({});
  const [invoiceBusy, setInvoiceBusy] = useState<number | null>(null);
  const [invoiceError, setInvoiceError] = useState<Record<number, string>>({});
  const [notifyBusy, setNotifyBusy] = useState<number | null>(null);
  const [openChatId, setOpenChatId] = useState<number | null>(null);

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

  /** Coba kirim ulang notifikasi WA "pesanan disetujui" -- HANYA muncul kalau
   * pengiriman otomatis saat penugasan gagal (client_notify_error terisi). */
  async function retryNotify(orderId: number) {
    setNotifyBusy(orderId);
    try {
      const res = await fetch("/api/admin/orders/retry-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.order) {
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      }
      if (!res.ok) {
        alert(data.error ?? "Gagal mengirim ulang notifikasi.");
      }
    } finally {
      setNotifyBusy(null);
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
      <table className="w-full min-w-[1650px] text-left text-sm">
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
            <th className="px-5 py-4">Notifikasi Klien</th>
            <th className="px-5 py-4">Notifikasi Mitra</th>
            <th className="px-5 py-4">Invoice Pembayaran</th>
            <th className="px-5 py-4">Chat</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const eligible = eligibleMap[o.id] ?? [];
            const showEligibleHint = o.status === "unassigned";
            const orderInvoices = invoices.filter((i) => i.order_id === o.id);
            const mitraInvoice = orderInvoices.find(
              (i) => i.recipient_type === "mitra" && i.purpose === "konfirmasi"
            );
            const pembayaranInvoice = orderInvoices.find(
              (i) => i.recipient_type === "klien" && i.purpose === "pembayaran"
            );
            const chatOpen = openChatId === o.id;

            return (
              <Fragment key={o.id}>
              <tr
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
                    Ambang saldo (acuan lama, 20%): {formatRupiah(o.min_wallet_required)} — ambang
                    riil kini mengikuti fee tier tiap mitra, lihat dropdown mitra
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
                            {m.status} · fee {Math.round(m.fee_percent * 100)}%
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
                      {!mitraInvoice && (
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
                  ) : o.client_notified_at ? (
                    <span className="inline-block rounded-full bg-wa/20 px-2 py-0.5 text-xs text-wa">
                      Terkirim otomatis{" "}
                      {new Date(o.client_notified_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : o.client_notify_error ? (
                    <div className="space-y-1 text-xs">
                      <p className="max-w-[200px] text-red-600">Gagal: {o.client_notify_error}</p>
                      <button
                        onClick={() => retryNotify(o.id)}
                        disabled={notifyBusy === o.id}
                        className="rounded-lg bg-amber-100 px-2 py-1 text-amber-700 disabled:opacity-50"
                      >
                        {notifyBusy === o.id ? "Mengirim..." : "Coba Kirim Lagi"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink/40">Memproses...</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {!o.mitra_id ? (
                    <span className="text-xs text-ink/30">-</span>
                  ) : o.mitra_notified_at ? (
                    <span className="inline-block rounded-full bg-wa/20 px-2 py-0.5 text-xs text-wa">
                      Terkirim otomatis{" "}
                      {new Date(o.mitra_notified_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : o.mitra_notify_error ? (
                    <div className="space-y-1 text-xs">
                      <p className="max-w-[200px] text-red-600">Gagal: {o.mitra_notify_error}</p>
                      <button
                        onClick={() => retryNotify(o.id)}
                        disabled={notifyBusy === o.id}
                        className="rounded-lg bg-amber-100 px-2 py-1 text-amber-700 disabled:opacity-50"
                      >
                        {notifyBusy === o.id ? "Mengirim..." : "Coba Kirim Lagi"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink/40">Memproses...</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {pembayaranInvoice?.file_url ? (
                    <div className="space-y-1 text-xs">
                      <a
                        href={pembayaranInvoice.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-bay-deep underline"
                      >
                        Lihat PDF
                      </a>
                      {pembayaranInvoice.drive_file_url && (
                        <a
                          href={pembayaranInvoice.drive_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-bay-deep underline"
                        >
                          Arsip Drive
                        </a>
                      )}
                      <p className="text-ink/40">Dikirim mitra langsung ke klien</p>
                    </div>
                  ) : (
                    <span className="text-xs text-ink/30">
                      {o.status === "completed" ? "Belum ter-generate" : "-"}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {!o.mitra_id ? (
                    <span className="text-xs text-ink/30">-</span>
                  ) : (
                    <button
                      onClick={() => setOpenChatId(chatOpen ? null : o.id)}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-bay-deep hover:bg-bay-deep hover:text-white"
                    >
                      {chatOpen ? "Tutup Chat" : "💬 Lihat Chat"}
                    </button>
                  )}
                </td>
              </tr>
              {chatOpen && (
                <tr className="border-b border-line bg-paper">
                  <td colSpan={12} className="px-5 py-4">
                    <div className="max-w-xl">
                      <OrderChat orderId={o.id} role="admin" currentUserId={adminId} currentUserName={adminName} />
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
