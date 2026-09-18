// FILE BARU: components/FloatingChatLauncher.tsx
//
// Tombol Chat Pesanan MELAYANG di halaman publik (jawaban atas pertanyaan:
// "chat pesanan klien bukan tombol melayang... supaya klien mudah lihat
// fungsi chat sama mitra tanpa perlu ke halaman riwayat pesanan"). Sebelum
// ini, satu-satunya jalan pelanggan membuka Chat Pesanan adalah login lalu
// buka /riwayat lalu cari kartu pesanannya -- komponen ini menaruh akses
// cepat ke chat yang sama di SEMUA halaman publik, tanpa perlu pindah
// halaman.
//
// Cara kerja:
//   1. Dipasang sekali di app/layout.tsx (root layout), jadi otomatis ikut
//      tampil di semua route publik.
//   2. Cek sesi pelanggan (GET /api/customer/me) + pesanan aktifnya (GET
//      /api/customer/riwayat, disaring status "assigned"/"working" saja --
//      SENGAJA TIDAK memakai endpoint baru, cukup pakai endpoint riwayat
//      yang sudah ada & teruji, supaya tidak ada logic pencocokan nomor HP
//      yang dobel-tulis).
//   3. Kalau pelanggan belum login ATAU tidak punya pesanan aktif, tombol
//      TIDAK dirender sama sekali -- tidak mengganggu pengunjung biasa yang
//      belum pernah pesan.
//   4. Kalau ada >=1 pesanan aktif, muncul bubble melayang pojok kanan
//      bawah (badge angka kalau pesanan aktif lebih dari satu). Klik ->
//      langsung buka chat (kalau cuma 1 pesanan aktif) atau daftar pesanan
//      dulu (kalau lebih dari 1) -- pakai OrderChatCustomerPanel yang sama
//      persis dipakai di /riwayat, supaya tidak ada 2 versi UI chat yang
//      beda kode.
//
// Disembunyikan di: dasbor admin (subdomain admin.kerjaku.click), dasbor
// mitra (/mitra/*), halaman /riwayat sendiri (chat sudah ada inline di
// sana, dobel akan membingungkan), dan halaman auth/maintenance yang tidak
// relevan.

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OrderChatCustomerPanel } from "./OrderChatCustomer";
import type { SessionCustomer } from "./CustomerAuthPanel";

const ADMIN_HOST = "admin.kerjaku.click";
const HIDDEN_PATH_PREFIXES = ["/admin", "/mitra", "/riwayat", "/login", "/reset-pin", "/daftar-mitra", "/maintenance"];
const POLL_MS = 30000;

type ActiveOrder = { id: number; service_type: string; status: "assigned" | "working" };

const STATUS_LABEL: Record<ActiveOrder["status"], string> = {
  assigned: "Mitra Ditugaskan",
  working: "Sedang Dikerjakan",
};

export default function FloatingChatLauncher() {
  const pathname = usePathname();
  const [customer, setCustomer] = useState<SessionCustomer | null>(null);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const isAdminHost = typeof window !== "undefined" && window.location.hostname === ADMIN_HOST;
  const hidden = isAdminHost || HIDDEN_PATH_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;

    async function load() {
      const me = await fetch("/api/customer/me")
        .then((r) => r.json())
        .catch(() => ({ customer: null }));
      if (cancelled) return;
      setCustomer(me.customer ?? null);

      if (!me.customer) {
        setOrders([]);
        return;
      }

      const riwayat = await fetch("/api/customer/riwayat")
        .then((r) => r.json())
        .catch(() => ({ orders: [] }));
      if (cancelled) return;
      if (Array.isArray(riwayat.orders)) {
        const active = riwayat.orders.filter(
          (o: { status: string }) => o.status === "assigned" || o.status === "working"
        );
        setOrders(active);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hidden]);

  if (hidden || !customer || orders.length === 0) return null;

  function openLauncher() {
    setSelectedOrderId(orders.length === 1 ? orders[0].id : null);
    setPanelOpen(true);
  }

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  if (!panelOpen) {
    return (
      <button
        onClick={openLauncher}
        aria-label="Buka Chat Pesanan"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-wa text-2xl text-white shadow-lg transition hover:brightness-105"
      >
        💬
        {orders.length > 1 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {orders.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-h-[28rem] w-80 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-card border border-white/15 bg-bay-deep shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {selectedOrder && orders.length > 1 && (
            <button
              onClick={() => setSelectedOrderId(null)}
              aria-label="Kembali ke daftar pesanan"
              className="text-white/60 hover:text-white"
            >
              ←
            </button>
          )}
          <p className="text-xs font-medium text-white">
            {selectedOrder ? `Chat · ${selectedOrder.service_type}` : "Chat Pesanan"}
          </p>
        </div>
        <button onClick={() => setPanelOpen(false)} className="text-xs text-white/50 underline">
          Tutup
        </button>
      </div>

      {!selectedOrder && (
        <div className="space-y-1 overflow-y-auto p-2">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedOrderId(o.id)}
              className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-white transition hover:bg-white/10"
            >
              <span className="text-sm font-medium">{o.service_type}</span>
              <span className="text-xs text-white/50">{STATUS_LABEL[o.status]}</span>
            </button>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <OrderChatCustomerPanel orderId={selectedOrder.id} customerName={customer.name} />
        </div>
      )}
    </div>
  );
}
