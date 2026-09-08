// FILE BARU: components/mitra/DigitalIdCard.tsx
//
// ID Card digital yang bisa ditunjukkan mitra ke klien lewat HP kalau lupa
// bawa ID card fisik resmi. Ada tombol "Tampilkan Layar Penuh" supaya
// tampilannya besar & jelas saat ditunjukkan langsung ke klien.

"use client";

import { useState } from "react";

interface MitraProfileForCard {
  id: string;
  name: string;
  photo_url: string | null;
  status: string | null;
  skill_category: string[] | null;
  rating: number | null;
}

function IdCardContent({ mitra, large = false }: { mitra: MitraProfileForCard; large?: boolean }) {
  const skills = Array.isArray(mitra.skill_category) ? mitra.skill_category : [];
  const shortId = `KRJ-${mitra.id.slice(0, 8).toUpperCase()}`;

  return (
    <div
      className={`mx-auto overflow-hidden rounded-2xl border-2 border-bay-deep/20 bg-white shadow-lg ${
        large ? "w-full max-w-sm" : "max-w-xs"
      }`}
    >
      <div className="flex items-center justify-between bg-bay-deep px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">
          ID Card Mitra Resmi
        </span>
        <span className="font-display text-xs font-bold text-bridge">kerjaku.click</span>
      </div>

      <div className="flex flex-col items-center px-6 py-6">
        <div
          className={`overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ${
            large ? "h-32 w-32" : "h-20 w-20"
          }`}
        >
          {mitra.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mitra.photo_url} alt={mitra.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-ink/40">
              {mitra.name?.charAt(0) ?? "M"}
            </div>
          )}
        </div>

        <h3 className={`mt-3 text-center font-display font-bold text-ink ${large ? "text-2xl" : "text-lg"}`}>
          {mitra.name}
        </h3>

        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-bay-deep/10 px-2.5 py-0.5 text-[11px] font-medium text-bay-deep"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {mitra.rating != null && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-bridge">★</span>
            <span className="text-sm font-semibold text-ink">{mitra.rating}</span>
          </div>
        )}

        <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-paper px-3 py-2">
          <div>
            <p className="text-[9px] font-bold uppercase text-ink/40">ID Mitra</p>
            <p className="font-mono text-xs font-semibold text-ink">{shortId}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase text-ink/40">Status</p>
            <p className="text-xs font-semibold capitalize text-ink">{mitra.status ?? "training"}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-wa">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" />
          </svg>
          <span className="text-xs font-semibold">Mitra Terverifikasi</span>
        </div>
      </div>
    </div>
  );
}

export default function DigitalIdCard({ mitra }: { mitra: MitraProfileForCard }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">ID Card Digital</h2>
          <p className="mt-1 text-sm text-ink/60">
            Lupa bawa ID card fisik? Tunjukkan ini ke klien lewat HP Anda.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <IdCardContent mitra={mitra} />
      </div>

      <button
        onClick={() => setFullscreen(true)}
        className="mt-4 w-full rounded-lg bg-bay-deep py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Tampilkan Layar Penuh ke Klien
      </button>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setFullscreen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full">
            <IdCardContent mitra={mitra} large />
            <button
              onClick={() => setFullscreen(false)}
              className="mx-auto mt-6 block rounded-full border border-white/40 px-6 py-2 text-sm font-medium text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
