// GANTI ISI components/HowItWorks.tsx Anda dengan file ini.

const steps = [
  {
    number: 1,
    icon: "📋",
    title: "Isi Formulir",
    desc: "Lengkapi detail layanan dan alamat Anda di website ini.",
  },
  {
    number: 2,
    icon: "💬",
    title: "Pesanan Masuk WA",
    desc: "Admin akan mengonfirmasi pesanan Anda melalui WhatsApp.",
  },
  {
    number: 3,
    icon: "🧑‍🔧",
    title: "Tugaskan Mitra",
    desc: "Admin menugaskan mitra yang sesuai keahlian & preferensi Anda.",
  },
  {
    number: 4,
    icon: "✅",
    title: "Mitra Datang",
    desc: "Mitra bekerja, dan Anda bayar tunai setelah semua selesai.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#ebefeb] py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl md:text-3xl font-bold text-[#12202A] mb-2">
            Cara Pesan Mudah
          </h2>
          <p className="text-[#3f484d]">
            Hanya perlu 4 langkah sederhana untuk mendapatkan bantuan.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative p-6 bg-white rounded-xl border border-[#12202A]/5 text-center space-y-2"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 bg-[#1D6F8C] text-white rounded-full flex items-center justify-center font-bold text-sm">
                {step.number}
              </div>
              <div className="pt-2 text-4xl">{step.icon}</div>
              <h4 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-[#12202A]">
                {step.title}
              </h4>
              <p className="text-sm text-[#3f484d]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
