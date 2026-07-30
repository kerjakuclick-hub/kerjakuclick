"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/services";
import type { Order, OrderStatus, Transaction } from "@/lib/types";

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
  transactions,
}: {
  initialOrders: Order[];
  mitraId: string;
  transactions: Transaction[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
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
        const { order } = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
        if (nextStatus === "completed") {
          // Saldo & total pendapatan di kartu atas dihitung server-side lewat
          // trigger database — refresh supaya angkanya langsung ter-update.
          router.refresh();
        }
      }
    } finally {
      setSavingId(null);
    }
  }

  const active = orders.filter((o) => o.status === "assigned" || o.status === "working");
  const history = orders.filter((o) => o.status === "completed" || o.status === "cancelled");

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
          {active.map((o) => (
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
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-ink/50">Riwayat</p>
          <div className="overflow-x-auto rounded-card border border-line bg-white shadow-card">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
                <tr>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Nilai</th>
                  <th className="px-4 py-3">Pendapatan Anda</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => {
                  const tx = transactions.find((t) => t.order_id === o.id);
                  return (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-ink">{o.service_type}</td>
                      <td className="px-4 py-3 text-ink/70">{o.customer_name}</td>
                      <td className="px-4 py-3 font-mono text-ink/70">
                        {formatRupiah(o.total_price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-wa">
                        {tx ? formatRupiah(tx.mitra_share) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[o.status]}`}
                        >
                          {STATUS_LABEL[o.status]}
                        </span>
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
