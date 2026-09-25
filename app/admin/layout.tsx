import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InstallAppCard from "@/components/InstallAppCard";
import AdminNav from "@/components/admin/AdminNav";
import BusinessParamsProvider from "@/components/BusinessParamsProvider";
import { ensureBusinessParams } from "@/lib/businessParams";
import { isSuperAdminUser } from "@/lib/superAdmin";

export const metadata: Metadata = {
  title: "Kerjaku.click Admin",
  manifest: "/admin-manifest.webmanifest",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  // Middleware sudah menyaring ini, tapi layout tetap cek ulang di sisi
  // server sebagai lapisan kedua sebelum render halaman admin apa pun.
  if (profile?.role !== "admin") {
    redirect("/");
  }

  // BARU (25 Sep 2026): menu "Parameter Bisnis" hanya untuk Super Admin
  // (profiles.is_super_admin, migrasi 040), + parameter versi lengkap.
  const [isSuperAdmin, businessParams] = await Promise.all([
    isSuperAdminUser(user.id),
    ensureBusinessParams(),
  ]);

  return (
    <BusinessParamsProvider params={businessParams}>
    <div className="min-h-screen bg-paper">
      <AdminNav adminName={profile?.name ?? "Admin"} isSuperAdmin={isSuperAdmin} />
      <main className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        {/* BARU (25 Sep 2026): kartu install aplikasi di HP */}
        <InstallAppCard appName="Kerjaku Admin" />
        {children}
      </main>
    </div>
    </BusinessParamsProvider>
  );
}
