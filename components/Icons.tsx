/**
 * Icons.tsx
 * Set ikon monokrom (1 warna, line-icon style) untuk menggantikan emoji
 * berwarna-warni di TrustBar (✓ 💵 📍) dan Cara Pesan / HowItWorks
 * (📋 💬 🧑‍🔧 ✅).
 *
 * Semua ikon: viewBox 24x24, stroke="currentColor", stroke-width seragam,
 * tanpa fill -- jadi warnanya 100% ikut className (text-color) yang kamu
 * kasih di parent. Tidak ada warna hardcoded di dalam SVG, supaya seluruh
 * set otomatis 1 palet dengan teks di sekitarnya.
 *
 * Pemakaian:
 *   <ShieldCheckIcon className="w-5 h-5 text-white/90" />
 *   <BanknoteIcon className="w-7 h-7 text-blue-600" />
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
