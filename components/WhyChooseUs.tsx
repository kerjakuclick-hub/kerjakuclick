// FILE BARU: components/WhyChooseUs.tsx
// Panel gelap di samping form order. Klaim keamanan saya buat LEBIH UMUM
// dulu ("proses seleksi mitra") dibanding versi asli Stitch yang eksplisit
// menyebut "verifikasi KTP" — sampai Anda konfirmasi proses seleksi mitra
// yang sebenarnya. Update kalimatnya begitu saya tahu detail prosesnya.

export default function WhyChooseUs() {
  const points = [
    {
      icon: "🛡️",
      title: "Mitra Terpilih",
      // TODO: ganti dengan proses seleksi asli setelah dikonfirmasi
      desc: "Mitra kami melalui proses seleksi sebelum bergabung melayani rumah Anda.",
    },
    {
      icon: "😊",
      title: "Pasti Selesai",
      desc: "Mitra kami didedikasikan untuk memberikan hasil terbaik sampai Anda puas.",
    },
    {
      icon: "💰",
      title: "Harga Transparan",
      desc: "Harga tertera adalah harga jasa. Tidak ada biaya tambahan yang aneh-aneh.",
    },
  ];

  return (
    <div className="hidden lg:flex flex-col justify-center relative bg-[#12202A] p-10 text-white overflow-hidden">
      <div className="space-y-8 relative z-10">
        <h3 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          Kenapa Memilih Kerjaku?
        </h3>
        <div className="space-y-6">
          {points.map((p) => (
            <div key={p.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-lg">
                {p.icon}
              </div>
              <div>
                <p className="font-bold">{p.title}</p>
                <p className="text-white/70 text-sm">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 right-0 opacity-10 text-[180px] leading-none select-none">
        🏠
      </div>
    </div>
  );
}
