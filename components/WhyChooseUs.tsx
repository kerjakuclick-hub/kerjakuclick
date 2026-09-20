// FILE BARU: components/WhyChooseUs.tsx
// Panel gelap di samping form order.
//
// REDESAIN PREMIUM (20 September 2026): emoji (🛡️😊💰) diganti ikon custom
// SVG dari Icons.tsx (ShieldCheckIcon, HeartHandshakeIcon, WalletIcon), dan
// emoji dekoratif raksasa 🏠 di pojok diganti siluet Jembatan Kuning
// (BridgeMotif) sangat samar -- watermark bermerek, bukan efek generik AI.
//
// UPDATE KONTEN (20 September 2026, dari Anda langsung): 3 poin generik
// ("Mitra Terpilih/Pasti Selesai/Harga Transparan" -- yang pertama masih
// menunggu konfirmasi proses seleksi) DIGANTI 4 poin konkret sesuai fitur
// yang benar-benar ada di platform: verifikasi mitra, preferensi
// Pria/Wanita/Bebas (lihat OrderForm.tsx), chat + share lokasi di dalam
// website (lihat OrderChatCustomer.tsx), dan tambah durasi kerja (lihat
// ExtraTimeButton.tsx). Ikon baru: SlidersIcon, MessageLockIcon,
// ClockPlusIcon.

import { ShieldCheckIcon, SlidersIcon, MessageLockIcon, ClockPlusIcon, BridgeMotif } from "./Icons";

export default function WhyChooseUs() {
  const points = [
    {
      Icon: ShieldCheckIcon,
      title: "Mitra Terverifikasi",
      desc: "Mitra kami melalui proses verifikasi sebelum bergabung melayani rumah Anda.",
    },
    {
      Icon: SlidersIcon,
      title: "Pilih Preferensi Mitra",
      desc: "Bebas pilih mitra Pria, Wanita, atau Bebas sesuai kenyamanan Anda.",
    },
    {
      Icon: MessageLockIcon,
      title: "Chat & Lokasi di Satu Tempat",
      desc: "Konfirmasi mitra dan share lokasi lewat chat dalam website -- privasi Anda tetap terjaga.",
    },
    {
      Icon: ClockPlusIcon,
      title: "Bisa Tambah Durasi",
      desc: "Butuh waktu lebih? Tambah durasi kerja mitra langsung dari halaman Riwayat Pesanan.",
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
