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
import Link from "next/link";
import OrderForm from "@/components/OrderForm";

// BARU (25 September 2026) -- MODE JEDA PESANAN: kalau env
// ORDER_PAUSE_MODE di Vercel = "true", tampil bar pengumuman di atas
// formulir. Formulir TETAP bisa diisi; pesanan yang terkirim dibalas
// otomatis lewat WA (lib/whatsapp.ts buildOrderPausedReply) dan tidak
// disimpan. Ubah env lalu redeploy untuk menyalakan/mematikan.
const ORDER_PAUSED = process.env.ORDER_PAUSE_MODE === "true";

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
        {ORDER_PAUSED && (
          <div className="border-b border-bridge/40 bg-bridge/15">
            <div className="mx-auto flex max-w-[1200px] gap-3 px-5 py-4 sm:px-8">
              <span aria-hidden="true" className="text-xl leading-6">📢</span>
              <div className="text-sm leading-relaxed text-ink">
                <p className="font-semibold">
                  kerjaku.click sedang Pelatihan Mitra &amp; Rekrutmen Mitra Baru
                </p>
                <p className="mt-0.5 text-ink/75">
                  Kami sedang meningkatkan skill mitra dengan SOP &amp; sistem layanan baru, sekaligus
                  merekrut mitra baru. Untuk sementara pesanan <strong>belum kami layani</strong> —
                  layanan akan dibuka kembali setelah pelatihan selesai. Tertarik bergabung?{" "}
                  <Link href="/daftar-mitra" className="font-semibold text-bay underline underline-offset-2">
                    Daftar jadi mitra
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
        <OrderForm />
      </main>
      <Footer />
    </>
  );
}
