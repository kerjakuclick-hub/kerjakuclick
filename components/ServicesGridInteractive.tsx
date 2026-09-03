// FILE BARU: components/ServicesGridInteractive.tsx
//
// Bagian interaktif dari "Layanan Unggulan" -- dipisah dari
// ServicesGrid.tsx (Server Component yang fetch gambar dari Supabase)
// karena modal & klik butuh state di client. ServicesGrid.tsx memanggil
// komponen ini sambil mengoper data kartu yang gambarnya sudah di-resolve.
//
// Klik kartu (yang TIDAK "Coming Soon") -> buka modal berisi daftar
// varian jasa kategori itu (Fast/PRO, harga, unit, durasi -- diambil dari
// lib/services.ts, satu sumber data yang sama dipakai dropdown "Pilihan
// Jasa" di form pemesanan). Tombol "Pesan Sekarang" di tiap varian
// menutup modal, scroll ke form pemesanan (#pesan), dan mengirim event
// "kerjaku:select-service" supaya OrderForm.tsx otomatis memilih jasa itu
// di dropdown-nya (lihat listener event di OrderForm.tsx).

"use client";

import { useState } from "react";
import { services as serviceVariants, formatRupiah } from "@/lib/services";

export type ServiceCardData = {
  slug: string;
  name: string;
  desc: string;
  priceFrom: string;
  duration: string;
  badge?: string;
  gradient: string;
  icon: string;
  serviceCategory: string;
  comingSoon?: boolean;
  imageUrl?: string | null;
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
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((s) => {
          const clickable = !s.comingSoon;
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
              className={`bg-white rounded-xl overflow-hidden border border-[#12202A]/5 shadow-[0px_4px_20px_rgba(18,32,42,0.05)] transition-all ${
                clickable
                  ? "cursor-pointer hover:shadow-[0px_8px_30px_rgba(18,32,42,0.08)] hover:-translate-y-0.5"
                  : ""
              }`}
            >
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt={s.name} className="h-40 w-full object-cover" />
              ) : (
                <div
                  className={`h-40 w-full bg-gradient-to-br ${s.gradient} flex items-center justify-center text-5xl`}
                >
                  {s.icon}
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-lg text-[#12202A]">
                    {s.name}
                  </h3>
                  {s.badge && (
                    <span className="bg-[#1D6F8C]/10 text-[#1D6F8C] text-[10px] font-bold px-2 py-1 rounded uppercase">
                      {s.badge}
                    </span>
                  )}
                </div>
                <p className="text-[#3f484d] text-sm">{s.desc}</p>
                <div className="flex justify-between items-center pt-3 border-t border-[#dfe3e0]">
                  <div>
                    <p className="text-xs text-[#3f484d] uppercase font-bold tracking-wide">
                      Mulai dari
                    </p>
                    <p className="font-semibold text-[#12202A]">{s.priceFrom}</p>
                  </div>
                  <span className="text-xs text-[#3f484d]">{s.duration}</span>
                </div>
                {clickable && (
                  <p className="pt-1 text-xs font-medium text-[#1D6F8C]">Lihat detail &amp; harga →</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[#12202A]">
                {activeCard.name}
              </h3>
              <button
                type="button"
                onClick={() => setOpenCategory(null)}
                aria-label="Tutup"
                className="shrink-0 rounded-full p-1 text-[#3f484d] hover:bg-[#12202A]/5"
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
            <p className="mb-5 text-sm text-[#3f484d]">{activeCard.desc}</p>

            <div className="space-y-3">
              {variants.map((v) => (
                <div key={v.id} className="rounded-lg border border-[#dfe3e0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#12202A]">{v.name}</p>
                      <p className="mt-0.5 text-xs text-[#3f484d]">
                        {v.unit} · {v.duration}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-[#12202A]">
                      {formatRupiah(v.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePesanSekarang(v.name)}
                    className="mt-3 w-full rounded-full bg-[#F5B324] px-4 py-2 text-sm font-semibold text-[#12202A] transition hover:brightness-105"
                  >
                    Pesan Sekarang
                  </button>
                </div>
              ))}
              {variants.length === 0 && (
                <p className="text-sm text-[#3f484d]">Belum ada varian jasa untuk kategori ini.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
