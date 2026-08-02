// GANTI ISI components/Hero.tsx Anda dengan file ini.
//
// FIX: WhatsAppPreview ternyata butuh prop `message` (string, dipisah per
// baris pakai "\n") dan opsional `compact`. Errornya "Cannot read properties
// of undefined (reading 'split')" muncul karena versi sebelumnya saya
// panggil tanpa prop sama sekali.
//
// Teks contoh di bawah ini saya samakan dengan format asli pesan #BARU yang
// dikirim ke WA operator (sama seperti yang tampil di landing page lama
// Anda) — supaya tetap akurat menggambarkan alur order yang sebenarnya.

import WhatsAppPreview from "./WhatsAppPreview";

const CONTOH_PESAN = [
  "#BARU",
  "Nama:Bu Anita",
  "NoHP:0812xxxxxxx",
  "Alamat:Jl. Cumi-Cumi No. 12, Palu",
  "Jasa:Cleaning Fast",
  "Tanggal:2026-08-02",
  "Waktu:09.00-12.00",
  "Preferensi:Bebas",
].join("\n");

export default function Hero() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl md:text-5xl font-bold text-[#12202A] leading-tight">
          Jasa Tenaga Kerja Ke Rumah Anda, Sekali Klik
        </h1>
        <p className="text-lg text-[#3f484d] leading-relaxed">
          Solusi praktis untuk kebutuhan rumah tangga di Kota Palu. Setrika,
          bersih-bersih rumah, hingga cuci kendaraan dengan tenaga terpercaya
          dan profesional.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <a
            href="#order-form"
            className="bg-[#F5B324] text-[#12202A] px-8 py-3 rounded-lg font-semibold text-center hover:opacity-90 transition-all shadow-[0px_4px_20px_rgba(18,32,42,0.08)]"
          >
            Pesan Sekarang
          </a>
          <div className="flex items-center gap-2 text-[#3f484d] text-xs font-bold uppercase tracking-wide">
            <span className="text-[#1D6F8C]">✓</span>
            Tanpa Biaya Admin Tersembunyi
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="max-w-sm mx-auto rotate-2 md:rotate-3 rounded-xl shadow-[0px_4px_20px_rgba(18,32,42,0.05)] border border-[#12202A]/5 overflow-hidden bg-white">
          <WhatsAppPreview message={CONTOH_PESAN} compact />
        </div>
        {/* elemen dekoratif */}
        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#F5B324]/20 blur-3xl rounded-full" />
      </div>
    </section>
  );
}
