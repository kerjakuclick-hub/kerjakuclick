// GANTI ISI components/Footer.tsx Anda dengan file ini.
//
// Perubahan (fitur "Pisah Nomor Pesanan & Nomor Keluhan/CS", SUDAH TIDAK
// BERLAKU): sebelumnya ada 2 baris link WA terpisah -- "WA Pemesanan"
// (OPERATOR_WA_NUMBER) & "WA Keluhan/CS" (CS_COMPLAINT_WA_NUMBER, nomor
// beda).
//
// Perubahan (20 September 2026): kedua nomor digabung jadi SATU nomor/
// device WhatsApp Business (lihat lib/whatsapp.ts) -- baris di bawah
// disatukan lagi jadi satu link WA, supaya tidak menampilkan "2 nomor" yang
// sekarang sebetulnya persis sama.
//
// Perubahan (20 September 2026, revisi 2): logo footer diganti ke lockup
// resmi dari Brand Kit (LOGO FINAL/LOGOFIX.svg) -- "kerjaku.click" versi
// lama (ikon /logo.png bulat + teks satu warna oranye) diganti dengan satu
// gambar lockup "KERJAKU CLICK" + ikon K, versi teks warna Paper (terang)
// supaya kontras di footer yang latarnya gelap (Ink).
//
// Perubahan BESAR (20 September 2026, revisi 3) -- migrasi "3 Pilar
// Layanan": link "Cuci Kendaraan" DIHAPUS (layanan ini dihapus total dari
// sistem, lihat lib/services.ts) dan diganti link "Les Private" (sekarang
// jasa yang bisa dipesan langsung, bukan lagi "Coming Soon").
//
// REVISI (21 September 2026, dari Anda langsung): "di footer logo dan ikon
// tersebut hilangkan saja. Naikan keatas @2026 pt. kerjaku bangun negeri" --
// gambar logo lockup di kolom kiri DIHAPUS, dan blok legalitas (copyright,
// NIB/AHU, alamat, direktur) yang tadinya jadi strip terpisah PALING BAWAH
// footer, DINAIKKAN ke kolom kiri ini. Strip terpisah & border-t di
// bawahnya sudah tidak ada lagi (isinya pindah ke sini).
//
// REVISI LAGI (21 September 2026, dari Anda langsung): kalimat tagline
// ("Penyedia jasa tenaga kerja harian terpercaya...") DIHAPUS, diganti
// ikon logo utama (public/logo.png -- ikon K yang sama dipakai di Header,
// bukan lockup teks lagi) di atas blok legalitas.

import { OPERATOR_WA_NUMBER } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="bg-[#12202A] mt-16">
      <div className="max-w-[1200px] mx-auto px-6 py-16 flex flex-col md:flex-row justify-between items-start gap-10">
        <div className="space-y-4 max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="kerjaku.click" width={48} height={48} className="h-12 w-12" />

          {/* Blok legalitas — data resmi PT Perorangan sesuai Sertifikat AHU
              & NIB, disiapkan agar situs memenuhi syarat verifikasi bisnis
              Meta (Facebook Business Manager) saat integrasi resmi
              dilakukan. Dinaikkan ke sini (21 September 2026) dari strip
              terpisah paling bawah, sesuai instruksi Anda. */}
          <div className="text-white/50 text-xs leading-relaxed space-y-0.5">
            <p>© {new Date().getFullYear()} PT KERJAKU BANGUN NEGERI. All rights reserved.</p>
            <p>
              NIB 0905260042501 &middot; AHU No AHU-A000469.AH.01.30 Tahun 2026 &middot; Brand:
              kerjaku.click
            </p>
            <p>Jl. Muhammadiyah 2, Tondo, Kec. Mantikulore, Kota Palu, Sulawesi Tengah 94119</p>
            <p>Dikelola oleh Direktur: Syifa Ruby Adzkia</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
          <div className="space-y-3">
            <p className="text-white font-bold text-sm">Layanan</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#services" className="text-white/70 hover:text-[#F5B324] transition-colors">
                  Setrika
                </a>
              </li>
              <li>
                <a href="#services" className="text-white/70 hover:text-[#F5B324] transition-colors">
                  Bersih Rumah
                </a>
              </li>
              <li>
                <a href="#services" className="text-white/70 hover:text-[#F5B324] transition-colors">
                  Les Private
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-white font-bold text-sm">Hubungi Kami</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://instagram.com/kerjaku.click"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#F5B324] transition-colors"
                >
                  Instagram @kerjaku.click
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${OPERATOR_WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#F5B324] transition-colors"
                >
                  WA kerjaku.click: +62 811-4110-9567
                </a>
              </li>
              <li>
                <a
                  href="mailto:suport@kerjaku.click"
                  className="text-white/70 hover:text-[#F5B324] transition-colors"
                >
                  suport@kerjaku.click
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <p className="text-white font-bold text-sm">Lokasi</p>
            <p className="text-white/70 text-sm">Kota Palu, Sulawesi Tengah</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
