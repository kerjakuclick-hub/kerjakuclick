// FILE BARU: components/ExtraTimeButton.tsx
//
// Bagian client-facing dari fitur "Tambah Waktu Kerja" (lihat catatan
// lengkap di app/api/customer/orders/[id]/extra-time/route.ts &
// lib/services.ts getExtraTimePrice()). Dipasang di app/riwayat/page.tsx,
// muncul di kartu pesanan yang:
//   - statusnya assigned/working (sudah ada mitra, belum selesai),
//   - jasanya didukung skema tambah waktu (`extra_time_rates` dari
//     app/api/customer/riwayat/route.ts tidak null -- rate ini sekarang
//     dihitung SERVER-SIDE karena tergantung tier mitra, bukan cuma
//     service_type, lihat catatan di kedua file itu),
//   - belum pernah ditambah waktu sebelumnya (extra_time_minutes === 0).
// (Ketiga syarat itu DIFILTER di app/riwayat/page.tsx sebelum komponen ini
// dirender -- endpoint di server tetap validasi ulang semuanya sebagai
// pertahanan utama, komponen ini murni UI.)
//
// Alur: klien pilih 30 atau 60 menit -> konfirmasi harga (langkah kedua,
// supaya tidak kepencet tidak sengaja karena ini nambah tagihan) -> POST
// ke /api/customer/orders/[id]/extra-time -> sukses -> onSuccess(order)
// dipanggil supaya halaman induk update state lokal tanpa perlu reload.

"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/services";

type ExtraTimeRates = { 30: number; 60: number };

export default function ExtraTimeButton({
  orderId,
  rates,
  onSuccess,
}: {
  orderId: number;
  rates: ExtraTimeRates;
  onSuccess: (updatedOrder: any) => void;
}) {
  const [pilihan, setPilihan] = useState<30 | 60 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function konfirmasi() {
    if (!pilihan) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/extra-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: pilihan }),
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

  if (pilihan) {
    return (
      <div className="mt-3 rounded-lg border border-bridge/40 bg-bridge/10 p-3">
        <p className="text-sm text-white/85">
          Tambah <span className="font-semibold">{pilihan} menit</span> — biaya tambahan{" "}
          <span className="font-semibold">{formatRupiah(rates[pilihan])}</span>. Ini hanya bisa
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
              setPilihan(null);
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
        onClick={() => setPilihan(30)}
        className="rounded-full border border-bridge/50 px-4 py-1.5 text-xs font-semibold text-bridge transition hover:bg-bridge/10"
      >
        ⏱️ Tambah 30 Menit (+{formatRupiah(rates[30])})
      </button>
      <button
        onClick={() => setPilihan(60)}
        className="rounded-full border border-bridge/50 px-4 py-1.5 text-xs font-semibold text-bridge transition hover:bg-bridge/10"
      >
        ⏱️ Tambah 60 Menit (+{formatRupiah(rates[60])})
      </button>
    </div>
  );
}
