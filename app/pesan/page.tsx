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

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderForm from "@/components/OrderForm";
import WhyChooseUs from "@/components/WhyChooseUs";

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
        <section className="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
          <div className="bg-white rounded-2xl border border-ink/5 shadow-card overflow-hidden grid lg:grid-cols-2">
            <div className="p-6 md:p-10 space-y-6">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-ink">
                Pesan Layanan Sekarang
              </h1>
              <p className="text-ink/70">
                Isi data Anda di bawah ini, admin kami akan segera
                menghubungi via WhatsApp untuk konfirmasi penugasan mitra.
              </p>
              <OrderForm />
            </div>
            <WhyChooseUs />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
