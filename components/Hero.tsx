// GANTI ISI components/Hero.tsx Anda dengan file ini.
//
// REVISI BESAR (21 September 2026) -- "Buat tampilan presisi dengan desain
// dari Canva tersebut": Hero dibangun ULANG mengikuti mockup Canva Home
// page Anda persis, bukan lagi variasi dari referensi kliknclean.com --
//   - Background navy nyaris hitam + garis diagonal tipis (lihat
//     `.hero-diagonal` di app/globals.css), bukan lagi putih/paper polos.
//   - Layout DIBALIK: logo besar (logo-lockup-footer.png, versi putih) di
//     KIRI, headline + subheadline + tombol di KANAN (rata kanan), persis
//     posisi di mockup.
//   - Headline sekarang 3 baris "Solusi Praktis" / "Bikin Hidup" / "Bernilai"
//     -- BUKAN lagi "...Sekali Klik!" seperti revisi sebelumnya. Baris
//     tengah "Bikin Hidup" pakai warna Bay (#1D6F8C, token `text-bay`) --
//     sudah saya cek dengan color-picker di gambar mockup Anda, warnanya
//     PERSIS token Bay yang sudah ada, bukan warna baru.
//   - Subheadline baru: "Setrika, bersiin rumah, dan les privat — diurus
//     dalam SEKALI KLIK!" (persis teks di mockup Anda, termasuk ejaan
//     "bersiin").
//   - Kartu preview WhatsApp & baris 5 badge kepercayaan DIHAPUS dari Hero
//     (mockup Anda tidak menampilkannya di sini) -- 3 dari 5 poin itu
//     sekarang py punya rumah baru di section <KenapaMemilihKami />
//     (lihat components/KenapaMemilihKami.tsx, baru dibuat), 2 sisanya
//     ("Chat & Lokasi di Website", "Harga Transparan") tetap ada di panel
//     <WhyChooseUs /> di halaman /pesan. Tidak ada informasi yang hilang.
//   - BridgeMotif watermark & WhatsAppPreview tidak dipakai lagi di sini.
//
// CATATAN WARNA: perubahan ini berarti Bay TIDAK LAGI eksklusif untuk
// section Form Order -- sekarang juga dipakai di Hero (aksen headline) &
// section <KenapaMemilihKami /> (bar penuh), persis mengikuti mockup Canva
// Anda. Ink tetap dipakai section gelap lain (Mitra Profesional). Ini
// pergeseran yang disengaja supaya tampilan 100% presisi dengan referensi
// Anda -- bukan diam-diam menyimpang dari aturan brand lama.

import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero-diagonal relative overflow-hidden">
      <div className="relative mx-auto max-w-[1200px] px-6 py-16 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="flex justify-center md:justify-start">
            <img
              src="/logo-lockup-footer.png"
              alt="kerjaku.click"
              className="h-auto w-56 sm:w-64 md:w-full md:max-w-xs"
            />
          </div>

          <div className="space-y-6 text-center md:text-right">
            <h1 className="font-display text-4xl font-bold leading-[1.15] text-white md:text-5xl">
              Solusi Praktis
              <br />
              <span className="text-bay">Bikin Hidup</span>
              <br />
              Bernilai
            </h1>
            <p className="mx-auto max-w-sm text-base leading-relaxed text-white/60 md:mx-0 md:ml-auto md:text-lg">
              Setrika, bersiin rumah, dan les privat&mdash; diurus dalam{" "}
              <span className="font-semibold text-white/85">SEKALI KLIK!</span>
            </p>
            <div className="flex justify-center md:justify-end">
              <Link
                href="/pesan"
                className="inline-block rounded-full bg-bridge px-8 py-3.5 text-center font-display text-sm font-semibold text-ink shadow-card transition hover:brightness-105"
              >
                Pesan Sekarang
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
