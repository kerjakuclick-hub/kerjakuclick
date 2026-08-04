// FILE BARU: app/daftar-mitra/page.tsx

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MitraApplicationForm from "@/components/MitraApplicationForm";

export const metadata = {
  title: "Daftar Jadi Mitra — Kerjaku.click",
  description:
    "Gabung jadi mitra Kerjaku.click. Isi formulir pendaftaran, tim kami akan menghubungi Anda untuk proses wawancara.",
};

export default function DaftarMitraPage() {
  return (
    <>
      <Header />
      <main className="max-w-[800px] mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-10">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl md:text-4xl font-bold text-[#12202A] mb-3">
            Bergabung Jadi Mitra Kerjaku.click
          </h1>
          <p className="text-[#3f484d] max-w-xl mx-auto">
            Isi formulir di bawah ini untuk mendaftar. Tim kami akan menghubungi Anda lewat
            WhatsApp untuk proses wawancara setelah data diverifikasi.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#12202A]/5 shadow-[0px_4px_20px_rgba(18,32,42,0.05)] p-6 md:p-10">
          <MitraApplicationForm />
        </div>

        <div className="mt-8 rounded-xl bg-[#12202A]/5 p-5 text-sm text-[#3f484d] space-y-2">
          <p className="font-semibold text-[#12202A]">Proses seleksi setelah mendaftar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Data Anda ditinjau tim kami</li>
            <li>Panggilan wawancara (wajib bawa KTP & KK asli untuk verifikasi)</li>
            <li>Pelatihan 3 hari (fundamental, praktik kerja, simulasi)</li>
            <li>Resmi jadi mitra aktif Kerjaku.click</li>
          </ol>
        </div>
      </main>
      <Footer />
    </>
  );
}
