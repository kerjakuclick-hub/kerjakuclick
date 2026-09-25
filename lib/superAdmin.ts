// lib/superAdmin.ts -- HANYA server. Cek Super Admin (profiles.is_super_admin,
// migrasi 040) -- satu-satunya yang boleh melihat & mengubah Parameter
// Bisnis. Dibaca dengan service role & query terpisah supaya kalau kolomnya
// belum ada (migrasi 040 belum dijalankan) dasbor admin tetap jalan normal
// (hasilnya cukup "bukan super admin").

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function isSuperAdminUser(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("role, is_super_admin")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return false;
    return data.role === "admin" && data.is_super_admin === true;
  } catch {
    return false;
  }
}

/** Super Admin yang sedang login, atau null. Untuk API & halaman parameter. */
export async function getCurrentSuperAdmin(): Promise<{ id: string; name: string } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await isSuperAdminUser(user.id))) return null;
  const { data } = await getSupabaseAdmin().from("profiles").select("name").eq("id", user.id).maybeSingle();
  return { id: user.id, name: data?.name ?? user.email ?? "Super Admin" };
}
