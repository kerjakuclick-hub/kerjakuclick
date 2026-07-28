import { createClient } from "@supabase/supabase-js";

// PENTING: file ini hanya boleh dipakai di server (API routes),
// tidak pernah diimpor ke komponen client — service_role key
// melewati RLS dan harus tetap rahasia.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase env vars belum diset (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
