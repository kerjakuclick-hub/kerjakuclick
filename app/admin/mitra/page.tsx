// GANTI ISI app/admin/mitra/page.tsx Anda dengan file ini.
//
// Perubahan: select ditambah `gender, skill_category`; teks deskripsi
// diperbaiki (tidak lagi menyebut angka flat Rp50.000 yang sudah tidak
// berlaku sejak migrasi 008/009).
//
// BARU (fitur "Toggle Ketersediaan Mitra", migrasi 023): select ditambah
// `is_available, unavailable_reason, unavailable_since` supaya MitraTable
// bisa menampilkan badge status ketersediaan tiap mitra ke admin.
//
// FIX BUILD (18 September 2026): select ditambah `violation_count` (kolom
// dari migrasi 024, dipakai kolom "Trust & Safety" baru di MitraTable.tsx
// sejak migrasi 025) -- tanpa ini, deploy Vercel gagal compile: "Type error:
// Property 'violation_count' is missing" di baris <MitraTable /> di bawah,
// karena tipe MitraProfile di lib/types.ts mewajibkan field ini tapi query
// di sini belum ikut mengambilnya.

import { createClient } from "@/lib/supabase/server";
import MitraTable from "@/components/admin/MitraTable";

export const dynamic = "force-dynamic";

export default async function AdminMitraPage() {
  const supabase = createClient();

  const { data: mitraList } = await supabase
    .from("profiles")
    .select(
      "id, name, phone, wallet_balance, total_earnings, status, is_active, gender, skill_category, photo_url, rating, is_available, unavailable_reason, unavailable_since, violation_count"
    )
    .eq("role", "mitra")
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Kelola Mitra</h1>
      <p className="mt-1 text-sm text-ink/60">
        Ambang saldo minimum sekarang dihitung per pesanan (20% dari nilai layanan), bukan angka
        tetap. Pastikan kolom Gender terisi untuk tiap mitra aktif — mitra yang gender-nya kosong
        tidak akan muncul untuk pesanan dengan preferensi gender spesifik. Kolom Ketersediaan
        menampilkan status yang mitra atur sendiri dari dasbor mereka (istirahat/sakit/kendala
        lain) — mitra yang sedang tidak tersedia otomatis tidak muncul di penugasan baru.
      </p>
      <div className="mt-6">
        <MitraTable initialMitra={mitraList ?? []} />
      </div>
    </div>
  );
}
