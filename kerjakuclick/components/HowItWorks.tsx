const steps = [
  {
    n: "01",
    title: "Isi form pesanan",
    desc: "Masukkan nama, nomor HP aktif, alamat lengkap, dan pilih jasa yang Anda butuhkan.",
  },
  {
    n: "02",
    title: "Klik kirim di WhatsApp",
    desc: "Tombol membuka WhatsApp Anda dengan pesan yang sudah tersusun rapi ke nomor operator.",
  },
  {
    n: "03",
    title: "Operator menugaskan mitra",
    desc: "Tim kami meninjau pesanan dan menugaskan mitra terdekat yang tersedia di Kota Palu.",
  },
  {
    n: "04",
    title: "Mitra datang ke rumah",
    desc: "Mitra menuju lokasi, mengerjakan tugas, dan memperbarui status hingga selesai.",
  },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <p className="eyebrow font-mono text-xs uppercase text-bay-deep/70">Cara Kerja</p>
      <h2 className="mt-3 max-w-lg font-display text-3xl font-semibold text-ink sm:text-4xl">
        Dari form ke tukang kerja di depan pintu.
      </h2>

      <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.n} className="relative pl-1">
            <span className="font-mono text-sm text-bridge">{step.n}</span>
            <h3 className="mt-2 font-display text-lg font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm text-ink/65">{step.desc}</p>
            {i < steps.length - 1 && (
              <span
                className="absolute right-[-1.1rem] top-1 hidden text-line lg:inline"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
