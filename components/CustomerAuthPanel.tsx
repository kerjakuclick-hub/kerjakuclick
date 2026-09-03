// FILE BARU: components/CustomerAuthPanel.tsx
//
// Panel daftar/masuk pelanggan (nama + no WA + PIN 4 digit) -- dipakai
// bersama oleh OrderForm.tsx (harus login dulu sebelum bisa isi form
// pesanan) dan app/riwayat/page.tsx (harus login dulu sebelum lihat
// riwayat). Setelah berhasil, panggil onAuthenticated(customer) supaya
// komponen pemanggil tahu siapa yang login.

"use client";

import { useState } from "react";

export type SessionCustomer = { id: string; name: string; phone: string };

export default function CustomerAuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: (customer: SessionCustomer) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "register" && pin !== confirmPin) {
      setError("Konfirmasi PIN tidak cocok.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/customer/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { noHp, pin } : { nama, noHp, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memproses, coba lagi.");
        // Nomor sudah terdaftar -- geser otomatis ke form Masuk.
        if (mode === "register" && res.status === 409) setMode("login");
        return;
      }
      onAuthenticated(data.customer);
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-white/15 bg-white/5 p-6">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            mode === "login" ? "bg-bridge text-ink" : "text-white/60 hover:text-white"
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            mode === "register" ? "bg-bridge text-ink" : "text-white/60 hover:text-white"
          }`}
        >
          Daftar Baru
        </button>
      </div>

      <p className="mb-4 text-sm text-white/70">
        {mode === "login"
          ? "Masuk dengan nomor WA & PIN yang sudah didaftarkan."
          : "Daftar sekali saja — cukup nama, nomor WA, dan PIN 4 angka. Tidak perlu email/kata sandi rumit."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama Lengkap"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
          />
        )}
        <input
          value={noHp}
          onChange={(e) => setNoHp(e.target.value)}
          placeholder="Nomor WA (0812xxxxxxxx)"
          inputMode="tel"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
        />
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="PIN 4 Angka"
          inputMode="numeric"
          type="password"
          maxLength={4}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm tracking-[0.5em] text-white placeholder:text-white/40 placeholder:tracking-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
        />
        {mode === "register" && (
          <input
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Ulangi PIN"
            inputMode="numeric"
            type="password"
            maxLength={4}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm tracking-[0.5em] text-white placeholder:text-white/40 placeholder:tracking-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
          />
        )}

        {error && <p className="text-xs text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-wa px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar & Lanjut"}
        </button>
      </form>
    </div>
  );
}
