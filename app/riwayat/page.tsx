// GANTI ISI app/riwayat/page.tsx Anda dengan file ini (kalau belum sempat
// dipasang dari revisi sebelumnya, ini FILE BARU).
//
// PERUBAHAN PENTING dari revisi sebelumnya: tidak ada lagi kolom "ketik
// nomor HP" yang bebas dipakai siapa saja. Sekarang halaman ini minta
// pelanggan LOGIN (CustomerAuthPanel) dulu, baru riwayat miliknya sendiri
// yang tampil -- diambil dari app/api/riwayat/route.ts yang sudah
// berbasis sesi, bukan input bebas.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/services";
import CustomerAuthPanel, { type SessionCustomer } from "@/components/CustomerAuthPanel";

type OrderStatus = "unassigned" | "assigned" | "working" | "completed" | "cancelled";

type RiwayatOrder = {
  id: number;
  service_type: string;
  total_price: number;
  address: string;
  scheduled_date: string | null;
  preferred_time: string | null;
  mitra_gender_preference: string | null;
  status: OrderStatus;
  created_at: string;
  customer_name: string;
  customer_phone: string;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  unassigned: "Menunggu Penugasan",
  assigned: "Mitra Ditugaskan",
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

export default function RiwayatPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<SessionCustomer | null | undefined>(undefined);
  const [orders, setOrders] = useState<RiwayatOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => setCustomer(data.customer ?? null))
      .catch(() => setCustomer(null));
  }, []);

  useEffect(() => {
    if (!customer) return;
    fetch("/api/customer/riwayat")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        } else {
          setError(data.error ?? "Gagal memuat riwayat.");
        }
      })
      .catch(() => setError("Gagal memuat riwayat."));
  }, [customer]);

  function pesanLagi(order: RiwayatOrder) {
    localStorage.setItem(
      "kerjaku_reorder",
      JSON.stringify({
        alamat: order.address,
        jasa: order.service_type,
        preferensi: order.mitra_gender_preference ?? "Bebas",
      })
    );
    router.push("/#pesan");
  }

  async function handleLogout() {
    await fetch("/api/customer/logout", { method: "POST" });
    setCustomer(null);
    setOrders(null);
  }

  return (
    <section className="bg-bay-deep">
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
        <p className="eyebrow font-mono text-xs uppercase text-bridge">Riwayat Pesanan</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
          Riwayat &amp; pesan ulang lebih cepat.
        </h1>

        {customer === undefined && <p className="mt-8 text-sm text-white/50">Memuat...</p>}

        {customer === null && (
          <div className="mt-8 max-w-md">
            <p className="mb-4 text-sm text-white/70">
              Masuk dulu untuk melihat riwayat pesanan Anda — supaya riwayat & alamat Anda tidak
              bisa dilihat orang lain.
            </p>
            <CustomerAuthPanel onAuthenticated={setCustomer} />
          </div>
        )}

        {customer && (
          <>
            <div className="mt-6 flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{customer.name}</p>
                <p className="text-xs text-white/50">{customer.phone}</p>
              </div>
              <button onClick={handleLogout} className="text-xs font-medium text-bridge underline">
                Keluar
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

            {orders && orders.length === 0 && !error && (
              <p className="mt-8 text-sm text-white/60">Belum ada riwayat pesanan.</p>
            )}

            {orders && orders.length > 0 && (
              <div className="mt-8 space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-card border border-white/10 bg-white/5 p-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-lg font-semibold">{o.service_type}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {new Date(o.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                      {o.scheduled_date ? ` · Jadwal: ${o.scheduled_date}` : ""}
                      {o.preferred_time ? ` (${o.preferred_time})` : ""}
                    </p>
                    <p className="mt-1 max-w-md text-sm text-white/60">{o.address}</p>
                    <p className="mt-1 text-sm font-medium text-white/85">{formatRupiah(o.total_price)}</p>
                    <button
                      onClick={() => pesanLagi(o)}
                      className="mt-3 rounded-full bg-wa px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                    >
                      Pesan Lagi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
