// FILE BARU: app/pesan/page.tsx
//
// Form order (<OrderForm /> + panel <WhyChooseUs />) DIPINDAH ke sini dari
// section #order-form di app/page.tsx (beranda), sesuai keputusan Anda
// mengikuti mockup Canva -- nav "Pesan Jasa" sekarang halaman tersendiri,
// bukan lagi scroll-anchor di beranda.
//
// Semua entry point yang tadinya mengarah ke "/#order-form" atau
// "#order-form" sudah diarahkan ke /pesan:
//   - Header.tsx (nav "Pesan Jasa")
//   - Hero.tsx (tombol "Pesan Sekarang")
//   - ServicesGridInteractive.tsx (tombol "Pesan Sekarang" di modal detail
//     jasa -- sekarang simpan jasa terpilih ke localStorage
//     "kerjaku_reorder" lalu navigasi ke /pesan, dibaca otomatis oleh
//     OrderForm.tsx lewat mekanisme prefill yang sama dipakai "Pesan Lagi"
//     dari /riwayat)
//   - app/riwayat/page.tsx (tombol "Pesan Lagi", route diganti dari
//     "/#pesan" ke "/pesan")
//
// Logika kirim ke WA di dalam <OrderForm /> itu sendiri TIDAK disentuh
// sama sekali -- cuma dipindah lokasi tempat dia dirender.
//
// REVISI (23 September 2026, laporan Anda dari screenshot desktop): panel
// <WhyChooseUs /> ("Kenapa Memilih Kerjaku?") yang tadinya diletakkan
// BERSEBELAHAN dengan <OrderForm /> lewat wrapper kartu putih `grid
// lg:grid-cols-2` DIHAPUS dari halaman ini. Sebabnya: <OrderForm /> sendiri
// SUDAH punya layout 2 kolom sendiri di dalamnya (form wizard + pratinjau
// WA) yang didesain untuk lebar penuh (bg gelap sendiri, max-w-6xl sendiri)
// -- dibungkus lagi jadi setengah lebar di sini membuat wizard "Pilihan
// Jasa Tenaga Kerja" (tombol Setrika/Bersihkan Rumah/Les Private, dst)
// kehabisan lebar, sampai tulisan tombolnya terpotong/pecah tidak rapi di
// desktop maupun mobile. <OrderForm /> sekarang dirender APA ADANYA (lebar
// penuh, pakai layout section-nya sendiri) -- WhyChooseUs.tsx SENGAJA TIDAK
// dihapus filenya (cuma tidak dipanggil lagi di sini), gampang dipasang
// lagi di tempat lain (mis. jadi section terpisah DI BAWAH form, bukan di
// samping) kalau kontennya masih ingin ditampilkan.

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderForm from "@/components/OrderForm";

export const metadata = {
  title: "Pesan Jasa — Kerjaku.click",
  description:
    "Isi data Anda, admin kami akan segera menghubungi via WhatsApp untuk konfirmasi penugasan mitra.",
};

export default function PesanPage() {
  return (
    <>
      <Header />
      <main>
        <OrderForm />
      </main>
      <Footer />
    </>
  );
}
