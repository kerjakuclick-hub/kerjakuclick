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
//
// REVISI TOTAL (23 September 2026, susunan baru dari Anda langsung):
//   1. Ikon logo sekarang disandingkan lagi dengan teks "kerjaku.click"
//      (bukan ikon sendirian seperti revisi 21 September), teksnya warna
//      terang #EEF2EE (token warna latar terang situs, lihat app/globals.css)
//      supaya kontras di footer gelap.
//   2. Kalimat tagline/deskripsi platform DIKEMBALIKAN (isi baru dari Anda)
//      -- menggantikan versi lama yang sempat dihapus 21 September.
//   3. Kolom "Lokasi" DIHAPUS -- alamat lengkapnya sudah ada di blok
//      legalitas di bawah, jadi kolom terpisah ini jadi duplikat.
//   4. Blok legalitas (copyright, NIB/AHU, alamat, direktur) DIPINDAH lagi
//      -- dari nempel di kolom kiri (keputusan 21 September) jadi STRIP
//      PENUH PALING BAWAH footer, di bawah kolom Layanan & Hubungi Kami,
//      dipisah garis tipis -- sesuai urutan yang Anda berikan.
//   5. Label "Bersih Rumah" -> "Bersihkan Rumah" (konsisten dengan nama
//      kategori jasa di lib/services.ts & wizard OrderForm.tsx), dan
//      "Instagram"/"Email" sekarang diberi label eksplisit sebelum nilainya
//      ("Instagram : @kerjaku.click", "Email : suport@kerjaku.click"),
//      konsisten dengan format baris WA yang sudah ada.

import { OPERATOR_WA_NUMBER } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="bg-[#12202A] mt-16">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="kerjaku.click" width={40} height={40} className="h-10 w-10" />
              <span className="font-display text-lg font-bold text-[#EEF2EE]">kerjaku.click</span>
            </div>

            <p className="text-white/70 text-sm leading-relaxed">
              Platform penyedia jasa tenaga kerja ke rumah Anda. Tenaga kerja terverifikasi yang
              telah melalui proses pelatihan siap membantu berbagai urusan pekerjaan seperti
              setrika pakaian, bersihkan rumah, kegiatan selesai pesta, hingga tutor les private
              bagi anak Anda.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10">
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
                    Bersihkan Rumah
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
                    Instagram : @kerjaku.click
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
                    Email : suport@kerjaku.click
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Blok legalitas — data resmi PT Perorangan sesuai Sertifikat AHU &
            NIB, disiapkan agar situs memenuhi syarat verifikasi bisnis Meta
            (Facebook Business Manager) saat integrasi resmi dilakukan.
            Dipindah (23 September 2026) jadi strip penuh paling bawah,
            dipisah garis tipis dari 2 kolom di atas, sesuai susunan baru
            dari Anda. */}
        <div className="mt-12 border-t border-white/10 pt-6 text-white/50 text-xs leading-relaxed space-y-0.5">
          <p>© {new Date().getFullYear()} PT KERJAKU BANGUN NEGERI. All rights reserved.</p>
          <p>
            NIB 0905260042501 &middot; AHU No AHU-A000469.AH.01.30 Tahun 2026 &middot; Brand:
            kerjaku.click
          </p>
          <p>Jl. Muhammadiyah 2, Tondo, Kec. Mantikulore, Kota Palu, Sulawesi Tengah 94119</p>
          <p>Dikelola oleh Direktur: Syifa Ruby Adzkia</p>
        </div>
      </div>
    </footer>
  );
}
