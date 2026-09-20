// FILE BARU: components/TrustBar.tsx
// Bar kepercayaan singkat di bawah Hero — badge cepat, bukan klaim
// mendalam (klaim detail sudah dipindah ke FAQ, menunggu konfirmasi Anda).
//
// STATUS (20 September 2026, mengikuti referensi kliknclean.com): section
// ini SEMENTARA TIDAK dipanggil dari app/page.tsx -- 3 badge-nya (Mitra
// Terverifikasi, Bayar Tunai Setelah Selesai, Area Kota Palu) sudah
// dipindah & digabung ke DALAM <Hero /> sendiri (baris ikon + label di
// bawah headline/CTA, menyatu 1 section, sesuai pola referensi yang Anda
// kirim). Komponen ini SENGAJA tidak dihapus -- disimpan siapa tahu masih
// mau dipakai sebagai bar gelap terpisah di halaman lain (mis. /riwayat
// atau /daftar-mitra) di fase redesain berikutnya. Kalau sampai fase
// selesai tidak terpakai sama sekali, boleh dihapus.

import { ShieldCheckIcon, BanknoteIcon, MapPinIcon } from "./Icons";

export default function TrustBar() {
  const items = [
    { icon: ShieldCheckIcon, label: "Mitra Terverifikasi" },
    { icon: BanknoteIcon, label: "Bayar Tunai Setelah Selesai" },
    { icon: MapPinIcon, label: "Area Kota Palu" },
  ];

  return (
    <section className="bg-ink text-white py-6">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className="w-5 h-5 text-bridge shrink-0" />
            <span className="font-semibold text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
