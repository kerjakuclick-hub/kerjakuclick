// GANTI ISI components/HowItWorks.tsx Anda dengan file ini.
//
// REDESAIN PREMIUM (20 September 2026): badge nomor langkah & lingkaran
// ikon yang tadinya pakai #1D6F8C (Bay) diganti Ink -- warna Bay sekarang
// eksklusif untuk section Form Order (OrderForm.tsx).

import {
  ClipboardListIcon,
  ChatIcon,
  UserCheckIcon,
  CheckCircleIcon,
} from "./Icons";

const steps = [
  {
    number: 1,
    icon: ClipboardListIcon,
    title: "Isi Formulir",
    desc: "Lengkapi detail layanan dan alamat Anda di website ini.",
  },
  {
    number: 2,
    icon: ChatIcon,
    title: "Pesanan Masuk WA",
    desc: "Admin akan mengonfirmasi pesanan Anda melalui WhatsApp.",
  },
  {
    number: 3,
    icon: UserCheckIcon,
    title: "Tugaskan Mitra",
    desc: "Admin menugaskan mitra yang sesuai keahlian & preferensi Anda.",
  },
  {
    number: 4,
    icon: CheckCircleIcon,
    title: "Mitra Datang",
    desc: "Mitra bekerja, dan Anda bayar tunai setelah semua selesai.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#ebefeb] py-16 md:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-10 text-center">
          <p className="eyebrow font-mono text-xs font-semibold uppercase text-ink/50">
            Cara Pesan
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">
            Empat Langkah Sederhana
          </h2>
          <p className="mt-2 text-ink/60">
            Hanya perlu 4 langkah sederhana untuk mendapatkan bantuan.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative space-y-2 rounded-card border border-ink/5 bg-white p-6 text-center"
            >
              <div className="absolute -top-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                {step.number}
              </div>
              <div className="flex items-center justify-center pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/8">
                  <step.icon className="h-6 w-6 text-ink" />
                </div>
              </div>
              <h4 className="font-display font-semibold text-ink">{step.title}</h4>
              <p className="text-sm text-ink/60">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
