-- ============================================================================
-- 013_public_mitra_showcase_function.sql
--
-- BUG FIX: MitraShowcase.tsx di landing page query langsung ke tabel
-- `profiles`, yang RLS-nya membatasi baca cuma untuk admin/mitra pemilik
-- baris. Pengunjung publik (belum login) selalu dapat 0 baris — section
-- "Mitra Profesional Kami" jadi kosong untuk SEMUA pelanggan asli, meskipun
-- terlihat normal saat testing sambil login sebagai admin.
--
-- Perbaikan: fungsi SECURITY DEFINER yang HANYA mengembalikan kolom aman
-- (bukan nomor HP, bukan saldo dompet) untuk mitra aktif. Bisa dipanggil
-- publik (anon) tanpa perlu mengubah RLS tabel profiles itu sendiri.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public_mitra_showcase()
RETURNS TABLE (
  id UUID,
  name TEXT,
  photo_url TEXT,
  status TEXT,
  skill_category TEXT,
  rating NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, photo_url, status, skill_category, rating
  FROM profiles
  WHERE role = 'mitra' AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public_mitra_showcase() TO anon, authenticated;

COMMIT;