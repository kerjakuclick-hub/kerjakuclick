// GANTI ISI components/ServicesGrid.tsx Anda dengan file ini.
//
// Perubahan dari versi redesign sebelumnya: sekarang Server Component
// (async) yang mengambil gambar dari tabel site_media. Kalau admin belum
// upload foto untuk slot tertentu, otomatis fallback ke gradient+emoji
// (tidak pernah tampil rusak/kosong).

import { createClient } from "@/lib/supabase/server";

const services = [
  {
    slug: "service_setrika",
    name: "Setrika",
    desc: "Pakaian rapi tanpa lelah. Mitra kami ahli dalam menangani berbagai jenis kain.",
    priceFrom: "Rp 40.000",
    duration: "Est. 1-2 Jam",
    badge: "TERPOPULER",
    gradient: "from-[#1D6F8C] to-[#12202A]",
    icon: "🧺",
  },
  {
    slug: "service_bersihkan_rumah",
    name: "Bersihkan Rumah",
    desc: "Pembersihan menyeluruh untuk ruang tamu, kamar tidur, hingga dapur Anda.",
    priceFrom: "Rp 45.000",
    duration: "Est. 1,5-2,5 Jam",
    gradient: "from-[#F5B324] to-[#1D6F8C]",
    icon: "🧹",
  },
  {
    slug: "service_cuci_kendaraan",
    name: "Cuci Kendaraan",
    desc: "Cuci motor atau mobil langsung di rumah Anda tanpa perlu antre di luar.",
    priceFrom: "Rp 35.000",
    duration: "Est. 1-2 Jam",
    gradient: "from-[#12202A] to-[#1D6F8C]",
    icon: "🚗",
  },
];

export default async function ServicesGrid() {
  const supabase = createClient();
  const { data: media } = await supabase
    .from("site_media")
    .select("slug, image_url")
    .in(
      "slug",
      services.map((s) => s.slug)
    );

  const imageBySlug = new Map((media ?? []).map((m) => [m.slug, m.image_url]));

  return (
    <section id="services" className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
      <div className="text-center mb-10">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl md:text-3xl font-bold text-[#12202A] mb-2">
          Layanan Unggulan Kami
        </h2>
        <p className="text-[#3f484d] max-w-2xl mx-auto">
          Pilih layanan yang sesuai dengan kebutuhan rumah tangga Anda hari ini.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {services.map((s) => {
          const imageUrl = imageBySlug.get(s.slug);
          return (
            <div
              key={s.name}
              className="bg-white rounded-xl overflow-hidden border border-[#12202A]/5 shadow-[0px_4px_20px_rgba(18,32,42,0.05)] hover:shadow-[0px_8px_30px_rgba(18,32,42,0.08)] hover:-translate-y-0.5 transition-all"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={s.name} className="h-40 w-full object-cover" />
              ) : (
                <div
                  className={`h-40 w-full bg-gradient-to-br ${s.gradient} flex items-center justify-center text-5xl`}
                >
                  {s.icon}
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-lg text-[#12202A]">
                    {s.name}
                  </h3>
                  {s.badge && (
                    <span className="bg-[#1D6F8C]/10 text-[#1D6F8C] text-[10px] font-bold px-2 py-1 rounded uppercase">
                      {s.badge}
                    </span>
                  )}
                </div>
                <p className="text-[#3f484d] text-sm">{s.desc}</p>
                <div className="flex justify-between items-center pt-3 border-t border-[#dfe3e0]">
                  <div>
                    <p className="text-xs text-[#3f484d] uppercase font-bold tracking-wide">
                      Mulai dari
                    </p>
                    <p className="font-semibold text-[#12202A]">{s.priceFrom}</p>
                  </div>
                  <span className="text-xs text-[#3f484d]">{s.duration}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
