// FILE BARU: components/TrustBar.tsx
// Bar kepercayaan singkat di bawah Hero — badge cepat, bukan klaim
// mendalam (klaim detail sudah dipindah ke FAQ, menunggu konfirmasi Anda).

export default function TrustBar() {
  const items = [
    { icon: "✓", label: "Mitra Terverifikasi" },
    { icon: "₨", label: "Bayar Tunai Setelah Selesai" },
    { icon: "📍", label: "Area Kota Palu" },
  ];

  return (
    <section className="bg-[#12202A] text-white py-6">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-[#F5B324] text-lg">{item.icon}</span>
            <span className="font-semibold text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
