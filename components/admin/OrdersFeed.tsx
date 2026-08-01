// GANTI ISI components/admin/OrdersFeed.tsx Anda dengan file ini.
//
// Perubahan dari versi asli:
//   1. Prop `mitraOptions` (daftar global) DIHAPUS. Sekarang tiap baris
//      "unassigned" mengambil daftar mitra eligible-nya SENDIRI lewat RPC
//      eligible_mitra_for_order(orderId) — saat dropdown dibuka (onFocus),
//      supaya tidak menembak Supabase untuk order yang tidak sedang dilihat.
//   2. Dropdown menampilkan alasan singkat kalau kosong (bukan sekadar
//      "tidak ada pilihan") — supaya admin tahu apakah karena saldo, gender,
//      atau keahlian yang tidak cocok.
//   3. estimasiWaktu ditambahkan sebagai input kecil sebelum menugaskan,
//      dikirim ke endpoint assign untuk dipakai di invoice (AC4 addendum).

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/services";
import type { Order, OrderStatus, EligibleMitra } from "@/lib/types";

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

export default function OrdersFeed({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [eligibleMap, setEligibleMap] = useState<Record<number, EligibleMitra[]>>({});
  const [loadingEligible, setLoadingEligible] = useState<number | null>(null);
  const [estimasi, setEstimasi] = useState<Record<number, string>>({});

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadEligibleMitra(orderId: number) {
    if (eligibleMap[orderId]) return; // sudah pernah dimuat, tidak perlu ulang
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

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center text-sm text-ink/50">
        Belum ada pesanan masuk.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white shadow-card">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
          <tr>
            <th className="px-4 py-3">Waktu Masuk</th>
            <th className="px-4 py-3">Pelanggan</th>
            <th className="px-4 py-3">Layanan</th>
            <th className="px-4 py-3">Jadwal</th>
            <th className="px-4 py-3">Preferensi</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Mitra</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const eligible = eligibleMap[o.id] ?? [];
            const showEligibleHint = o.status === "unassigned";

            return (
              <tr key={o.id} className="border-b border-line last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">
                  {new Date(o.created_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{o.customer_name}</p>
                  <p className="text-xs text-ink/50">{o.customer_phone}</p>
                  <p className="max-w-[180px] truncate text-xs text-ink/50">{o.address}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{o.service_type}</p>
                  <p className="text-xs text-ink/50">{formatRupiah(o.total_price)}</p>
                  <p className="text-xs text-ink/40">
                    Ambang saldo: {formatRupiah(o.min_wallet_required)}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-ink/70">
                  {o.scheduled_date ?? "-"}
                  <br />
                  {o.preferred_time ?? "-"}
                </td>
                <td className="px-4 py-3 text-xs text-ink/70">{o.mitra_gender_preference ?? "-"}</td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
