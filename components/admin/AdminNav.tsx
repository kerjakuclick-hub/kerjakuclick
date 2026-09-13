"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminNav({ adminName }: { adminName: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <Link href="/admin" onClick={() => setMobileOpen(false)} className="hover:text-white">
        Dashboard
      </Link>
      <Link href="/admin/mitra" onClick={() => setMobileOpen(false)} className="hover:text-white">
        Mitra
      </Link>
      <Link href="/admin/pendaftar" onClick={() => setMobileOpen(false)} className="hover:text-white">
        Pendaftar
      </Link>
      <Link href="/admin/transaksi" onClick={() => setMobileOpen(false)} className="hover:text-white">
        Transaksi
      </Link>
      <Link href="/admin/media" onClick={() => setMobileOpen(false)} className="hover:text-white">
        Media
      </Link>
    </>
  );

  const account = (
    <>
      <span className="text-sm text-white/70">{adminName}</span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
        >
          Keluar
        </button>
      </form>
    </>
  );

  return (
    <header className="border-b border-line bg-bay-deep">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-bold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Kerjaku.click" className="h-8 w-8" />
            <span>
              kerjaku<span className="text-bridge">.click</span>{" "}
              <span className="text-sm font-normal text-white/50">Admin</span>
            </span>
          </Link>

          {/* Menu desktop */}
          <nav className="hidden md:flex gap-5 text-sm font-medium text-white/80">{navLinks}</nav>
        </div>

        <div className="hidden md:flex items-center gap-4">{account}</div>

        {/* Tombol hamburger, cuma tampil di mobile */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 -mr-2 text-white"
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

      {/* Menu mobile, muncul saat hamburger diklik */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-bay-deep px-6 py-4 flex flex-col gap-4 text-sm font-medium text-white/80">
          {navLinks}
          <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-1">{account}</div>
        </div>
      )}
    </header>
  );
}
