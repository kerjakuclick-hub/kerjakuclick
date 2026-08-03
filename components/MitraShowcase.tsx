// GANTI ISI components/MitraShowcase.tsx Anda dengan file ini.
//
// FIX PENTING: sebelumnya query langsung ke tabel `profiles`, yang RLS-nya
// memblokir pengunjung publik (belum login) — section ini jadi kosong
// untuk SEMUA pelanggan asli. Sekarang panggil RPC public_mitra_showcase()
// (migrasi 013) yang boleh diakses publik, hanya kembalikan kolom aman.

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
    <section id="mitra" className="bg-[#EEF2EE] py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl md:text-3xl font-bold text-[#12202A] mb-2">
            Mitra Profesional Kami
          </h2>
          <p className="text-[#3f484d]">
            Sebagian mitra terverifikasi yang siap membantu rumah Anda.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {featured.map((m) => (
            <div
              key={m.id}
              className="bg-white border-2 border-[#1D6F8C]/20 rounded-2xl overflow-hidden shadow-lg relative"
            >
              <div className="bg-[#1D6F8C] h-16 flex items-end justify-center pb-2">
                <div className="bg-white text-[#1D6F8C] font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider shadow-sm">
                  ID Card Mitra
                </div>
              </div>
              <div className="px-5 pb-5 flex flex-col items-center -mt-9">
                <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-md bg-[#dfe3e0] flex items-center justify-center">
                  {m.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-[#3f484d]">
                      {m.name?.charAt(0) ?? "M"}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <h4 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-[#12202A]">
                    {m.name}
                  </h4>
                  <p className="text-[#1D6F8C] text-xs font-bold uppercase tracking-wide">
                    {m.skill_category ?? (m.status === "ahli" ? "Ahli" : "Training")}
                  </p>
                </div>
                {m.rating != null && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[#F5B324]">★</span>
                    <span className="font-bold text-sm">{m.rating}</span>
                  </div>
                )}
                <div className="mt-4 w-full bg-[#f1f5f1] p-2 rounded-lg flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#3f484d] uppercase">
                    {m.status === "ahli" ? "Mitra Ahli" : "Mitra Training"}
                  </span>
                  <span className="text-[#25D366]">✓</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}