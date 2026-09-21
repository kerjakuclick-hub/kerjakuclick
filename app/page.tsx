// GANTI ISI app/page.tsx Anda dengan file ini.
//
// PERHATIAN:
// - <YoutubeSection /> ditaruh setelah <MitraShowcase /> (sisi
//   trust-building), sesuai kesepakatan.
// - Section Testimoni & FAQ SENGAJA BELUM dimasukkan — menunggu jawaban
//   Anda soal testimoni asli & 3 klaim FAQ (verifikasi KTP, vaksinasi,
//   jam CS 24/7 vs 07.00-20.00 WIB). Begitu dikonfirmasi, saya tambahkan.
//
// REVISI LAYOUT (20 September 2026, mengikuti referensi kliknclean.com):
// <TrustBar /> (bar gelap terpisah) DIHAPUS dari sini -- 3 (lalu 5) badge
// kepercayaannya sudah dipindah ke DALAM <Hero /> sendiri. Komponennya
// sendiri TIDAK dihapus dari components/, cuma tidak dipanggil di sini.
//
// REVISI STRUKTUR (21 September 2026, mengikuti mockup Canva Anda): section
// #order-form (<OrderForm /> + <WhyChooseUs />) DIPINDAH ke halaman baru
// app/pesan/page.tsx -- nav "Pesan Jasa" sekarang link ke /pesan, bukan
// scroll-anchor di sini lagi. Beranda jadi murni halaman showcase (Hero,
// Layanan, Cara Pesan, Mitra, Video) tanpa form order tertanam.
//
// REVISI BESAR (21 September 2026, "Buat tampilan presisi dengan desain
// dari Canva tersebut"): section baru <KenapaMemilihKami /> ditambahkan di
// antara <ServicesGrid /> dan <MitraShowcase />, persis posisinya di mockup
// Canva Home page Anda (lihat components/KenapaMemilihKami.tsx).
//
// CATATAN: mockup Canva Home page Anda urutannya persis Hero -> Layanan
// Kami -> Kenapa Memilih Kami? -> Mitra Profesional -> Video ("Kenal kami
// lebih dekat") -> Footer -- TANPA section <HowItWorks /> ("Cara Pesan")
// sama sekali. Karena Anda tidak bilang section itu mau dihapus, saya TIDAK
// menghapusnya (masih konten berguna) -- cuma saya geser ke PALING BAWAH
// (setelah video, sebelum Footer) supaya urutan utama tetap 100% sama
// dengan mockup Anda sampai section video. Tolong konfirmasi apakah
// <HowItWorks /> memang mau tetap ada di beranda (di posisi baru ini) atau
// dihapus total / dipindah ke halaman lain.

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ServicesGrid from "@/components/ServicesGrid";
import KenapaMemilihKami from "@/components/KenapaMemilihKami";
import HowItWorks from "@/components/HowItWorks";
import MitraShowcase from "@/components/MitraShowcase";
import YoutubeSection from "@/components/YoutubeSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ServicesGrid />
        <KenapaMemilihKami />
        <MitraShowcase />
        <YoutubeSection />
        <HowItWorks />

        {/*
          TODO setelah dikonfirmasi:
          <Testimonials />  — perlu testimoni ASLI, bukan hasil generate AI
          <Faq />           — perlu konfirmasi 3 klaim (KTP, vaksinasi, jam CS)
        */}
      </main>
      <Footer />
    </>
  );
}
