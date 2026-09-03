// GANTI ISI components/ServicesGrid.tsx Anda dengan file ini.
//
// Perubahan: kartu "Layanan Unggulan" sekarang bisa diklik (kecuali yang
// masih "Coming Soon") untuk membuka modal berisi daftar varian jasa
// (Fast/PRO, harga, unit, durasi) dari lib/services.ts, dengan tombol
// "Pesan Sekarang" per varian. Bagian interaktifnya (modal, klik) pindah
// ke ServicesGridInteractive.tsx (Client Component) -- file ini TETAP
// Server Component, cuma nambah field `serviceCategory` (penghubung ke
// kategori di lib/services.ts) & `comingSoon` per kartu, fetch gambar
// dari Supabase tidak berubah.
//
// Cuci Kendaraan & Les Private tetap ditandai comingSoon: true (tidak
// bisa diklik) sesuai keputusan Anda, walau datanya sudah lengkap di
// lib/services.ts -- badge "COMING SOON" di gambar kartu itu sendiri
// (di-upload lewat panel media) tidak disentuh oleh perubahan ini.

import { createClient } from "@/lib/supabase/server";
import ServicesGridInteractive, { type ServiceCardData } from "./ServicesGridInteractive";

const services: Omit<ServiceCardData, "imageUrl">[] = [
  {
    slug: "service_setrika",
    name: "Setrika",
    serviceCategory: "Setrika Pakaian",
    desc: "Pakaian rapi tanpa lelah. Mitra kami ahli dalam menangani berbagai jenis kain.",
    priceFrom: "Rp 40.000",
    duration: "Est. 1-2 Jam",
    badge: "TERPOPULER",
    gradient: "from-[#1D6F8C] to-[#12202A]",
    icon: "🧺",
  },
  {
    slug: "service_bersihkan_rumah",
    name: "Bersihkan Rumah",
    serviceCategory: "Bersihkan Rumah",
    desc: "Pembersihan menyeluruh untuk ruang tamu, kamar tidur, hingga dapur Anda.",
    priceFrom: "Rp 45.000",
    duration: "Est. 1,5-2,5 Jam",
    gradient: "from-[#F5B324] to-[#1D6F8C]",
    icon: "🧹",
  },
  {
    slug: "service_cuci_kendaraan",
    name: "Cuci Kendaraan",
    serviceCategory: "Cuci Kendaraan",
    comingSoon: true,
    desc: "Cuci motor atau mobil langsung di rumah Anda tanpa perlu antre di luar.",
    priceFrom: "Rp 35.000",
    duration: "Est. 1-2 Jam",
    gradient: "from-[#12202A] to-[#1D6F8C]",
    icon: "🚗",
  },
  {
    slug: "service_les_private",
    name: "Les Private",
    serviceCategory: "Les Private",
    comingSoon: true,
    desc: "Bantu anak selesaikan PR & pahami pelajaran sekolah — mengaji, matematika, IPA, hingga komputer.",
    priceFrom: "Rp 65.000",
    duration: "2 Jam / Sesi",
    gradient: "from-[#1D6F8C] to-[#F5B324]",
    icon: "📚",
  },
];

export default async function ServicesGrid() {
  const supabase = createClient();
  const { data: media } = await supabase
    .from("site_media")
    .select("slug, image_url")
    .in(
      "slug",
      services.map((s) => s.slug)
    );

  const imageBySlug = new Map((media ?? []).map((m) => [m.slug, m.image_url]));

  const resolvedServices: ServiceCardData[] = services.map((s) => ({
    ...s,
    imageUrl: imageBySlug.get(s.slug) ?? null,
  }));

  return (
    <section id="services" className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
      <div className="text-center mb-10">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl md:text-3xl font-bold text-[#12202A] mb-2">
          Layanan Unggulan Kami
        </h2>
        <p className="text-[#3f484d] max-w-2xl mx-auto">
          Pilih layanan yang sesuai dengan kebutuhan rumah tangga Anda hari ini.
        </p>
      </div>

      <ServicesGridInteractive services={resolvedServices} />
    </section>
  );
}
