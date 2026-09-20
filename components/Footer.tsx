// GANTI ISI components/Footer.tsx Anda dengan file ini.
// Perubahan: logo gambar (/public/logo.png) ditambahkan di sebelah teks
// "kerjaku.click".
//
// Perubahan (fitur "Pisah Nomor Pesanan & Nomor Keluhan/CS", SUDAH TIDAK
// BERLAKU): sebelumnya ada 2 baris link WA terpisah -- "WA Pemesanan"
// (OPERATOR_WA_NUMBER) & "WA Keluhan/CS" (CS_COMPLAINT_WA_NUMBER, nomor
// beda).
//
// Perubahan BARU (20 September 2026): kedua nomor digabung jadi SATU nomor/
// device WhatsApp Business (lihat lib/whatsapp.ts) -- baris di bawah
// disatukan lagi jadi satu link WA, supaya tidak menampilkan "2 nomor" yang
// sekarang sebetulnya persis sama.

import { OPERATOR_WA_NUMBER } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="bg-[#12202A] mt-16">
      <div className="max-w-[1200px] mx-auto px-6 py-16 flex flex-col md:flex-row justify-between items-start gap-10">
        <div className="space-y-3 max-w-sm">
          <div className="flex items-center gap-2 font-semibold text-[#F5B324]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Kerjaku.click" className="h-9 w-9 rounded-full" />
            <span>kerjaku.click</span>
          </div>
          <p className="text-white/70 text-sm">
            Penyedia jasa tenaga kerja harian terpercaya untuk area Kota Palu
            dan sekitarnya. Membantu memudahkan urusan rumah tangga Anda.
          </p>
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
                  Cuci Kendaraan
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

      {/* Blok legalitas — data resmi PT Perorangan sesuai Sertifikat AHU & NIB,
          disiapkan agar situs memenuhi syarat verifikasi bisnis Meta
          (Facebook Business Manager) saat integrasi resmi dilakukan. */}
      <div className="max-w-[1200px] mx-auto px-6 py-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="text-white/60 text-xs text-center md:text-left leading-relaxed space-y-0.5">
          <p>
            © {new Date().getFullYear()} PT KERJAKU BANGUN NEGERI. All rights reserved.
          </p>
          <p>
            NIB 0905260042501 &middot; AHU No AHU-A000469.AH.01.30 Tahun 2026 &middot; Brand: kerjaku.click
          </p>
          <p>Jl. Muhammadiyah 2, Tondo, Kec. Mantikulore, Kota Palu, Sulawesi Tengah 94119</p>
          <p>Dikelola oleh Direktur: Syifa Ruby Adzkia</p>
        </div>
      </div>
    </footer>
  );
}
