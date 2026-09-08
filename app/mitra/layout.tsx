// GANTI ISI app/mitra/layout.tsx Anda dengan file ini.
//
// Perubahan dari versi Anda: HANYA menambahkan `export const metadata`
// (untuk manifest install app khusus mitra). Logika auth/redirect/MitraNav
// yang sudah ada TIDAK diubah sama sekali.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MitraNav from "@/components/mitra/MitraNav";

export const metadata: Metadata = {
  title: "Kerjaku.click Mitra",
  manifest: "/mitra-manifest.webmanifest",
};

export default async function MitraLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, wallet_balance")
    .eq("id", user.id)
    .single();

  // Middleware sudah menyaring ini, layout tetap cek ulang sebagai lapisan
  // kedua sebelum render halaman mitra apa pun.
  if (profile?.role !== "mitra") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-paper">
      <MitraNav mitraName={profile?.name ?? "Mitra"} walletBalance={profile?.wallet_balance ?? 0} />
      <main className="mx-auto max-w-4xl px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
