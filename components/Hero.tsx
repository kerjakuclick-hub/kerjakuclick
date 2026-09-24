// GANTI ISI components/Hero.tsx Anda dengan file ini.
//
// REVISI (24 September 2026) -- desain hero terbaru (desktop + mobile):
//   - Background: spotlight teal lembut di tengah yang memudar ke hitam
//     (class `.hero-spotlight` di app/globals.css). Grid tipis & garis
//     diagonal kuning dari versi sebelumnya TIDAK dipakai lagi di sini
//     (class lama `.hero-diagonal` tetap ada di globals.css, tidak dihapus).
//   - Kiri: logo lockup putih (logo-lockup-footer.png), di tengah kolom.
//   - Kanan: FRAME bergaris tipis yang memanjang sampai dasar hero. Di
//     dalamnya headline 3 baris rata KIRI, semuanya putih (aksen Bay di
//     "Bikin Hidup" dihapus sesuai desain baru), subheadline warna gradien
//     cyan-lavender, lalu panah ke bawah + tombol "Pesan Sekarang" di pojok
//     kanan bawah frame.
//   - Mobile: logo di atas (tengah), frame di bawahnya -- sama seperti
//     tampilan handphone di desain.
//   - Tipografi: headline Inter 800 dengan tracking rapat (meniru huruf
//     tebal-rapat di desain), subheadline & tombol Jost (geometris, mirip
//     font Canva di desain). Keduanya di-load LOKAL di file ini lewat
//     next/font, jadi app/layout.tsx & tailwind.config.ts tidak berubah.
//   - Link tombol tetap ke /pesan, sama seperti sebelumnya.

import Link from "next/link";
import { Inter, Jost } from "next/font/google";

const heroHeadline = Inter({
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

const heroAccent = Jost({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

// Tinggi header = py-3 (24px) + ikon h-10 (40px) = 64px.
// Hero mengisi sisa layar pertama supaya frame kanan terlihat utuh.
export default function Hero() {
  return (
    <section className="hero-spotlight relative overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100svh-64px)] max-w-[1200px] grid-rows-[auto_1fr] gap-8 px-3 pb-1.5 pt-10 sm:px-6 md:grid-cols-2 md:grid-rows-1 md:gap-6 md:pt-16">
        {/* KIRI: logo lockup */}
        <div className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-lockup-footer.png"
            alt="kerjaku.click"
            width={900}
            height={275}
            className="h-auto w-48 sm:w-56 md:w-[min(300px,75%)]"
          />
        </div>

        {/* KANAN: frame berisi headline, subheadline, panah & CTA */}
        <div className="flex flex-col border border-white/70 px-6 pb-6 pt-8 sm:px-8 md:px-[12%] md:pb-12 md:pt-[9%]">
          <h1
            className={`${heroHeadline.className} text-[2.5rem] leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.55)] sm:text-5xl md:text-[clamp(3rem,4.6vw,4.4rem)]`}
          >
            Solusi Praktis
            <br />
            Bikin Hidup
            <br />
            Bernilai
          </h1>

          <p
            className={`${heroAccent.className} mt-8 max-w-[24rem] bg-gradient-to-r from-[#A9EEE0] to-[#B7C3FF] bg-clip-text text-[0.95rem] leading-snug text-transparent sm:text-base md:mt-14 md:text-[1.2rem]`}
          >
            Setrika, bersiin rumah, dan les privat&mdash;
            <br />
            diurus dalam <span className="ml-1 font-semibold">SEKALI KLIK!</span>
          </p>

          <div className="mt-auto flex flex-col items-end pt-10">
            <svg
              aria-hidden="true"
              viewBox="0 0 40 52"
              fill="none"
              className="mb-4 mr-8 h-10 w-8 text-white md:mb-5 md:mr-10 md:h-[4.5rem] md:w-14"
            >
              <path
                d="M20 1V50M2 32L20 50L38 32"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <Link
              href="/pesan"
              className={`${heroAccent.className} inline-block rounded-full bg-bridge px-7 py-2.5 text-center text-sm font-semibold text-ink shadow-[0_8px_24px_-10px_rgba(245,179,36,0.6)] transition hover:brightness-105 md:px-12 md:py-4 md:text-lg`}
            >
              Pesan Sekarang
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
