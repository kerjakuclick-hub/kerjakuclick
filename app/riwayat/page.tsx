// GANTI ISI app/riwayat/page.tsx Anda dengan file ini (kalau belum sempat
// dipasang dari revisi sebelumnya, ini FILE BARU).
//
// PERUBAHAN PENTING dari revisi sebelumnya: tidak ada lagi kolom "ketik
// nomor HP" yang bebas dipakai siapa saja. Sekarang halaman ini minta
// pelanggan LOGIN (CustomerAuthPanel) dulu, baru riwayat miliknya sendiri
// yang tampil -- diambil dari app/api/riwayat/route.ts yang sudah
// berbasis sesi, bukan input bebas.
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2/8.2 Dokumen Bisnis
// Revisi Pasca-Audit Fraud: setiap kartu pesanan yang sudah punya mitra
// (assigned/working/completed) sekarang menampilkan tombol "Chat Pesanan"
// (<OrderChatCustomer />) -- kanal in-app untuk koordinasi jadwal &
// pertanyaan dengan mitra, menggantikan pertukaran nomor WA pribadi mentah
// yang jadi celah di temuan audit.
//
// Perubahan BARU (18 September 2026) -- fitur "Tambah Waktu Kerja" &
// "Otomatisasi Invoice Pembayaran" (migrasi
// 027_order_extra_time_and_invoice_notify.sql):
//   1. Kartu pesanan assigned/working yang jasanya termasuk varian didukung
//      & BELUM pernah ditambah waktu menampilkan <ExtraTimeButton /> --
//      klien sendiri yang mengajukan, bukan mitra (lihat catatan lengkap
//      di komponen itu & app/api/customer/orders/[id]/extra-time/route.ts).
//   2. Kartu pesanan yang sudah pernah ditambah waktu menampilkan info
//      baris kecil (bukan tombol lagi -- sudah dipakai jatahnya).
//   3. Kartu pesanan completed yang sudah punya invoice pembayaran
//      menampilkan link unduh langsung -- klien tidak perlu lagi menunggu
//      dikirim mitra, cukup buka halaman ini kapan saja.
//
// PERUBAHAN BESAR (20 September 2026) -- migrasi "Upgrade Fee Tier Produk":
// rate tambah waktu (30/60 menit) sekarang TERGANTUNG TIER MITRA yang
// ditugaskan ke order ybs, jadi TIDAK BISA lagi dihitung di sini murni dari
// service_type (dulu lewat getExtraTimeOptions()). Sekarang dihitung
// SERVER-SIDE oleh app/api/customer/riwayat/route.ts (yang sudah pegang
// mitra_id tiap order) & dikirim sebagai field `extra_time_rates` siap
// pakai per order -- halaman ini tinggal baca field itu, tidak perlu tahu
// tier mitra sama sekali.
//
// REVISI STRUKTUR (21 September 2026, mengikuti mockup Canva Anda): nav
// "Riwayat Pesanan" di-rebrand jadi "AkunKU" (label nav saja, lihat
// Header.tsx -- isi & fungsi halaman ini TIDAK berubah). Sekalian: (1)
// <Header />/<Footer /> ditambahkan supaya halaman ini bisa dinavigasi
// balik lewat menu (sebelumnya halaman ini berdiri sendiri tanpa nav situs
// sama sekali -- gap konsistensi dari versi lama). (2) tombol "Pesan Lagi"
// diarahkan ke "/pesan" (form order sekarang halaman sendiri), bukan lagi
// "/#pesan" (anchor lama di beranda yang sudah tidak ada).
//
// REVISI (21 September 2026, dari Anda langsung): "Akunku selain fungsi
// cek riwayat pesanan, kolom chat in app, dan profil klien (nama dan
// alamat serta kolom foto bisa pakai avatar." -- bar kecil nama+nomor+
// tombol Keluar yang sebelumnya di sini DIGANTI <ProfilKlien /> (baru,
// lihat components/ProfilKlien.tsx): kartu profil dengan avatar inisial,
// nama & alamat yang bisa diubah langsung (tersimpan lewat PATCH
// /api/customer/profile, baru -- alamat sekarang kolom di tabel
// `customers`, lihat migrasi 032_customer_profile_address.sql), plus
// tombol Keluar yang tadinya di bar itu. Fungsi riwayat pesanan & chat
// in-app (<OrderChatCustomer />) di bawahnya TIDAK berubah.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/services";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CustomerAuthPanel, { type SessionCustomer } from "@/components/CustomerAuthPanel";
import ProfilKlien from "@/components/ProfilKlien";
import OrderChatCustomer from "@/components/OrderChatCustomer";
import ExtraTimeButton from "@/components/ExtraTimeButton";

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
  extra_time_minutes: number;
  extra_time_price: number;
  extra_time_rates: { minutes: 30 | 60; price: number } | null; // 22 Sep 2026: 1 opsi fixed per label produk, bukan lagi {30, 60}
  invoice_notified_at: string | null;
  invoice: { file_url: string; created_at: string } | null;
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
    router.push("/pesan");
  }

  async function handleLogout() {
    await fetch("/api/customer/logout", { method: "POST" });
    setCustomer(null);
    setOrders(null);
  }

  // Dipanggil ExtraTimeButton setelah berhasil menambah waktu -- update
  // state lokal langsung dari order terbaru yang dibalikkan API (tidak
  // perlu fetch ulang seluruh riwayat).
  function handleExtraTimeSuccess(updatedOrder: RiwayatOrder) {
    setOrders((prev) =>
      prev ? prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)) : prev
    );
  }

  return (
    <>
      <Header />
      <section className="bg-bay-deep">
        <div className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
        <p className="eyebrow font-mono text-xs uppercase text-bridge">AkunKU &middot; Riwayat Pesanan</p>
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
            <ProfilKlien customer={customer} onLogout={handleLogout} onUpdated={setCustomer} />

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

                    {o.extra_time_minutes > 0 && (
                      <p className="mt-1 text-xs font-medium text-bridge">
                        ⏱️ Sudah ditambah waktu +{o.extra_time_minutes} menit (
                        {formatRupiah(o.extra_time_price)}) -- jatah tambah waktu pesanan ini sudah
                        terpakai.
                      </p>
                    )}

                    {(o.status === "assigned" || o.status === "working") &&
                      o.extra_time_minutes === 0 &&
                      o.extra_time_rates && (
                        <ExtraTimeButton
                          orderId={o.id}
                          rates={o.extra_time_rates}
                          onSuccess={handleExtraTimeSuccess}
                        />
                      )}

                    {o.status === "completed" && o.invoice && (
                      <div className="mt-3 rounded-lg border border-wa/30 bg-wa/10 px-3 py-2">
                        <p className="text-xs text-white/70">
                          🧾 Invoice pembayaran sudah terbit
                          {o.invoice_notified_at ? " & terkirim ke chat/WhatsApp Anda" : ""}.
                        </p>
                        <a
                          href={o.invoice.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-wa underline"
                        >
                          Unduh Invoice Pembayaran
                        </a>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => pesanLagi(o)}
                        className="rounded-full bg-wa px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                      >
                        Pesan Lagi
                      </button>
                    </div>
                    {(o.status === "assigned" || o.status === "working" || o.status === "completed") && (
                      <OrderChatCustomer orderId={o.id} customerName={customer.name} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </section>
      <Footer />
    </>
  );
}
