// app/reset-pin/page.tsx
//
// Halaman untuk pelanggan menyelesaikan reset PIN setelah menerima kode OTP
// lewat WhatsApp (dikirim dari webhook Fonnte saat mereka chat "reset pin"
// ke CS). Alurnya SATU LANGKAH di halaman ini: masukkan nomor WA + OTP +
// PIN baru sekaligus — OTP-nya sendiri sudah diminta lewat WA, bukan dari
// halaman ini.
//
// Setelah berhasil, API /api/customer/reset-pin/confirm otomatis membuatkan
// sesi baru (auto-login) dan men-set cookie-nya, jadi kita tinggal redirect
// ke halaman utama pelanggan.

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// Sesuaikan kalau halaman utama pelanggan setelah login bukan "/" —
// misal "/dashboard" atau "/pesanan-saya".
const REDIRECT_AFTER_SUCCESS = "/";

export default function ResetPinPage() {
  const router = useRouter();

  const [noHp, setNoHp] = useState("");
  const [otp, setOtp] = useState("");
  const [pinBaru, setPinBaru] = useState("");
  const [konfirmasiPin, setKonfirmasiPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pinBaru)) {
      setError("PIN baru harus 4 angka.");
      return;
    }
    if (pinBaru !== konfirmasiPin) {
      setError("Konfirmasi PIN tidak sama dengan PIN baru.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Kode OTP harus 6 angka (cek WhatsApp Anda).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/reset-pin/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noHp, otp, pinBaru }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan, coba lagi.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Cookie sesi sudah di-set oleh server (auto-login) -> arahkan ke halaman utama.
      setTimeout(() => router.push(REDIRECT_AFTER_SUCCESS), 1200);
    } catch {
      setError("Gagal terhubung ke server. Coba lagi sebentar.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#EEF2EE] px-4">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-sm p-8">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-[#12202A] mb-2">
            PIN berhasil diganti!
          </h1>
          <p className="text-[#12202A]/70">Mengarahkan Anda masuk ke akun…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF2EE] px-4 py-12">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-[#12202A] mb-1">Reset PIN</h1>
        <p className="text-sm text-[#12202A]/70 mb-6">
          Belum punya kode OTP? Chat{" "}
          <span className="font-semibold">&quot;reset pin&quot;</span> ke CS
          kerjaku.click di WhatsApp dulu untuk menerima kodenya.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#12202A] mb-1">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="0812xxxxxxx"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              required
              className="w-full rounded-lg border border-[#12202A]/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1D6F8C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#12202A] mb-1">
              Kode OTP (6 digit, dari WhatsApp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              className="w-full rounded-lg border border-[#12202A]/20 px-3 py-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#1D6F8C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#12202A] mb-1">
              PIN Baru (4 digit)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pinBaru}
              onChange={(e) => setPinBaru(e.target.value.replace(/\D/g, ""))}
              required
              className="w-full rounded-lg border border-[#12202A]/20 px-3 py-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#1D6F8C]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#12202A] mb-1">
              Konfirmasi PIN Baru
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={konfirmasiPin}
              onChange={(e) => setKonfirmasiPin(e.target.value.replace(/\D/g, ""))}
              required
              className="w-full rounded-lg border border-[#12202A]/20 px-3 py-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#1D6F8C]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#F5B324] text-[#12202A] font-semibold py-2.5 hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Memproses…" : "Ganti PIN"}
          </button>
        </form>
      </div>
    </main>
  );
}
