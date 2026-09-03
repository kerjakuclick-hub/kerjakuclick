// GANTI ISI komponen navbar Anda dengan file ini.
//
// Perubahan: tambah link "Riwayat Pesanan" (ke /riwayat) di navLinks --
// otomatis muncul di menu desktop DAN mobile karena keduanya render
// navLinks yang sama. Style disamakan dengan "Jadi Mitra" (link Next.js
// biasa, bukan anchor #section). Tidak ada perubahan lain.

"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <a
        href="#services"
        onClick={() => setMobileOpen(false)}
        className="text-[#12202A] font-semibold text-sm"
      >
        Layanan
      </a>
      <a
        href="#how-it-works"
        onClick={() => setMobileOpen(false)}
        className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
      >
        Cara Pesan
      </a>
      <a
        href="#mitra"
        onClick={() => setMobileOpen(false)}
        className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
      >
        Mitra Kami
      </a>
      <Link
        href="/daftar-mitra"
        onClick={() => setMobileOpen(false)}
        className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
      >
        Jadi Mitra
      </Link>
      <Link
        href="/riwayat"
        onClick={() => setMobileOpen(false)}
        className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
      >
        Riwayat Pesanan
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-[#f6faf6]/95 backdrop-blur shadow-sm">
      <nav className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold text-xl text-[#00566f]">
          kerjaku<span className="text-[#1D6F8C]">.click</span>
        </Link>

        {/* Menu desktop */}
        <div className="hidden md:flex gap-8">{navLinks}</div>

        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/6281145504178"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition text-sm font-semibold"
          >
            Chat CS
          </a>

          {/* Tombol hamburger, cuma tampil di mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 -mr-2 text-[#12202A]"
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
        <div className="md:hidden border-t border-[#12202A]/10 bg-[#f6faf6] px-6 py-4 flex flex-col gap-4">
          {navLinks}
        </div>
      )}
    </header>
  );
}
