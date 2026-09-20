// FILE BARU: components/WhyChooseUs.tsx
// Panel gelap di samping form order. Klaim keamanan saya buat LEBIH UMUM
// dulu ("proses seleksi mitra") dibanding versi asli Stitch yang eksplisit
// menyebut "verifikasi KTP" — sampai Anda konfirmasi proses seleksi mitra
// yang sebenarnya. Update kalimatnya begitu saya tahu detail prosesnya.
//
// REDESAIN PREMIUM (20 September 2026): emoji (🛡️😊💰) diganti ikon custom
// SVG dari Icons.tsx (ShieldCheckIcon, HeartHandshakeIcon, WalletIcon), dan
// emoji dekoratif raksasa 🏠 di pojok diganti siluet Jembatan Kuning
// (BridgeMotif) sangat samar -- watermark bermerek, bukan efek generik AI.

import { ShieldCheckIcon, HeartHandshakeIcon, WalletIcon, BridgeMotif } from "./Icons";

export default function WhyChooseUs() {
  const points = [
    {
      Icon: ShieldCheckIcon,
      title: "Mitra Terpilih",
      // TODO: ganti dengan proses seleksi asli setelah dikonfirmasi
      desc: "Mitra kami melalui proses seleksi sebelum bergabung melayani rumah Anda.",
    },
    {
      Icon: HeartHandshakeIcon,
      title: "Pasti Selesai",
      desc: "Mitra kami didedikasikan untuk memberikan hasil terbaik sampai Anda puas.",
    },
    {
      Icon: WalletIcon,
      title: "Harga Transparan",
      desc: "Harga tertera adalah harga jasa. Tidak ada biaya tambahan yang aneh-aneh.",
    },
  ];

  return (
    <div className="relative hidden flex-col justify-center overflow-hidden bg-ink p-10 text-white lg:flex">
      <div className="relative z-10 space-y-8">
        <h3 className="font-display text-2xl font-bold">Kenapa Memilih Kerjaku?</h3>
        <div className="space-y-6">
          {points.map((p) => (
            <div key={p.title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <p.Icon className="h-5 w-5 text-bridge" />
              </div>
              <div>
                <p className="font-bold">{p.title}</p>
                <p className="text-sm text-white/70">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BridgeMotif className="pointer-events-none absolute -bottom-4 -right-10 h-auto w-72 text-white opacity-[0.08]" />
    </div>
  );
}
