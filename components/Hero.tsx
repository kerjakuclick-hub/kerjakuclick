// GANTI ISI components/Hero.tsx Anda dengan file ini.
//
// REVISI (25 September 2026, "ikuti secara presisi gambar terlampir"):
//   - Frame bergaris DIHAPUS. Konten sekarang langsung di atas background,
//     rata kiri, di tengah secara vertikal.
//   - Headline 5 baris: SOLUSI / PRAKTIS / BIKIN / HIDUP / BERNILAI
//     (Bebas Neue, besar). Ukuran font mengikuti lebar & tinggi layar
//     supaya proporsinya sama dengan desain di desktop maupun HP.
//   - Subheadline kapital kecil, "SEKALI KLIK!." warna cyan -- ejaan
//     (termasuk titik setelah tanda seru) persis seperti desain.
//   - Tombol "Pesan Sekarang" sekarang KOTAK (sudut tidak membulat).
//   - Background tetap aset BRANDKIT (class `.hero-brand` di globals.css):
//     desktop dengan logo putih di kanan, HP versi potongan tanpa logo.
//   - Desktop: konten mulai ~17% dari tepi kiri (desain terbaru); HP 6%.
//   - Proporsi diukur dari screenshot layar penuh desain: headline jarak
//     antarbaris rapat (0.78), ukuran ~5.3vw desktop / ~22vw HP (dibatasi
//     tinggi layar), jarak ke panah lebih lega di desktop.
//   - Font Bebas Neue & Montserrat di-load LOKAL lewat next/font.
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

// Tinggi hero = 1 layar penuh dikurangi header 56px (h-14) -- diatur di
// class `.hero-brand` (app/globals.css), sama di desktop & HP, jadi saat
// website dibuka cuma Header + Hero yang terlihat; section berikutnya
// baru muncul setelah di-scroll.
export default function Hero() {
  return (
    <section className="hero-brand relative flex items-center overflow-hidden">
      <div className="w-full px-[6%] py-10 lg:py-12 lg:pl-[17.3%]">
        <h1
          className={`${heroDisplay.className} text-[min(22vw,11svh)] leading-[0.78] tracking-[0.05em] text-white [-webkit-text-stroke:0.015em_#fff] lg:text-[min(5.3vw,11.9svh)]`}
        >
          Solusi
          <br />
          Praktis
          <br />
          Bikin
          <br />
          Hidup
          <br />
          Bernilai
        </h1>

        <p
          className={`${heroText.className} mt-6 text-[9px] font-medium uppercase leading-[1.65] tracking-[0.12em] text-white/85 sm:text-[11px] lg:mt-10`}
        >
          Setrika, bersiin rumah, dan les privat&mdash;
          <br />
          diurus dalam{" "}
          <span className="font-bold text-[#23A3CF]">Sekali Klik!.</span>
        </p>

        <svg
          aria-hidden="true"
          viewBox="0 0 40 46"
          fill="none"
          className="mb-3 ml-0.5 mt-3 h-9 w-8 text-white lg:mb-3.5 lg:mt-12 lg:h-12 lg:w-10"
        >
          <path
            d="M20 1V44M2 26L20 44L38 26"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Link
          href="/pesan"
          className={`${heroText.className} inline-block bg-bridge px-3.5 py-1.5 text-[10px] font-bold text-ink transition hover:brightness-105 sm:text-xs lg:px-5 lg:py-2 lg:text-[13px]`}
        >
          Pesan Sekarang
        </Link>
      </div>
    </section>
  );
}
