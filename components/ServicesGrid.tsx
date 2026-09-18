// GANTI ISI components/ServicesGrid.tsx Anda dengan file ini.
//
// Perubahan: kartu "Bersihkan Rumah" di beranda pakai `priceFrom` &
// `duration` yang di-hardcode di sini (terpisah dari lib/services.ts,
// jadi tidak ikut ter-update otomatis saat harga di lib/services.ts
// diubah) -- disamakan sekarang dengan harga & durasi terbaru:
// Cleaning Fast Rp55.000 (sebelumnya Rp45.000) & Cleaning PRO 3 Jam
// (sebelumnya 2.5 Jam), jadi "Mulai dari Rp 55.000" & "Est. 1,5-3 Jam".
//
// Revisi BARU (15 September 2026): durasi kerja Cleaning PRO dikoreksi
// 3 Jam -> 2 Jam (harga TETAP Rp95.000, lihat lib/services.ts), jadi
// rentang durasi kartu "Bersihkan Rumah" berubah dari "Est. 1,5-3 Jam"
// -> "Est. 1,5-2 Jam". Kartu "Setrika" TIDAK berubah (Setrika PRO cuma
// naik harga jadi Rp80.000, durasi 2 Jam tetap sama seperti sebelumnya).
//
// PERBAIKAN BARU (18 September 2026): angka "priceFrom" di atas SEMPAT
// ketinggalan lagi setelah harga di lib/services.ts diupdate ikut Dokumen
// Bisnis Revisi Pasca-Audit Fraud (Setrika Rp40rb->Rp55rb, Cleaning
// Rp55rb->Rp65rb) -- ini persis akibat yang sudah diperingatkan di catatan
// atas: `priceFrom` di-hardcode terpisah, jadi tidak ikut berubah otomatis.
// Supaya tidak berulang lagi, `priceFrom` SEKARANG DIHITUNG LANGSUNG dari
// harga termurah tiap kategori di lib/services.ts (cheapestPriceInCategory)
// -- field `priceFrom` string di data di bawah DIHAPUS, tidak perlu di-
// update manual lagi kalau harga berubah lagi nanti. `duration` tetap teks
// manual di sini (rentang durasi tidak bisa diturunkan otomatis dengan
// akurat dari data harga).
//
// Tidak ada perubahan lain -- kartu Cuci Kendaraan, Les Private,
// fetch gambar dari Supabase, & serviceCategory/comingSoon tetap sama
// (comingSoon: true untuk keduanya sudah benar & TIDAK terkait dengan
// pengecualian `orderable: false` di form pemesanan -- dua hal yang
// berbeda, kartu beranda ini boleh tetap tampil sebagai preview).

import { createClient } from "@/lib/supabase/server";
import { cheapestPriceInCategory, formatRupiah } from "@/lib/services";
import ServicesGridInteractive, { type ServiceCardData } from "./ServicesGridInteractive";

const services: Omit<ServiceCardData, "imageUrl" | "priceFrom">[] = [
  {
    slug: "service_setrika",
    name: "Setrika",
    serviceCategory: "Setrika Pakaian",
    desc: "Pakaian rapi tanpa lelah. Mitra kami ahli dalam menangani berbagai jenis kain.",
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
    duration: "Est. 1,5-2 Jam",
    gradient: "from-[#F5B324] to-[#1D6F8C]",
    icon: "🧹",
  },
  {
    slug: "service_cuci_kendaraan",
    name: "Cuci Kendaraan",
    serviceCategory: "Cuci Kendaraan",
    comingSoon: true,
    desc: "Cuci motor atau mobil langsung di rumah Anda tanpa perlu antre di luar.",
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

  const resolvedServices: ServiceCardData[] = services.map((s) => {
    const cheapest = cheapestPriceInCategory(s.serviceCategory);
    return {
      ...s,
      imageUrl: imageBySlug.get(s.slug) ?? null,
      priceFrom: cheapest !== null ? formatRupiah(cheapest) : "-",
    };
  });

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
