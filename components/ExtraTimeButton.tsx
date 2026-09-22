// FILE BARU: components/ExtraTimeButton.tsx
//
// Bagian client-facing dari fitur "Tambah Waktu Kerja" (lihat catatan
// lengkap di app/api/customer/orders/[id]/extra-time/route.ts &
// lib/services.ts getExtraTimePrice()). Dipasang di app/riwayat/page.tsx,
// muncul di kartu pesanan yang:
//   - statusnya assigned/working (sudah ada mitra, belum selesai),
//   - jasanya didukung skema tambah waktu (`extra_time_rates` dari
//     app/api/customer/riwayat/route.ts tidak null -- rate ini dihitung
//     SERVER-SIDE karena tergantung tier loyalty mitra, bukan cuma
//     service_type, lihat catatan di kedua file itu),
//   - belum pernah ditambah waktu sebelumnya (extra_time_minutes === 0).
// (Ketiga syarat itu DIFILTER di app/riwayat/page.tsx sebelum komponen ini
// dirender -- endpoint di server tetap validasi ulang semuanya sebagai
// pertahanan utama, komponen ini murni UI.)
//
// PERUBAHAN FINAL (22 September 2026) -- dokumen "Logika Hitung Harga
// Tambah Waktu": durasi tambah waktu SEKARANG FIXED per label produk (Fast
// = +30 menit, PRO = +60 menit) -- klien TIDAK LAGI memilih antara 30 atau
// 60 menit, cuma ada SATU tombol dengan durasi & harga yang sudah pasti utk
// pesanan ybs (`rates` sekarang `{ minutes, price }`, bukan lagi `{30, 60}`
// dua opsi sekaligus).
//
// Alur: klien klik tombol tambah waktu -> konfirmasi harga (langkah kedua,
// supaya tidak kepencet tidak sengaja karena ini nambah tagihan) -> POST
// ke /api/customer/orders/[id]/extra-time -> sukses -> onSuccess(order)
// dipanggil supaya halaman induk update state lokal tanpa perlu reload.

"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/services";

type ExtraTimeRate = { minutes: 30 | 60; price: number };

export default function ExtraTimeButton({
  orderId,
  rates,
  onSuccess,
}: {
  orderId: number;
  rates: ExtraTimeRate;
  onSuccess: (updatedOrder: any) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function konfirmasi() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/extra-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: rates.minutes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah waktu.");
        setLoading(false);
        return;
      }
      onSuccess(data.order);
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-3 rounded-lg border border-bridge/40 bg-bridge/10 p-3">
        <p className="text-sm text-white/85">
          Tambah <span className="font-semibold">{rates.minutes} menit</span> — biaya tambahan{" "}
          <span className="font-semibold">{formatRupiah(rates.price)}</span>. Ini hanya bisa
          diajukan sekali per pesanan. Lanjutkan?
        </p>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={konfirmasi}
            disabled={loading}
            className="rounded-full bg-wa px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Ya, Tambah Waktu"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError("");
            }}
            disabled={loading}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-white/60">Butuh waktu lebih?</span>
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-bridge/50 px-4 py-1.5 text-xs font-semibold text-bridge transition hover:bg-bridge/10"
      >
        ⏱️ Tambah {rates.minutes} Menit (+{formatRupiah(rates.price)})
      </button>
    </div>
  );
}
