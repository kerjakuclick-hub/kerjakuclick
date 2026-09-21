// GANTI ISI components/ServicesGridInteractive.tsx Anda dengan file ini.
//
// Perubahan: kartu varian di dalam modal (Fast/PRO) sekarang menampilkan
// `v.desc` (deskripsi layanan) dan `v.detilPekerjaan` (daftar detil
// pekerjaan) KALAU field itu ada di lib/services.ts -- untuk sekarang baru
// diisi di Cleaning Fast & Cleaning PRO, jadi ditulis pakai pengecekan
// `v.desc && ...` / `v.detilPekerjaan?.length` supaya varian lain (Setrika,
// Les Private) yang belum diisi tetap tampil normal tanpa bagian ini.
// Tidak ada perubahan pada struktur modal atau event
// "kerjaku:select-service".
//
// Perubahan BARU (20 September 2026) -- migrasi "3 Pilar Layanan": grid
// kartu kategori di atas sekarang cuma 3 kartu (Cuci Kendaraan dihapus
// total dari components/ServicesGrid.tsx), jadi `lg:grid-cols-4` diganti
// `lg:grid-cols-3` supaya baris pertama tidak menyisakan 1 kolom kosong.
//
// REDESAIN PREMIUM (20 September 2026): mengikuti disiplin brand identity
// baru --
//   - `icon` sekarang SLUG ("setrika"/"bersihkan-rumah"/"les-private"),
//     dipetakan lewat SERVICE_ICON_MAP ke ikon custom SVG dari Icons.tsx
//     -- emoji (🧺🧹📚) & field `gradient` (yang pakai warna #1D6F8C, kini
//     eksklusif Form Order) DIHAPUS. Panel ikon sekarang solid Ink dengan
//     aksen Bridge, konsisten dengan bahasa visual TrustBar.
//   - Semua sisa pemakaian #1D6F8C (badge "TERPOPULER", link "Lihat
//     detail") diganti Ink, supaya Bay benar-benar eksklusif untuk
//     OrderForm.tsx.
//
// REVISI STRUKTUR (21 September 2026, mengikuti mockup Canva Anda): tombol
// "Pesan Sekarang" di modal detail jasa tadinya dispatch custom event
// "kerjaku:select-service" + scroll ke id="pesan" di beranda yang sama --
// sekarang form order pindah ke halaman sendiri (/pesan), jadi jasa
// terpilih disimpan ke localStorage "kerjaku_reorder" (persis mekanisme
// yang sudah dipakai tombol "Pesan Lagi" di /riwayat) lalu navigasi ke
// /pesan lewat router -- OrderForm.tsx otomatis baca & prefill dari situ,
// tidak perlu kode baru di OrderForm.tsx.
//
// REVISI BESAR (21 September 2026, "Buat tampilan presisi dengan desain
// dari Canva tersebut"): kartu kategori dirombak mengikuti mockup Anda
// persis -- foto penuh di atas + panel keterangan SOLID Ink (bukan putih)
// dengan judul huruf besar + deskripsi di bawahnya. Badge "TERPOPULER",
// harga "Mulai dari", durasi, dan link "Lihat detail" DIHAPUS dari wajah
// kartu (mockup Anda tidak menampilkannya di kartu) -- semua info itu
// TETAP ada & lengkap begitu kartu diklik (modal detail varian di bawah
// tidak berubah sama sekali, masih tampil harga per varian). Fallback ikon
// custom (kalau `imageUrl` kosong -- lihat ServicesGrid.tsx, field ini
// otomatis terisi begitu Anda upload foto lewat Media Library di admin)
// tetap dipertahankan, cuma dipindah ke DALAM panel Ink supaya konsisten
// dengan gaya panel keterangan foto.
//
// PERBAIKAN PRESISI KARTU (21 September 2026, "Ukuran gambar di media
// sudah presisi 1200x600, namun kartu Setrika & Bersihkan Rumah tidak
// presisi. Ikuti ukuran kartu guru les tepat"): kontainer foto tadinya
// pakai TINGGI TETAP `h-44` (176px) -- ini yang bikin crop tidak presisi
// & tidak konsisten antar kartu karena rasio lebar kolom berbeda-beda di
// breakpoint md/lg (2 vs 3 kolom). Diganti `aspect-[2/1]` (rasio lebar:
// tinggi = 2:1) supaya PERSIS mengunci rasio 1200x600 yang sudah Anda
// upload di Media Library -- hasilnya crop identik & proporsional di
// ketiga kartu, di semua ukuran layar, sama seperti kartu Les Private
// yang jadi acuan. Fallback ikon (kalau `imageUrl` kosong) ikut memakai
// rasio yang sama supaya tinggi kartu tetap konsisten walau foto belum
// diupload.
//
// Link "Lihat Detil" DITAMBAHKAN KEMBALI (permintaan yang sama) di paling
// bawah panel keterangan tiap kartu -- sebelumnya dihapus total dari
// wajah kartu di revisi presisi Canva, sekarang dikembalikan sebagai teks
// kecil warna Bridge di baris terakhir panel Ink, tetap men-trigger modal
// detail varian yang sama (bukan link terpisah).
//
// PENYAMARATAAN TINGGI KARTU (21 September 2026, "sama rata presisi semua
// gambar kartu produk"): setelah perbaikan rasio foto di atas, area
// foto/grafis ketiga kartu sudah presisi identik (2:1) -- tapi TINGGI
// TOTAL kartu masih bisa beda beberapa piksel kalau deskripsi salah satu
// jasa lebih panjang & membungkus ke baris tambahan (mis. Les Private).
// Diperbaiki dengan menjadikan tiap kartu flex column (`flex h-full
// flex-col`) di dalam grid yang stretch (`items-stretch`, perilaku bawaan
// CSS Grid) -- kartu jadi otomatis SAMA TINGGI mengikuti baris tertinggi,
// dan panel keterangan (`flex-1`) mengembang mengisi sisa ruang. Teks
// "Lihat Detil" diberi `mt-auto` supaya selalu menempel presisi di baris
// paling bawah tiap kartu, apa pun panjang deskripsinya -- jadi ketiga
// kartu kini presisi sama rata dari atas sampai bawah, bukan cuma area
// fotonya saja.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { services as serviceVariants, formatRupiah } from "@/lib/services";
import { IronIcon, HomeSparkleIcon, BookOpenIcon } from "./Icons";

export type ServiceCardData = {
  slug: string;
  name: string;
  desc: string;
  priceFrom: string;
  duration: string;
  badge?: string;
  icon: string;
  serviceCategory: string;
  comingSoon?: boolean;
  imageUrl?: string | null;
};

const SERVICE_ICON_MAP: Record<string, typeof IronIcon> = {
  setrika: IronIcon,
  "bersihkan-rumah": HomeSparkleIcon,
  "les-private": BookOpenIcon,
};

export default function ServicesGridInteractive({ services }: { services: ServiceCardData[] }) {
  const router = useRouter();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const activeCard = services.find((s) => s.serviceCategory === openCategory);
  const variants = openCategory
    ? serviceVariants.filter((v) => v.category === openCategory)
    : [];

  function handlePesanSekarang(variantName: string) {
    localStorage.setItem("kerjaku_reorder", JSON.stringify({ jasa: variantName }));
    setOpenCategory(null);
    router.push("/pesan");
  }

  return (
    <>
      <div className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const clickable = !s.comingSoon;
          const Icon = SERVICE_ICON_MAP[s.icon];
          return (
            <div
              key={s.slug}
              onClick={clickable ? () => setOpenCategory(s.serviceCategory) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenCategory(s.serviceCategory);
                      }
                    }
                  : undefined
              }
              className={`flex h-full flex-col overflow-hidden rounded-card border border-ink/5 shadow-card transition-all ${
                clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg" : ""
              }`}
            >
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.imageUrl}
                  alt={s.name}
                  className="aspect-[2/1] w-full shrink-0 object-cover"
                />
              ) : (
                <div className="flex aspect-[2/1] w-full shrink-0 items-center justify-center bg-ink">
                  {Icon && <Icon className="h-12 w-12 text-bridge" strokeWidth={1.4} />}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1.5 bg-ink p-5">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-white">
                  {s.name}
                </h3>
                <p className="text-sm text-white/60">{s.desc}</p>
                <p className="mt-auto pt-1 text-xs font-semibold uppercase tracking-wide text-bridge">
                  Lihat Detil
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {activeCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setOpenCategory(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Detail jasa ${activeCard.name}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-display text-xl font-bold text-ink">{activeCard.name}</h3>
              <button
                type="button"
                onClick={() => setOpenCategory(null)}
                aria-label="Tutup"
                className="shrink-0 rounded-full p-1 text-ink/60 hover:bg-ink/5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6L18 18M6 18L18 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mb-5 text-sm text-ink/60">{activeCard.desc}</p>

            <div className="space-y-3">
              {variants.map((v) => (
                <div key={v.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{v.name}</p>
                      <p className="mt-0.5 text-xs text-ink/60">
                        {v.unit} · {v.duration}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-ink">
                      {formatRupiah(v.price)}
                    </p>
                  </div>

                  {v.desc && <p className="mt-2 text-xs text-ink/60">{v.desc}</p>}

                  {v.detilPekerjaan && v.detilPekerjaan.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink/60">
                      {v.detilPekerjaan.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePesanSekarang(v.name)}
                    className="mt-3 w-full rounded-full bg-bridge px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-105"
                  >
                    Pesan Sekarang
                  </button>
                </div>
              ))}
              {variants.length === 0 && (
                <p className="text-sm text-ink/60">Belum ada varian jasa untuk kategori ini.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
