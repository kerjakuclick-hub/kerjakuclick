import { services, serviceCategories, formatRupiah } from "@/lib/services";

export default function ServicesGrid() {
  return (
    <section id="layanan" className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="max-w-xl">
        <p className="eyebrow font-mono text-xs uppercase text-bay-deep/70">Layanan &amp; Tarif</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Tiga jasa inti, tarif jelas dari awal.
        </h2>
        <p className="mt-3 text-ink/70">
          Setiap jasa punya dua paket: <span className="font-medium text-ink">Fast</span> untuk kebutuhan
          cepat, dan <span className="font-medium text-ink">PRO</span> untuk cakupan yang lebih besar.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {serviceCategories.map((category) => {
          const variants = services.filter((s) => s.category === category);
          return (
            <div
              key={category}
              className="flex flex-col rounded-card border border-line bg-white p-6 shadow-card"
            >
              <h3 className="font-display text-lg font-semibold text-ink">{category}</h3>
              <div className="mt-5 flex flex-1 flex-col gap-4">
                {variants.map((v) => (
                  <div key={v.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{v.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          v.tier === "PRO" ? "bg-bay-deep text-white" : "bg-bridge/30 text-bay-deep"
                        }`}
                      >
                        {v.tier}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xl font-medium text-ink">
                      {formatRupiah(v.price)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/60">
                      {v.unit} · {v.duration}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink/50">
        Tarif dasar berlaku untuk area Kota Palu. Estimasi durasi dapat menyesuaikan kondisi lapangan.
      </p>
    </section>
  );
}
