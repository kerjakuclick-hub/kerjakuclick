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
//     itu KHUSUS untuk section Form Order (OrderForm.tsx).
//   - Kartu preview WA dinaikkan ke shadow-card & radius token design
//     system (rounded-card), bukan lagi nilai hex arbitrary yang tersebar.
//
// UPDATE COPY HEADLINE (20 September 2026, dari Anda langsung): headline
// & subheadline ditukar posisinya + headline sekarang dua warna sesuai
// spec Anda -- "Solusi Praktis Bikin Hidup Bernilai." (Ink #12202A) +
// "Sekali Klik!" (Bay #1D6F8C, pakai token `text-bay`). CATATAN: ini
// pengecualian yang disengaja terhadap aturan "Bay eksklusif Form Order"
// -- di sini dipakai sebagai aksen 1 frasa pendek di Hero, bukan dipakai
// meluas, jadi Ink tetap dominan secara keseluruhan halaman.
//
// REVISI LAYOUT (20 September 2026, mengikuti referensi kliknclean.com):
//   - Baris trust badge (ikon dalam lingkaran + label di bawahnya) yang
//     tadinya section TrustBar.tsx terpisah (bar gelap penuh setelah Hero)
//     sekarang DIPINDAH ke dalam Hero sendiri, spanning penuh di bawah 2
//     kolom -- sesuai pola referensi. TrustBar.tsx TIDAK dihapus (disimpan
//     untuk kemungkinan dipakai lagi di halaman lain), tapi tidak lagi
//     dipanggil dari app/page.tsx.
//   - Anda memilih TANPA foto tim/mitra dulu di kolom kanan (belum ada
//     aset foto yang sesuai brand -- lihat catatan di public/) -- kartu
//     preview WA yang sudah ada dipertahankan sebagai elemen visual kanan,
//     bukan diganti foto generik/stok.
//
// REVISI (20 September 2026, revisi 2, dari Anda langsung): isi baris
// badge diganti dari 3 klaim umum (Mitra Terverifikasi/Bayar Tunai/Area
// Kota Palu) jadi 5 klaim spesifik fitur platform, PERSIS jumlah & gaya
// baris badge di referensi kliknclean.com (5 ikon+label): Mitra
// Terverifikasi, Pilih Preferensi Mitra, Chat & Lokasi di Website, Bisa
// Tambah Waktu Kerja, Harga Transparan. Ikonnya reuse dari yang sudah ada
// di Icons.tsx (dipakai juga di WhyChooseUs.tsx).

import {
  BridgeMotif,
  ShieldCheckIcon,
  SlidersIcon,
  MessageLockIcon,
  ClockPlusIcon,
  WalletIcon,
} from "./Icons";
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

const TRUST_ITEMS = [
  { icon: ShieldCheckIcon, label: "Mitra Terverifikasi" },
  { icon: SlidersIcon, label: "Pilih Preferensi Mitra" },
  { icon: MessageLockIcon, label: "Chat & Lokasi di Website" },
  { icon: ClockPlusIcon, label: "Bisa Tambah Waktu Kerja" },
  { icon: WalletIcon, label: "Harga Transparan" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Watermark bermerek -- siluet Jembatan Kuning, sangat samar, jauh
          lebih tenang & custom dibanding blur-blob gradient generik. */}
      <BridgeMotif className="bridge-motif pointer-events-none absolute -bottom-6 left-1/2 hidden h-auto w-[140%] max-w-none -translate-x-1/2 opacity-[0.06] md:block" />

      <div className="relative mx-auto max-w-[1200px] px-6 py-12 md:py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <p className="eyebrow font-mono text-xs font-semibold uppercase text-ink/50">
              kerjaku.click &middot; Kota Palu
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
              Solusi Praktis Bikin Hidup Bernilai.{" "}
              <span className="text-bay">Sekali Klik!</span>
            </h1>
            <p className="text-lg leading-relaxed text-ink/70">
              Jasa tenaga kerja ke rumah-rumah Anda. Setrika &middot; Bersihkan Rumah &middot;
              Guru Les Private. Mitra profesional &amp; terverifikasi.
            </p>
            <a
              href="#order-form"
              className="inline-block rounded-full bg-bridge px-8 py-3.5 text-center font-display text-sm font-semibold text-ink shadow-card transition hover:brightness-105"
            >
              Pesan Sekarang
            </a>
          </div>

          <div className="relative">
            <div className="mx-auto max-w-sm rotate-2 overflow-hidden rounded-card border border-ink/5 bg-white shadow-card md:rotate-3">
              <WhatsAppPreview message={CONTOH_PESAN} compact />
            </div>
          </div>
        </div>

        {/* Baris trust badge -- pola dari referensi kliknclean.com: ikon
            dalam cincin outline + label di bawahnya, spanning penuh. */}
        <div className="mt-14 flex flex-wrap justify-center gap-x-6 gap-y-6 border-t border-ink/10 pt-10 sm:justify-between md:mt-16">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="flex w-32 flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15">
                <item.icon className="h-5 w-5 text-ink" />
              </div>
              <span className="text-xs font-semibold text-ink/70">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
