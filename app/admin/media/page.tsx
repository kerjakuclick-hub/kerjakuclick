// FILE BARU: app/admin/media/page.tsx

import { createClient } from "@/lib/supabase/server";
import MediaLibrary from "@/components/admin/MediaLibrary";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const supabase = createClient();

  const { data: media } = await supabase
    .from("site_media")
    .select("*")
    .order("slug");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Media Library</h1>
      <p className="mt-1 text-sm text-ink/60">
        Kelola gambar yang tampil di landing page — foto kategori layanan,
        dan slot promosi lain yang bisa Anda tambahkan sendiri. Klik atau
        drag & drop gambar untuk mengganti.
      </p>
      <div className="mt-6">
        <MediaLibrary initialMedia={media ?? []} />
      </div>
    </div>
  );
}
