// GANTI ISI components/Header.tsx Anda dengan file ini.
//
// REDESAIN PREMIUM (20 September 2026): mengikuti disiplin brand identity
// baru --
//   - Warna #1D6F8C (Bay) DIHAPUS dari hover nav link -- diganti Ink, karena
//     Bay sekarang KHUSUS section Form Order (OrderForm.tsx).
//   - Link "Jadi Mitra" dinaikkan jadi tombol pill Ink (#12202A) yang jelas
//     berbeda dari link nav biasa, sesuai pemetaan warna tombol brand:
//     "Tombol daftar mitra #12202A".
//   - Latar header disamakan ke token "paper" (bukan hex custom
//     "#f6faf6") supaya konsisten dengan design system.

"use client";

import { useState } from "react";
import Link from "next/link";
import { buildCsLink } from "@/lib/whatsapp";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <a
        href="#services"
        onClick={() => setMobileOpen(false)}
        className="text-sm font-semibold text-ink"
      >
        Layanan
      </a>
      <a
        href="#how-it-works"
        onClick={() => setMobileOpen(false)}
        className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
      >
        Cara Pesan
      </a>
      <a
        href="#mitra"
        onClick={() => setMobileOpen(false)}
        className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
      >
        Mitra Kami
      </a>
      <Link
        href="/riwayat"
        onClick={() => setMobileOpen(false)}
        className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
      >
        Riwayat Pesanan
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur shadow-sm">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center">
          {/* Logo lockup resmi (Brand Kit -- LOGO FINAL), sudah termasuk
              wordmark "KERJAKU CLICK" + ikon K, jadi tidak perlu teks/ikon
              terpisah lagi di sini. Versi ini teksnya warna Ink (gelap)
              supaya kontras di header yang latarnya terang. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-lockup-header.png"
            alt="kerjaku.click"
            width={129}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        {/* Menu desktop */}
        <div className="hidden items-center gap-8 md:flex">{navLinks}</div>

        <div className="flex items-center gap-3">
          <Link
            href="/daftar-mitra"
            className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 sm:inline-flex sm:items-center"
          >
            Jadi Mitra
          </Link>

          {/* Nomor KELUHAN/CS (manual, di-handle admin) -- BUKAN nomor
              pesanan yang tersambung ke Fonnte. Lihat lib/whatsapp.ts. */}
          <a
            href={buildCsLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-wa px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
          >
            Chat CS
          </a>

          {/* Tombol hamburger, cuma tampil di mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="-mr-2 p-2 text-ink md:hidden"
            aria-label="Buka menu"
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Menu mobile, muncul saat hamburger diklik */}
      {mobileOpen && (
        <div className="flex flex-col gap-4 border-t border-ink/10 bg-paper px-6 py-4 md:hidden">
          {navLinks}
          <Link
            href="/daftar-mitra"
            onClick={() => setMobileOpen(false)}
            className="inline-flex w-fit items-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Jadi Mitra
          </Link>
        </div>
      )}
    </header>
  );
}
