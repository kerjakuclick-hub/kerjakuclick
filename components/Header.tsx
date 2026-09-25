// GANTI ISI components/Header.tsx Anda dengan file ini.
//
// REVISI (25 September 2026, dari Anda langsung):
//   - (Update terakhir, dari desain terlampir) Hamburger tiga garis di
//     KIRI, logo lockup gelap (public/logo-header.png) di KANAN -- desktop
//     maupun HP. Panel menu terbuka dari sisi kiri.
//   - Susunan menu hamburger BARU (desktop & HP sama):
//       Beranda     -> "/"               (halaman depan)
//       Layanan     -> "/#services"      (section Layanan Unggulan,
//                                          components/ServicesGrid.tsx)
//       Cara Pesan  -> "/#how-it-works"  (section Cara Pesan,
//                                          components/HowItWorks.tsx)
//       AkunKU      -> "/riwayat"        (daftar/masuk akun, profil,
//                                          riwayat pesanan, chat in-app --
//                                          semua sudah ada di halaman itu)
//       Jadi Mitra  -> "/daftar-mitra"   (formulir daftar mitra)
//       WhatsApp CS -> link WA langsung (buildCsLink())
//     Item "Pesan Jasa" tidak lagi di menu -- form pesan tetap bisa
//     dibuka lewat tombol "Pesan Sekarang" di Hero & dari halaman AkunKU.
//   - Anchor #services / #how-it-works diberi scroll-margin di globals.css
//     supaya judul section tidak tertutup header yang sticky.
//   - Tinggi header 56px (h-14) -- angka ini dipakai Hero.tsx & globals.css.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildCsLink } from "@/lib/whatsapp";

const NAV_ITEMS = [
  { label: "Beranda", href: "/" },
  { label: "Layanan", href: "/#services" },
  { label: "Cara Pesan", href: "/#how-it-works" },
  { label: "AkunKU", href: "/riwayat" },
  { label: "Jadi Mitra", href: "/daftar-mitra" },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Tutup menu saat pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Tutup menu saat klik di luar panel atau tekan Esc.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Item aktif hanya untuk halaman (bukan anchor section).
  function itemClass(href: string) {
    const active = !href.includes("#") && pathname === href;
    return `block rounded-lg px-4 py-3 text-sm transition-colors hover:bg-paper ${
      active ? "font-semibold text-ink" : "font-medium text-ink/65 hover:text-ink"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(18,32,42,0.08)]">
      <div ref={wrapRef} className="relative">
        <nav className="flex h-14 w-full items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-ml-2 rounded-md p-2 text-ink transition hover:bg-paper"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="site-menu"
          >
            {open ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3.5 6H20.5M3.5 12H20.5M3.5 18H20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <Link href="/" className="flex items-center" aria-label="kerjaku.click — Beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-header.png"
              alt="kerjaku.click"
              width={820}
              height={200}
              className="h-7 w-auto"
            />
          </Link>
        </nav>

        {open && (
          <div
            id="site-menu"
            className="absolute inset-x-0 top-full border-t border-ink/10 bg-white px-3 py-3 shadow-card sm:px-5 md:inset-x-auto md:left-5 md:mt-2 md:w-64 md:rounded-card md:border md:border-ink/10 md:px-2 md:py-2"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={itemClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={buildCsLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-ink/65 transition-colors hover:bg-paper hover:text-ink"
            >
              WhatsApp CS
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
