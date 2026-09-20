/**
 * Icons.tsx
 * Set ikon monokrom (1 warna, line-icon style) untuk menggantikan emoji
 * berwarna-warni di TrustBar (✓ 💵 📍), Cara Pesan / HowItWorks
 * (📋 💬 🧑‍🔧 ✅), kartu Layanan (🧺 🧹 📚), dan panel "Kenapa Memilih
 * Kerjaku" (🛡️ 😊 💰 🏠).
 *
 * Semua ikon: viewBox 24x24, stroke="currentColor", stroke-width seragam,
 * tanpa fill -- jadi warnanya 100% ikut className (text-color) yang kamu
 * kasih di parent. Tidak ada warna hardcoded di dalam SVG, supaya seluruh
 * set otomatis 1 palet dengan teks di sekitarnya.
 *
 * Pemakaian:
 *   <ShieldCheckIcon className="w-5 h-5 text-white/90" />
 *   <BanknoteIcon className="w-7 h-7 text-ink" />
 *
 * Perubahan (Redesain Premium, 20 September 2026): tambah IronIcon,
 * HomeSparkleIcon, BookOpenIcon (kartu Layanan Unggulan), HeartHandshakeIcon,
 * WalletIcon (panel "Kenapa Memilih Kerjaku"), dan BridgeMotif (siluet
 * Jembatan Kuning Palu -- watermark dekoratif bermerek, pengganti emoji
 * dekoratif generik seperti 🏠 dan blur-blob gradient generik).
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Mitra Terverifikasi */
export function ShieldCheckIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

/** Bayar Tunai Setelah Selesai */
export function BanknoteIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.75" />
      <path d="M6 9.5v0M18 14.5v0" strokeWidth={2.25} />
    </svg>
  );
}

/** Area Kota Palu */
export function MapPinIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

/** Step 1 -- Isi Formulir */
export function ClipboardListIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
    </svg>
  );
}

/** Step 2 -- Pesanan Masuk WA */
export function ChatIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.3-3.5A7.96 7.96 0 0 1 4 12z" />
      <path d="M9 11.5h6M9 14.5h4" />
    </svg>
  );
}

/** Step 3 -- Tugaskan Mitra */
export function UserCheckIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <circle cx="9.5" cy="8" r="3.25" />
      <path d="M3.75 19c.6-3.1 3-5 5.75-5s5.15 1.9 5.75 5" />
      <path d="M16 11l1.5 1.5L21 9" />
    </svg>
  );
}

/** Step 4 -- Mitra Datang */
export function CheckCircleIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.25 12.25l2.5 2.5 5-5.5" />
    </svg>
  );
}

/** Kartu Layanan -- Setrika (setrika listrik dengan garis uap) */
export function IronIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M20 9.5c0-2.5-2-4-5-4H9.5C6 5.5 4 8 4 11.5c0 1.7.6 2.7 1.4 3.3.5.35.6 1 .1 1.35C5 16.5 4.5 17 4.5 18h13c1.5 0 2.5-1.2 2.5-2.6v-2.9c0-1.2-.35-2.2-1-3z" />
      <path d="M8.5 9.5h4" />
      <path d="M10.5 3v1.3M13 3.3v1.3" />
    </svg>
  );
}

/** Kartu Layanan -- Bersihkan Rumah (rumah + kilau kebersihan) */
export function HomeSparkleIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M4.5 11.5 12 5l7.5 6.5" />
      <path d="M6.5 10v8a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-8" />
      <path d="M10 19v-4h4v4" />
      <path d="M18.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
    </svg>
  );
}

/** Kartu Layanan -- Les Private (buku terbuka) */
export function BookOpenIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M12 6.5c-1.3-1-3.2-1.5-5.5-1.5-1 0-1.5.3-1.5 1v11c0 .6.5 1 1.5 1 2.3 0 4.2.5 5.5 1.5" />
      <path d="M12 6.5c1.3-1 3.2-1.5 5.5-1.5 1 0 1.5.3 1.5 1v11c0 .6-.5 1-1.5 1-2.3 0-4.2.5-5.5 1.5" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

/** Panel "Kenapa Memilih Kerjaku" -- Pasti Selesai (jabat tangan/kepuasan) */
export function HeartHandshakeIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M3.5 11.5 7 8l3.2 2.4c.6.45.6 1.3 0 1.75l-.3.25c-.55.4-1.3.35-1.8-.15L7 11" />
      <path d="M20.5 11.5 17 8l-4.8 4c-.55.45-.6 1.25-.15 1.8l3.2 3.9c.5.6 1.4.65 1.95.1l1.3-1.3" />
      <path d="M7 11l3.5 4.2c.5.6 1.4.65 1.95.1" />
      <path d="M3.5 11.5V17M20.5 11.5V17" />
    </svg>
  );
}

/** Panel "Kenapa Memilih Kerjaku" -- Harga Transparan (dompet) */
export function WalletIcon({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V8" />
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M15 14a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" />
    </svg>
  );
}

/**
 * Siluet Jembatan Kuning (landmark Kota Palu) -- watermark dekoratif
 * bermerek, dipakai lewat className="bridge-motif" (lihat app/globals.css,
 * warna #F5B324) sebagai pengganti emoji generik / blur-blob gradient
 * generik. Digambar sebagai garis (stroke), bukan foto, supaya ringan &
 * konsisten dengan gaya ikon lain.
 */
export function BridgeMotif({ className = "w-full h-full", ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 68h180" />
      <path d="M30 68V40M50 68V28M70 68V20M100 68V16M130 68V20M150 68V28M170 68V40" />
      <path d="M10 40c30-24 150-24 180 0" />
      <path d="M10 52c30-18 150-18 180 0" />
    </svg>
  );
}
