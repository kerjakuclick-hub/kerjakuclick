// FILE BARU: components/KenapaMemilihKami.tsx
// Dibuat 21 September 2026, mengikuti mockup Canva Home page Anda persis --
// bar penuh warna Bay (#1D6F8C -- sudah dicek dengan color-picker, PERSIS
// token `bay` yang sudah ada) berisi 3 kolom bernomor, di antara
// <ServicesGrid /> dan <MitraShowcase /> di app/page.tsx.
//
// Isi 3 poin persis teks di mockup Anda -- ini 3 dari 4 poin yang sudah ada
// di components/WhyChooseUs.tsx (poin "Chat & Lokasi" tidak dipakai di sini
// karena mockup Anda cuma menampilkan 3, tapi WhyChooseUs.tsx sendiri TIDAK
// diubah -- masih tampil lengkap 4 poin di panel /pesan).

const ITEMS = [
  {
    number: "01",
    title: "Mitra Terverifikasi",
    desc: "Mitra kami melalui proses verifikasi sebelum bergabung melayani rumah Anda.",
  },
  {
    number: "02",
    title: "Pilih Preferensi Mitra",
    desc: "Bebas pilih mitra Pria, Wanita, atau Bebas sesuai kenyamanan Anda.",
  },
  {
    number: "03",
    title: "Bisa Tambah Durasi",
    desc: "Butuh waktu lebih? Tambah durasi kerja mitra langsung dari halaman Riwayat Pesanan.",
  },
];

export default function KenapaMemilihKami() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 pt-4 text-center md:pt-6">
        <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">
          Kenapa Memilih Kami?
        </h2>
      </div>

      <div className="mt-10 bg-bay text-white md:mt-12">
        <div className="mx-auto grid max-w-[1200px] divide-y divide-white/15 md:grid-cols-3 md:divide-x md:divide-y-0">
          {ITEMS.map((item) => (
            <div key={item.number} className="px-8 py-10 md:px-10 md:py-14">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-white">
                {item.number}
              </span>
              <p className="mt-5 font-display text-lg font-bold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
