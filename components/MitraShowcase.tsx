// GANTI ISI components/MitraShowcase.tsx Anda dengan file ini.
// Perubahan: skill_category sekarang array, ditampilkan digabung koma.
//
// REDESAIN PREMIUM (20 September 2026): semua pemakaian #1D6F8C (border
// kartu, strip header "ID Card Mitra", label keahlian) diganti Ink --
// warna Bay sekarang eksklusif untuk section Form Order (OrderForm.tsx).
// Aksen bintang rating tetap Bridge (#F5B324), sesuai brand.
//
// REVISI (20 September 2026, dari Anda langsung): tombol "Daftar Mitra"
// (Ink #12202A) ditambahkan di bawah kartu foto mitra -- ajakan jadi mitra
// tepat setelah pengunjung lihat mitra asli yang sudah bergabung.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MitraShowcase() {
  const supabase = createClient();

  const { data: mitraList } = await supabase.rpc("public_mitra_showcase");

  if (!mitraList || mitraList.length === 0) {
    return null;
  }

  const featured = [...mitraList]
    .sort((a, b) => {
      const aHasPhoto = a.photo_url ? 1 : 0;
      const bHasPhoto = b.photo_url ? 1 : 0;
      if (aHasPhoto !== bHasPhoto) return bHasPhoto - aHasPhoto;

      const aRating = a.rating ?? -1;
      const bRating = b.rating ?? -1;
      return bRating - aRating;
    })
    .slice(0, 3);

  return (
    <section id="mitra" className="bg-paper py-16 md:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-10 text-center">
          <p className="eyebrow font-mono text-xs font-semibold uppercase text-ink/50">
            Mitra Kami
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">
            Mitra Profesional Kami
          </h2>
          <p className="mt-2 text-ink/60">
            Sebagian mitra terverifikasi yang siap membantu rumah Anda.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((m) => {
            const skills: string[] = Array.isArray(m.skill_category) ? m.skill_category : [];
            return (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-2xl border-2 border-ink/10 bg-white shadow-card"
              >
                <div className="flex h-16 items-end justify-center bg-ink pb-2">
                  <div className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm">
                    ID Card Mitra
                  </div>
                </div>
                <div className="-mt-9 flex flex-col items-center px-5 pb-5">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#dfe3e0] shadow-md">
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-ink/60">
                        {m.name?.charAt(0) ?? "M"}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <h4 className="font-display font-semibold text-ink">{m.name}</h4>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                      {skills.length > 0 ? skills.join(" · ") : m.status === "ahli" ? "Ahli" : "Training"}
                    </p>
                  </div>
                  {m.rating != null && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-bridge">★</span>
                      <span className="text-sm font-bold text-ink">{m.rating}</span>
                    </div>
                  )}
                  <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-[#f1f5f1] p-2">
                    <span className="text-[10px] font-bold uppercase text-ink/60">
                      {m.status === "ahli" ? "Mitra Ahli" : "Mitra Training"}
                    </span>
                    <span className="text-wa">✓</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/daftar-mitra"
            className="inline-block rounded-full bg-ink px-8 py-3.5 font-display text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Daftar Mitra
          </Link>
        </div>
      </div>
    </section>
  );
}
