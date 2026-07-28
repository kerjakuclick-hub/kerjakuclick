export default function Promo() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
      <div className="relative overflow-hidden rounded-card bg-bridge px-8 py-10 sm:px-12">
        <div className="relative max-w-lg">
          <p className="eyebrow font-mono text-xs uppercase text-ink/60">Promo Peluncuran</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
            Pelanggan pertama di kelurahan Anda dapat potongan Rp10.000.
          </h2>
          <p className="mt-3 text-sm text-ink/70">
            Sebut kode <span className="font-mono font-semibold">PALUKLIK</span> saat memesan lewat WhatsApp.
            Berlaku untuk semua kategori jasa, khusus area Kota Palu.
          </p>
          <a
            href="#pesan"
            className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-display text-sm font-semibold text-white transition hover:bg-bay-deep"
          >
            Pakai Promo Sekarang
          </a>
        </div>
      </div>
    </section>
  );
}
