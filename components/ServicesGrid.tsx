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
// PERUBAHAN BESAR (20 September 2026) -- migrasi arsitektur "3 Pilar
// Layanan" versi baru (dokumen "STRUKTUR VERSI BARU KERJAKU.CLICK"):
//   - Kartu "Cuci Kendaraan" DIHAPUS TOTAL dari grid beranda -- layanan ini
//     sudah dihapus total dari sistem (lib/services.ts), bukan cuma
//     disembunyikan lagi.
//   - Kartu "Les Private" tidak lagi "Coming Soon" -- `comingSoon: true`
//     dihapus karena Les Private sekarang jasa yang bisa langsung dipesan
//     (flat Fast Rp65.000/1 Jam, PRO Rp100.000/2 Jam per sesi). Teks
//     `duration` diupdate jadi "1-2 Jam / Sesi" mencerminkan split
//     Fast=1 Jam / PRO=2 Jam tsb.
// Tidak ada perubahan lain -- fetch gambar dari Supabase &
// serviceCategory tetap sama untuk kartu yang tersisa.
//
// REDESAIN PREMIUM (20 September 2026): field `icon` yang tadinya emoji
// mentah ("🧺" dst) diganti SLUG ("setrika"/"bersihkan-rumah"/
// "les-private") -- rendering ikon sesungguhnya (SVG custom dari
// Icons.tsx) sekarang jadi tanggung jawab ServicesGridInteractive.tsx
// lewat SERVICE_ICON_MAP, supaya tidak ada emoji lagi di kartu layanan.
// Field `gradient` (yang sebelumnya memakai #1D6F8C -- warna itu sekarang
// KHUSUS section Form Order) sudah tidak dipakai lagi di
// ServicesGridInteractive.tsx yang baru, tapi tetap disimpan di data ini
// untuk kompatibilitas tipe & jaga-jaga.

import { createClient } from "@/lib/supabase/server";
import {
  cheapestPriceInCategory,
  formatRupiah,
  orderableServices,
  serviceCategoryList,
} from "@/lib/services";
import { ensureBusinessParams } from "@/lib/businessParams";
import ServicesGridInteractive, { type ServiceCardData } from "./ServicesGridInteractive";

const services: Omit<ServiceCardData, "imageUrl" | "priceFrom">[] = [
  {
    slug: "service_setrika",
    name: "Setrika",
    serviceCategory: "Setrika Pakaian",
    desc: "Pakaian rapi tanpa lelah. Mitra kami ahli dalam menangani berbagai jenis kain.",
    duration: "Est. 1-2 Jam",
    badge: "TERPOPULER",
    icon: "setrika",
  },
  {
    slug: "service_bersihkan_rumah",
    name: "Bersihkan Rumah",
    serviceCategory: "Bersihkan Rumah",
    desc: "Pembersihan menyeluruh untuk ruang tamu, kamar tidur, hingga dapur Anda.",
    duration: "Est. 1,5-2 Jam",
    icon: "bersihkan-rumah",
  },
  {
    slug: "service_les_private",
    name: "Les Private",
    serviceCategory: "Les Private",
    desc: "Bantu anak selesaikan PR & pahami pelajaran sekolah — mengaji, matematika, IPA, hingga komputer.",
    duration: "1-2 Jam / Sesi",
    icon: "les-private",
  },
];

// PARAMETER BISNIS (migrasi 040): harga "Mulai dari" dibaca dari katalog
// di database. 3 kartu inti di atas tetap tampil dengan foto/teksnya
// (selama kategorinya aktif & punya produk). Kategori BARU yang ditambah
// Super Admin otomatis dapat kartu tambahan (ikon default; foto bisa
// diupload lewat Media Library dengan slug "service_<slug-kategori>").
function buildCards(): Omit<ServiceCardData, "imageUrl" | "priceFrom">[] {
  const hasProducts = (cat: string) => orderableServices.some((v) => v.category === cat);
  const curated = services.filter((s) => hasProducts(s.serviceCategory));
  const curatedCats = new Set(services.map((s) => s.serviceCategory));
  const extra = serviceCategoryList
    .filter((c) => !curatedCats.has(c.name) && hasProducts(c.name))
    .map((c) => {
      const products = orderableServices.filter((v) => v.category === c.name);
      const durations = Array.from(new Set(products.map((v) => v.duration).filter(Boolean)));
      return {
        slug: `service_${c.id.replace(/-/g, "_")}`,
        name: c.buttonLabel || c.name,
        serviceCategory: c.name,
        desc: products.find((v) => v.desc)?.desc ?? `Layanan ${c.name} oleh mitra terlatih kerjaku.click.`,
        duration: durations.length ? `Est. ${durations.join(" / ")}` : "",
        icon: "default",
      };
    });
  return [...curated, ...extra];
}

export default async function ServicesGrid() {
  await ensureBusinessParams();
  const cards = buildCards();
  const supabase = createClient();
  const { data: media } = await supabase
    .from("site_media")
    .select("slug, image_url")
    .in(
      "slug",
      cards.map((s) => s.slug)
    );

  const imageBySlug = new Map((media ?? []).map((m) => [m.slug, m.image_url]));

  const resolvedServices: ServiceCardData[] = cards.map((s) => {
    const cheapest = cheapestPriceInCategory(s.serviceCategory);
    return {
      ...s,
      imageUrl: imageBySlug.get(s.slug) ?? null,
      priceFrom: cheapest !== null ? formatRupiah(cheapest) : "-",
    };
  });

  return (
    <section id="services" className="mx-auto max-w-[1200px] px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <p className="eyebrow font-mono text-xs font-semibold uppercase text-ink/50">
          Layanan Unggulan
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">
          Pilih Kebutuhan Rumah Anda
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-ink/60">
          Tiga layanan inti kami, siap dipesan langsung lewat WhatsApp.
        </p>
      </div>

      <ServicesGridInteractive services={resolvedServices} />
    </section>
  );
}
