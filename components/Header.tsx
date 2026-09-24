// GANTI ISI components/Header.tsx Anda dengan file ini.
//
// REVISI (25 September 2026, dari desain hero terbaru + BRANDKIT):
//   - Logo header sekarang LOCKUP penuh versi gelap (KERJAKU CLICK + ikon K)
//     dari BRANDKIT/header-black.png -> disalin ke public/logo-header.png.
//     Ikon K saja (public/logo.png) tidak dipakai lagi di header, tapi
//     file-nya TIDAK dihapus (masih dipakai favicon/manifest/tempat lain).
//   - Latar header putih bersih (sesuai desain), bukan paper lagi.
//   - Menu HAMBURGER di SEMUA ukuran layar (desktop juga), sesuai desain.
//     Desktop: panel dropdown kecil rata kanan. Mobile: panel selebar layar.
//     Menu tertutup otomatis saat pindah halaman, klik di luar, atau Esc.
//   - Isi menu SAMA seperti sebelumnya: Home, Pesan Jasa, AkunKU,
//     Jadi Mitra, Costumer Service (link WA via buildCsLink()).
//   - Tinggi header tetap 64px (h-16) -- Hero.tsx memakai angka ini untuk
//     menghitung tinggi layar pertama.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildCsLink } from "@/lib/whatsapp";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Pesan Jasa", href: "/pesan" },
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

  function itemClass(href: string) {
    const active = pathname === href;
    return `block rounded-lg px-4 py-3 text-sm transition-colors hover:bg-paper ${
      active ? "font-semibold text-ink" : "font-medium text-ink/65 hover:text-ink"
    }`;
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(18,32,42,0.08)]">
      <div ref={wrapRef} className="relative">
        <nav className="flex h-16 w-full items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center" aria-label="kerjaku.click — Home">
            {/* Lockup gelap dari BRANDKIT (header-black.png, 820x200). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-header.png"
              alt="kerjaku.click"
              width={820}
              height={200}
              className="h-8 w-auto"
            />
          </Link>

          {/* Hamburger -- tampil di semua ukuran layar */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-mr-2 rounded-md p-2 text-ink transition hover:bg-paper"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="site-menu"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </nav>

        {open && (
          <div
            id="site-menu"
            className="absolute inset-x-0 top-full border-t border-ink/10 bg-white px-3 py-3 shadow-card md:inset-x-auto md:right-5 md:mt-2 md:w-64 md:rounded-card md:border md:border-ink/10 sm:px-5 md:px-2 md:py-2"
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
              Costumer Service
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
