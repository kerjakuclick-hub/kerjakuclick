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
//
// REVISI BESAR (21 September 2026, "Buat tampilan presisi dengan desain
// dari Canva tersebut"): section ini dirombak mengikuti mockup Canva Home
// page Anda persis --
//   - Background section: Ink (#12202A) gelap, bukan lagi Paper terang --
//     dicek dengan color-picker di mockup Anda, warnanya PERSIS token `ink`
//     yang sudah ada.
//   - Kartu: strip putih "ID Card Mitra" DIHAPUS -- diganti avatar bulat
//     yang "mengambang" separuh di atas tepi kartu (persis posisi di
//     mockup), kartu sendiri jadi kaca gelap tipis (bg-white/5) di atas
//     section Ink, bukan kartu putih solid lagi.
//   - Mockup Anda menampilkan teks testimoni di tiap kartu -- itu teks
//     placeholder Canva ("Testimonials are short quotes...", BUKAN kutipan
//     asli dari mitra Anda), jadi saya TIDAK ikut menaruh kutipan karangan
//     atas nama mitra sungguhan. Sebagai gantinya kartu tetap menampilkan
//     info asli yang sudah ada: kategori keahlian & rating -- kalau nanti
//     Anda sudah punya testimoni ASLI dari mitra, tinggal beri tahu saya,
//     saya tambahkan di tempat yang sama.
//   - Tombol "Daftar Mitra": warna diganti dari Ink jadi Bay (#1D6F8C) --
//     persis warna tombol itu di mockup Anda. Ini sengaja menggantikan
//     instruksi warna Ink #12202A yang Anda berikan sebelumnya, karena
//     mockup Canva yang lebih baru menunjukkan warna Bay untuk tombol ini.

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
    <section id="mitra" className="bg-ink py-16 md:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-14 text-center">
          <p className="eyebrow font-mono text-xs font-semibold uppercase text-white/40">
            Mitra Kami
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white md:text-3xl">
            Mitra Profesional Kami
          </h2>
          <p className="mt-2 text-white/60">
            Sebagian mitra terverifikasi yang siap membantu rumah Anda.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-x-6 gap-y-10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((m) => {
            const skills: string[] = Array.isArray(m.skill_category) ? m.skill_category : [];
            return (
              <div
                key={m.id}
                className="relative rounded-2xl border border-white/10 bg-white/5 px-5 pb-5 pt-9"
              >
                <div className="absolute -top-7 left-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-4 border-ink bg-[#dfe3e0] shadow-md">
                  {m.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold text-ink/60">
                      {m.name?.charAt(0) ?? "M"}
                    </span>
                  )}
                </div>

                <h4 className="font-display font-semibold text-white">{m.name}</h4>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-bay-light">
                  {skills.length > 0 ? skills.join(" · ") : m.status === "ahli" ? "Ahli" : "Training"}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  {m.rating != null ? (
                    <div className="flex items-center gap-1">
                      <span className="text-bridge">★</span>
                      <span className="text-sm font-bold text-white">{m.rating}</span>
                    </div>
                  ) : (
                    <span />
                  )}
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase text-white/70">
                    {m.status === "ahli" ? "Mitra Ahli" : "Mitra Training"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/daftar-mitra"
            className="inline-block rounded-full bg-bay px-8 py-3.5 font-display text-sm font-semibold text-white transition hover:brightness-110"
          >
            Daftar Mitra
          </Link>
        </div>
      </div>
    </section>
  );
}
