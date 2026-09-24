// GANTI ISI components/Hero.tsx Anda dengan file ini.
//
// REVISI (25 September 2026) -- desain hero terbaru + aset BRANDKIT:
//   - Background: gambar resmi BRANDKIT/backgroundkerjaku.png (spotlight
//     teal + aksen diagonal + logo putih di kanan SUDAH menyatu di gambar).
//     Dikonversi ke public/hero-bg.webp (desktop, 2560x1440) dan
//     public/hero-bg-mobile.webp (potongan portrait tanpa logo, 960x1500)
//     -- lihat class `.hero-brand` di app/globals.css.
//   - Karena logo sudah ada di background (desktop) dan di header, Hero
//     tidak lagi memasang <img> logo sendiri.
//   - Frame bergaris tipis sekarang di KIRI. Isinya: headline KAPITAL font
//     condensed (Bebas Neue), subheadline kapital kecil ber-tracking lebar
//     dengan "SEKALI KLIK!" tebal warna cyan, lalu panah + tombol
//     "Pesan Sekarang" rata kiri di bawah frame.
//   - Mobile & tablet (< 1024px): frame di tengah layar, background versi
//     potongan portrait (sama seperti tampilan HP di desain).
//   - Font Bebas Neue & Montserrat di-load LOKAL di file ini lewat
//     next/font, jadi app/layout.tsx & tailwind.config.ts tidak berubah.
//   - Tombol tetap link ke /pesan.

import Link from "next/link";
import { Bebas_Neue, Montserrat } from "next/font/google";

const heroDisplay = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const heroText = Montserrat({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

// Tinggi header = h-16 (64px). Hero mengisi sisa layar pertama.
export default function Hero() {
  return (
    <section className="hero-brand relative flex min-h-[calc(100svh-64px)] overflow-hidden">
      <div className="flex w-full px-3 py-20 sm:px-8 sm:py-24 lg:py-14 lg:pl-[14.5%] lg:pr-0">
        <div className="flex w-full flex-col border border-white/60 px-4 pb-10 pt-12 sm:px-8 lg:w-[40%] lg:min-w-[380px] lg:max-w-[560px] lg:px-[2.2rem] lg:pb-14 lg:pt-14 xl:w-[36%]">
          <h1
            className={`${heroDisplay.className} text-[2.6rem] leading-[0.98] tracking-[0.02em] text-white [-webkit-text-stroke:0.02em_#fff] sm:text-6xl lg:text-[clamp(3rem,3.6vw,4.25rem)]`}
          >
            Solusi
            <br />
            Praktis
            <br />
            Bikin Hidup
            <br />
            Bernilai
          </h1>

          <p
            className={`${heroText.className} mt-6 text-[0.6rem] font-medium uppercase leading-[1.6] tracking-[0.14em] text-white/85 sm:text-xs lg:mt-10 lg:text-[0.72rem]`}
          >
            Setrika, bersiin rumah, dan les privat&mdash;
            <br />
            diurus dalam{" "}
            <span className="font-bold text-[#23A3CF]">Sekali Klik!</span>
          </p>

          <div className="mt-auto flex flex-col items-start pt-12">
            <svg
              aria-hidden="true"
              viewBox="0 0 40 50"
              fill="none"
              className="mb-4 ml-1.5 h-9 w-7 text-white lg:h-12 lg:w-10"
            >
              <path
                d="M20 1V48M2 30L20 48L38 30"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <Link
              href="/pesan"
              className={`${heroText.className} inline-block rounded-full bg-bridge px-4 py-1.5 text-center text-xs font-bold text-ink shadow-[0_8px_24px_-10px_rgba(245,179,36,0.6)] transition hover:brightness-105 lg:px-5 lg:py-2 lg:text-sm`}
            >
              Pesan Sekarang
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
