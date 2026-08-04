// FILE BARU: app/admin/pendaftar/page.tsx

import { createClient } from "@/lib/supabase/server";
import MitraApplicationsList from "@/components/admin/MitraApplicationsList";

export const dynamic = "force-dynamic";

export default async function AdminPendaftarPage() {
  const supabase = createClient();

  const { data: applications } = await supabase
    .from("mitra_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Pendaftar Mitra</h1>
      <p className="mt-1 text-sm text-ink/60">
        Data dari form pendaftaran publik — ini filter awal saja. Verifikasi keaslian KTP/KK
        tetap dilakukan manual saat wawancara tatap muka.
      </p>
      <div className="mt-6">
        <MitraApplicationsList initialApplications={applications ?? []} />
      </div>
    </div>
  );
}
