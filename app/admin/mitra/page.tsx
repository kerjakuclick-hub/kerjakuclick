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
//
// BARU (22 September 2026) -- Program Loyalty Tier FINAL (migrasi 034):
//   1. select ditambah `sosmed_active` (kolom baru, syarat tier Pro).
//   2. Ambil tier loyalty (RPC mitra_tier_info()) utk SETIAP mitra lewat
//      Promise.all, supaya admin bisa lihat tier & job bulan ini
//      masing-masing di MitraTable -- konsisten dgn semangat "transparansi"
//      yang sudah ada di Dasbor Mitra sendiri (app/mitra/page.tsx). Jumlah
//      mitra di bisnis skala ini kecil, jadi N RPC call sekali load halaman
//      aman.
//   3. Teks deskripsi diperbaiki -- sebelumnya masih menyebut "20% dari
//      nilai layanan" yang sudah tidak berlaku sejak migrasi 024/030/034.

import { createClient } from "@/lib/supabase/server";
import MitraTable from "@/components/admin/MitraTable";
import type { MitraTierInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminMitraPage() {
  const supabase = createClient();

  const { data: mitraList } = await supabase
    .from("profiles")
    .select(
      "id, name, phone, wallet_balance, total_earnings, status, is_active, gender, skill_category, photo_url, rating, is_available, unavailable_reason, unavailable_since, violation_count, sosmed_active"
    )
    .eq("role", "mitra")
    .order("name");

  // Tier loyalty + job bulan ini per mitra (Program Loyalty Tier, migrasi
  // 034) -- diambil terpisah lewat RPC karena bukan kolom biasa di
  // profiles, dihitung dinamis dari orders.completed_at bulan berjalan.
  const tierInfoByMitraId: Record<string, MitraTierInfo | null> = {};
  await Promise.all(
    (mitraList ?? []).map(async (m) => {
      const { data: rows } = await supabase.rpc("mitra_tier_info", { p_mitra_id: m.id });
      tierInfoByMitraId[m.id] = (rows?.[0] as MitraTierInfo | undefined) ?? null;
    })
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Kelola Mitra</h1>
      <p className="mt-1 text-sm text-ink/60">
        Ambang saldo minimum mitra sekarang FLAT (15% dari harga Setrika Fast). Pastikan kolom
        Gender terisi untuk tiap mitra aktif — mitra yang gender-nya kosong tidak akan muncul untuk
        pesanan dengan preferensi gender spesifik. Kolom Ketersediaan menampilkan status yang mitra
        atur sendiri dari dasbor mereka (istirahat/sakit/kendala lain) — mitra yang sedang tidak
        tersedia otomatis tidak muncul di penugasan baru. Kolom Status &amp; Tier Loyalty menentukan
        persentase fee platform mitra (Program Loyalty Tier) — klik Status untuk ubah
        Training/Ahli, dan centang Sosmed setelah memastikan mitra memang aktif promosi di media
        sosialnya.
      </p>
      <div className="mt-6">
        <MitraTable initialMitra={mitraList ?? []} tierInfoByMitraId={tierInfoByMitraId} />
      </div>
    </div>
  );
}
