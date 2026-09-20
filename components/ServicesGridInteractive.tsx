// GANTI ISI components/ServicesGridInteractive.tsx Anda dengan file ini.
//
// Perubahan: kartu varian di dalam modal (Fast/PRO) sekarang menampilkan
// `v.desc` (deskripsi layanan) dan `v.detilPekerjaan` (daftar detil
// pekerjaan) KALAU field itu ada di lib/services.ts -- untuk sekarang baru
// diisi di Cleaning Fast & Cleaning PRO, jadi ditulis pakai pengecekan
// `v.desc && ...` / `v.detilPekerjaan?.length` supaya varian lain (Setrika,
// Les Private) yang belum diisi tetap tampil normal tanpa bagian ini.
// Tidak ada perubahan pada struktur modal atau event
// "kerjaku:select-service".
//
// Perubahan BARU (20 September 2026) -- migrasi "3 Pilar Layanan": grid
// kartu kategori di atas sekarang cuma 3 kartu (Cuci Kendaraan dihapus
// total dari components/ServicesGrid.tsx), jadi `lg:grid-cols-4` diganti
// `lg:grid-cols-3` supaya baris pertama tidak menyisakan 1 kolom kosong.
//
// REDESAIN PREMIUM (20 September 2026): mengikuti disiplin brand identity
// baru --
//   - `icon` sekarang SLUG ("setrika"/"bersihkan-rumah"/"les-private"),
//     dipetakan lewat SERVICE_ICON_MAP ke ikon custom SVG dari Icons.tsx
//     -- emoji (🧺🧹📚) & field `gradient` (yang pakai warna #1D6F8C, kini
//     eksklusif Form Order) DIHAPUS. Panel ikon sekarang solid Ink dengan
//     aksen Bridge, konsisten dengan bahasa visual TrustBar.
//   - Semua sisa pemakaian #1D6F8C (badge "TERPOPULER", link "Lihat
//     detail") diganti Ink, supaya Bay benar-benar eksklusif untuk
//     OrderForm.tsx.

"use client";

import { useState } from "react";
import { services as serviceVariants, formatRupiah } from "@/lib/services";
import { IronIcon, HomeSparkleIcon, BookOpenIcon } from "./Icons";

export type ServiceCardData = {
  slug: string;
  name: string;
  desc: string;
  priceFrom: string;
  duration: string;
  badge?: string;
  icon: string;
  serviceCategory: string;
  comingSoon?: boolean;
  imageUrl?: string | null;
};

const SERVICE_ICON_MAP: Record<string, typeof IronIcon> = {
  setrika: IronIcon,
  "bersihkan-rumah": HomeSparkleIcon,
  "les-private": BookOpenIcon,
};

export default function ServicesGridInteractive({ services }: { services: ServiceCardData[] }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const activeCard = services.find((s) => s.serviceCategory === openCategory);
  const variants = openCategory
    ? serviceVariants.filter((v) => v.category === openCategory)
    : [];

  function handlePesanSekarang(variantName: string) {
    window.dispatchEvent(
      new CustomEvent("kerjaku:select-service", { detail: { jasa: variantName } })
    );
    setOpenCategory(null);
    document.getElementById("pesan")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const clickable = !s.comingSoon;
          const Icon = SERVICE_ICON_MAP[s.icon];
          return (
            <div
              key={s.slug}
              onClick={clickable ? () => setOpenCategory(s.serviceCategory) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenCategory(s.serviceCategory);
                      }
                    }
                  : undefined
              }
              className={`overflow-hidden rounded-card border border-ink/5 bg-white shadow-card transition-all ${
                clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg" : ""
              }`}
            >
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt={s.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-ink">
                  {Icon && <Icon className="h-12 w-12 text-bridge" strokeWidth={1.4} />}
                </div>
              )}
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">{s.name}</h3>
                  {s.badge && (
                    <span className="rounded bg-bridge/20 px-2 py-1 text-[10px] font-bold uppercase text-ink">
                      {s.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink/60">{s.desc}</p>
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/50">
                      Mulai dari
                    </p>
                    <p className="font-semibold text-ink">{s.priceFrom}</p>
                  </div>
                  <span className="text-xs text-ink/50">{s.duration}</span>
                </div>
                {clickable && (
                  <p className="pt-1 text-xs font-semibold text-ink">Lihat detail &amp; harga →</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setOpenCategory(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Detail jasa ${activeCard.name}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-display text-xl font-bold text-ink">{activeCard.name}</h3>
              <button
                type="button"
                onClick={() => setOpenCategory(null)}
                aria-label="Tutup"
                className="shrink-0 rounded-full p-1 text-ink/60 hover:bg-ink/5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6L18 18M6 18L18 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mb-5 text-sm text-ink/60">{activeCard.desc}</p>

            <div className="space-y-3">
              {variants.map((v) => (
                <div key={v.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{v.name}</p>
                      <p className="mt-0.5 text-xs text-ink/60">
                        {v.unit} · {v.duration}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-ink">
                      {formatRupiah(v.price)}
                    </p>
                  </div>

                  {v.desc && <p className="mt-2 text-xs text-ink/60">{v.desc}</p>}

                  {v.detilPekerjaan && v.detilPekerjaan.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink/60">
                      {v.detilPekerjaan.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePesanSekarang(v.name)}
                    className="mt-3 w-full rounded-full bg-bridge px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-105"
                  >
                    Pesan Sekarang
                  </button>
                </div>
              ))}
              {variants.length === 0 && (
                <p className="text-sm text-ink/60">Belum ada varian jasa untuk kategori ini.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
