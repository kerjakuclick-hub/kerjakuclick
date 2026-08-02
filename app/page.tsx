// GANTI ISI app/page.tsx Anda dengan file ini.
//
// PERHATIAN:
// - <OrderForm /> dipakai APA ADANYA dari komponen Anda yang sudah ada
//   (logika kirim ke WA TIDAK saya sentuh) — hanya dibungkus kartu baru
//   sesuai desain Stitch.
// - Section Testimoni & FAQ SENGAJA BELUM dimasukkan — menunggu jawaban
//   Anda soal testimoni asli & 3 klaim FAQ (verifikasi KTP, vaksinasi,
//   jam CS 24/7 vs 07.00-20.00 WIB). Begitu dikonfirmasi, saya tambahkan.

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import ServicesGrid from "@/components/ServicesGrid";
import HowItWorks from "@/components/HowItWorks";
import MitraShowcase from "@/components/MitraShowcase";
import WhyChooseUs from "@/components/WhyChooseUs";
import Footer from "@/components/Footer";
import OrderForm from "@/components/OrderForm";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <ServicesGrid />
        <HowItWorks />
        <MitraShowcase />

        <section
          id="order-form"
          className="max-w-[1200px] mx-auto px-6 py-16 md:py-20"
        >
          <div className="bg-white rounded-2xl border border-[#12202A]/5 shadow-[0px_4px_20px_rgba(18,32,42,0.05)] overflow-hidden grid lg:grid-cols-2">
            <div className="p-6 md:p-10 space-y-6">
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl md:text-3xl font-bold text-[#12202A]">
                Pesan Layanan Sekarang
              </h2>
              <p className="text-[#3f484d]">
                Isi data Anda di bawah ini, admin kami akan segera
                menghubungi via WhatsApp untuk konfirmasi penugasan mitra.
              </p>
              <OrderForm />
            </div>
            <WhyChooseUs />
          </div>
        </section>

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
