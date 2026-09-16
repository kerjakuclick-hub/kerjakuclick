// BARU — components/mitra/AvailabilityToggle.tsx
//
// Toggle "Siap Menerima Tugas" / "Sedang Tidak Tersedia" di Dasbor Mitra.
// Saat dimatikan, mitra otomatis tidak akan muncul lagi di daftar "Pilih
// mitra eligible" admin (lihat migrasi 023, eligible_mitra_for_order).
// Menyalakan kembali otomatis mengembalikan mitra ke daftar tersebut.

"use client";

import { useState } from "react";

const QUICK_REASONS = ["Sedang sakit", "Ada urusan pribadi/keluarga", "Sedang istirahat", "Kendala lain"];

export default function AvailabilityToggle({
  initialIsAvailable,
  initialReason,
  initialSince,
}: {
  initialIsAvailable: boolean;
  initialReason: string | null;
  initialSince: string | null;
}) {
  const [isAvailable, setIsAvailable] = useState(initialIsAvailable);
  const [reason, setReason] = useState<string | null>(initialReason);
  const [since, setSince] = useState<string | null>(initialSince);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextAvailable: boolean, chosenReason?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mitra/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextAvailable, reason: chosenReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah status.");
        return;
      }
      setIsAvailable(data.profile.is_available);
      setReason(data.profile.unavailable_reason);
      setSince(data.profile.unavailable_since);
      setShowReasonPicker(false);
      setCustomReason("");
    } catch {
      setError("Gagal mengubah status. Periksa koneksi internet Anda.");
    } finally {
      setBusy(false);
    }
  }

  function handleToggleOn() {
    submit(true);
  }

  return (
    <div
      className={`rounded-card border p-5 shadow-card ${
        isAvailable ? "border-line bg-white" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-ink/50">Status Ketersediaan</p>
          <p
            className={`mt-1 font-display text-lg font-semibold ${
              isAvailable ? "text-wa" : "text-red-600"
            }`}
          >
            {isAvailable ? "Siap Menerima Tugas" : "Sedang Tidak Tersedia"}
          </p>
          {!isAvailable && reason && (
            <p className="mt-1 text-sm text-ink/70">
              Alasan: {reason}
              {since && (
                <>
                  {" "}
                  — sejak{" "}
                  {new Date(since).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </>
              )}
            </p>
          )}
          {!isAvailable && (
            <p className="mt-1 text-xs text-red-600">
              Anda tidak akan ditugaskan pesanan baru oleh admin selama status ini menyala.
            </p>
          )}
        </div>

        {isAvailable ? (
          <button
            onClick={() => setShowReasonPicker(true)}
            disabled={busy}
            className="rounded-full bg-red-100 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-200 disabled:opacity-60"
          >
            Tandai Tidak Tersedia
          </button>
        ) : (
          <button
            onClick={handleToggleOn}
            disabled={busy}
            className="rounded-full bg-wa px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Menyimpan..." : "Saya Sudah Siap Lagi"}
          </button>
        )}
      </div>

      {showReasonPicker && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Kenapa Anda tidak tersedia sekarang?</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => submit(false, r)}
                disabled={busy}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:border-bay-deep hover:text-bay-deep disabled:opacity-60"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Atau tulis alasan lain..."
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
            />
            <button
              onClick={() => submit(false, customReason)}
              disabled={busy || !customReason.trim()}
              className="shrink-0 rounded-lg bg-bay-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Simpan
            </button>
          </div>
          <button onClick={() => setShowReasonPicker(false)} className="text-xs text-ink/50 underline">
            Batal
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
