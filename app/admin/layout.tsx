import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

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

  return (
    <div className="min-h-screen bg-paper">
      <AdminNav adminName={profile?.name ?? "Admin"} />
      <main className="mx-auto max-w-6xl px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
