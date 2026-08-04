// GANTI ISI components/Header.tsx Anda dengan file ini.
// Perubahan: tambah link "Jadi Mitra" mengarah ke /daftar-mitra.

import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#f6faf6]/95 backdrop-blur shadow-sm">
      <nav className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold text-xl text-[#00566f]">
          kerjaku<span className="text-[#1D6F8C]">.click</span>
        </Link>
        <div className="hidden md:flex gap-8">
          <a
            href="#services"
            className="text-[#12202A] font-semibold border-b-2 border-[#1D6F8C] pb-1 text-sm"
          >
            Layanan
          </a>
          <a
            href="#how-it-works"
            className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
          >
            Cara Pesan
          </a>
          <a
            href="#mitra"
            className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
          >
            Mitra Kami
          </a>
          <Link
            href="/daftar-mitra"
            className="text-[#3f484d] hover:text-[#1D6F8C] transition-colors text-sm font-medium"
          >
            Jadi Mitra
          </Link>
        </div>
        <a
          href="https://wa.me/6288245185778"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition text-sm font-semibold"
        >
          Chat CS
        </a>
      </nav>
    </header>
  );
}
