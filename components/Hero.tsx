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
//
// Perubahan BARU (20 September 2026) -- migrasi "3 Pilar Layanan": "Cuci
// Kendaraan" dihapus dari tagline (layanan ini dihapus total dari sistem).
//
// REDESAIN PREMIUM (20 September 2026): mengikuti disiplin brand identity
// baru --
//   - Elemen dekoratif "blur-blob" generik (bg-[#F5B324]/20 blur-3xl
//     rounded-full) DIHAPUS -- diganti siluet Jembatan Kuning (BridgeMotif
//     dari Icons.tsx) sangat samar sebagai watermark bermerek, bukan efek
//     generik AI.
//   - Warna #1D6F8C (Bay) DIHAPUS dari sini -- per aturan brand baru warna
//     itu KHUSUS untuk section Form Order (OrderForm.tsx). Centang
//     "Tanpa Biaya Admin" sekarang pakai Ink.
//   - Tombol kedua "Daftar Jadi Mitra" (Ink, #12202A) ditambahkan di
//     samping tombol utama "Pesan Sekarang" (Bridge, #F5B324), sesuai
//     pemetaan warna tombol di brand spec.
//   - Kartu preview WA dinaikkan ke shadow-card & radius token design
//     system (rounded-card), bukan lagi nilai hex arbitrary yang tersebar.

import Link from "next/link";
import WhatsAppPreview from "./WhatsAppPreview";
import { BridgeMotif } from "./Icons";

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
    <section className="relative overflow-hidden">
      {/* Watermark bermerek -- siluet Jembatan Kuning, sangat samar, jauh
          lebih tenang & custom dibanding blur-blob gradient generik. */}
      <BridgeMotif className="bridge-motif pointer-events-none absolute -bottom-6 left-1/2 hidden h-auto w-[140%] max-w-none -translate-x-1/2 opacity-[0.06] md:block" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <p className="eyebrow font-mono text-xs font-semibold uppercase text-ink/50">
            kerjaku.click &middot; Kota Palu
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Jasa Tenaga Kerja ke Rumah Anda, Sekali Klik.
          </h1>
          <p className="text-lg leading-relaxed text-ink/70">
            Solusi praktis bikin hidup bernilai. Setrika &middot; Bersihkan Rumah &middot;
            Les Private. Mitra terverifikasi &amp; profesional.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#order-form"
              className="rounded-full bg-bridge px-8 py-3.5 text-center font-display text-sm font-semibold text-ink shadow-card transition hover:brightness-105"
            >
              Pesan Sekarang
            </a>
            <Link
              href="/daftar-mitra"
              className="rounded-full border border-ink/15 bg-transparent px-8 py-3.5 text-center font-display text-sm font-semibold text-ink transition hover:bg-ink hover:text-white"
            >
              Daftar Jadi Mitra
            </Link>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs font-bold uppercase tracking-wide text-ink/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4.5 12.5l4.5 4.5 10-11"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Tanpa Biaya Admin Tersembunyi
          </div>
        </div>

        <div className="relative">
          <div className="mx-auto max-w-sm rotate-2 overflow-hidden rounded-card border border-ink/5 bg-white shadow-card md:rotate-3">
            <WhatsAppPreview message={CONTOH_PESAN} compact />
          </div>
        </div>
      </div>
    </section>
  );
}
