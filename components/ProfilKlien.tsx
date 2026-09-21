// FILE BARU: components/ProfilKlien.tsx
//
// Dibuat 21 September 2026, dari instruksi Anda langsung: "Akunku selain
// fungsi cek riwayat pesanan, kolom chat in app, dan profil klien (nama
// dan alamat serta kolom foto bisa pakai avatar." -- kartu profil di
// halaman AkunKU (app/riwayat/page.tsx), menggantikan bar kecil
// nama+nomor+tombol Keluar yang sebelumnya ada di situ.
//
// - Foto: BUKAN upload asli -- avatar bulat berisi huruf awal nama (pola
//   sama seperti avatar mitra di MitraShowcase.tsx saat tidak ada foto),
//   sesuai instruksi Anda "kolom foto bisa pakai avatar". Kalau nanti mau
//   upload foto sungguhan, tinggal tambah nanti (pola storage bucket
//   sudah ada, dipakai untuk foto mitra).
// - Nama & alamat bisa diedit langsung di kartu ini (tombol "Ubah"),
//   disimpan lewat PATCH /api/customer/profile (baru). Nomor WA SENGAJA
//   tidak bisa diubah di sini -- itu identitas login pelanggan.

"use client";

import { useState } from "react";
import type { SessionCustomer } from "./CustomerAuthPanel";

export default function ProfilKlien({
  customer,
  onLogout,
  onUpdated,
}: {
  customer: SessionCustomer;
  onLogout: () => void;
  onUpdated: (customer: SessionCustomer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nama, setNama] = useState(customer.name);
  const [alamat, setAlamat] = useState(customer.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const initial = customer.name?.charAt(0)?.toUpperCase() ?? "?";

  function startEdit() {
    setNama(customer.name);
    setAlamat(customer.address ?? "");
    setError("");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, alamat }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan, coba lagi.");
        return;
      }
      onUpdated(data.customer);
      setEditing(false);
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-card border border-white/15 bg-white/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bridge font-display text-xl font-bold text-ink">
          {initial}
        </div>

        {!editing ? (
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold text-white">{customer.name}</p>
            <p className="text-xs text-white/50">{customer.phone}</p>
            <p className="mt-2 text-sm text-white/70">
              {customer.address ? (
                customer.address
              ) : (
                <span className="text-white/40">Alamat belum diisi.</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startEdit}
                className="text-xs font-semibold text-bridge underline"
              >
                Ubah Profil
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-medium text-white/50 underline"
              >
                Keluar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="min-w-0 flex-1 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">Nama</label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">Alamat</label>
              <textarea
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                rows={2}
                placeholder="Jl. ... , Kota Palu"
                className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
              />
            </div>
            <p className="text-xs text-white/40">Nomor WA: {customer.phone} (tidak bisa diubah di sini)</p>

            {error && <p className="text-xs text-red-300">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-wa px-5 py-2 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
              >
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/70"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
