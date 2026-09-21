// GANTI ISI components/Header.tsx Anda dengan file ini.
//
// REDESAIN PREMIUM (20 September 2026): mengikuti disiplin brand identity
// baru -- Warna #1D6F8C (Bay) DIHAPUS dari sini, karena Bay sekarang
// KHUSUS section Form Order (OrderForm.tsx). Latar header pakai token
// "paper" (bukan hex custom "#f6faf6") supaya konsisten dengan design
// system.
//
// REVISI STRUKTUR NAV (21 September 2026, dari mockup Canva Anda): menu
// diganti total jadi 5 item sesuai mockup -- Home, Pesan Jasa, AkunKU,
// Jadi Mitra, Costumer Service. Nav lama (Layanan/Cara Pesan/Mitra Kami
// yang scroll ke anchor di beranda, + tombol "Customer Service" pill
// putih ala referensi kliknclean.com) DIGANTI:
//   - "Pesan Jasa" -> /pesan (form order sekarang halaman sendiri, lihat
//     app/pesan/page.tsx -- sebelumnya section #order-form di beranda).
//   - "AkunKU" -> /riwayat (cuma ganti LABEL nav, halaman & isinya tetap
//     "Riwayat Pesanan" yang sudah ada, sesuai keputusan Anda).
//   - "Costumer Service" -> tetap link WA asli (buildCsLink()), sekarang
//     gaya nav-link biasa (bukan pill/tombol lagi), sesuai mockup yang
//     menampilkannya sebagai item nav biasa.
//   - Item aktif (halaman yang sedang dibuka) ditandai bold/Ink lewat
//     usePathname(), item lain abu-abu -- sesuai mockup (nav item halaman
//     yang sedang aktif selalu tampil tebal/gelap).
//
// REVISI (21 September 2026, dari Anda langsung): "Logo di header cukup
// ikon" -- logo lockup penuh (wordmark "KERJAKU CLICK" + ikon K) DIGANTI
// ikon K saja (public/logo.png, aset yang sama persis dengan gambar yang
// Anda kirim), lebih ringkas & konsisten dengan gaya nav-bar platform
// digital modern.

"use client";

import { useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function navLinkClass(href: string) {
    const active = pathname === href;
    return `text-sm transition-colors ${
      active ? "font-semibold text-ink" : "font-medium text-ink/60 hover:text-ink"
    }`;
  }

  const navLinks = (
    <>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={navLinkClass(item.href)}
        >
          {item.label}
        </Link>
      ))}
      <a
        href={buildCsLink()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setMobileOpen(false)}
        className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
      >
        Costumer Service
      </a>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur shadow-sm">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center">
          {/* Ikon K saja (public/logo.png) -- sesuai instruksi Anda "Logo di
              header cukup ikon". */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="kerjaku.click"
            width={40}
            height={40}
            className="h-10 w-10"
          />
        </Link>

        {/* Menu desktop */}
        <div className="hidden items-center gap-8 md:flex">{navLinks}</div>

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
      </nav>

      {/* Menu mobile, muncul saat hamburger diklik */}
      {mobileOpen && (
        <div className="flex flex-col gap-4 border-t border-ink/10 bg-paper px-6 py-4 md:hidden">
          {navLinks}
        </div>
      )}
    </header>
  );
}
