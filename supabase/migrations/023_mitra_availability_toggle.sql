-- ============================================================================
-- 023_mitra_availability_toggle.sql
--
-- Fitur "Mitra sedang tidak tersedia" (tombol on/off) di Dasbor Mitra.
--
-- Latar belakang: saat operasional di lapangan, sebuah order pernah
-- ditugaskan ke mitra yang ternyata sedang sakit sehingga tidak bisa
-- mengerjakan tugas tersebut. Kolom ini memberi MITRA kontrol sendiri
-- untuk menandai dirinya SEMENTARA tidak bisa menerima tugas baru
-- (istirahat/sakit/kendala lain lain), TANPA menonaktifkan akunnya —
-- is_active tetap urusan admin, konsep yang sengaja dipisahkan.
--
-- - is_available     : default true. Mitra sendiri yang menyalakan/
--                       mematikan lewat toggle di dasbor. Saat false,
--                       otomatis dikecualikan dari eligible_mitra_for_order()
--                       sehingga tidak muncul lagi di dropdown "Pilih mitra
--                       eligible" milik admin.
-- - unavailable_reason: alasan singkat (pilihan cepat atau teks bebas di
--                       UI). Null kalau is_available = true.
-- - unavailable_since : kapan mitra terakhir menyalakan status tidak
--                       tersedia. Null kalau is_available = true. Dipakai
--                       admin untuk melihat sudah berapa lama.
-- ============================================================================

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unavailable_reason TEXT,
  ADD COLUMN IF NOT EXISTS unavailable_since TIMESTAMPTZ;

COMMENT ON COLUMN profiles.is_available IS 'Mitra menyalakan/mematikan ketersediaan sendiri dari dasbor (istirahat/sakit/kendala lain) -- terpisah dari is_active yang dikontrol admin.';
COMMENT ON COLUMN profiles.unavailable_reason IS 'Alasan singkat saat is_available = false. Null kalau is_available = true.';
COMMENT ON COLUMN profiles.unavailable_since IS 'Waktu mitra terakhir set is_available = false. Null kalau is_available = true.';

-- ----------------------------------------------------------------------------
-- Update eligible_mitra_for_order: mitra yang sedang is_available = false
-- tidak boleh muncul lagi di daftar mitra eligible untuk penugasan baru.
-- Definisi lainnya identik dengan migrasi 014, tidak ada yang berubah
-- selain tambahan satu kondisi AND di bawah.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS eligible_mitra_for_order(BIGINT);

CREATE FUNCTION eligible_mitra_for_order(p_order_id BIGINT)
RETURNS TABLE (
  mitra_id UUID,
  name TEXT,
  wallet_balance BIGINT,
  skill_category TEXT[],
  status TEXT,
  gender TEXT,
  rating NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.wallet_balance,
    p.skill_category,
    p.status,
    p.gender,
    p.rating
  FROM profiles p
  JOIN orders o ON o.id = p_order_id
  WHERE p.role = 'mitra'
    AND p.is_active = true
    AND p.is_available = true
    AND p.wallet_balance >= o.min_wallet_required
    AND (
      o.mitra_gender_preference IS NULL
      OR o.mitra_gender_preference = 'Bebas'
      OR p.gender = o.mitra_gender_preference
    )
    AND (
      p.skill_category IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p.skill_category) sk
        WHERE o.service_type ILIKE '%' || sk || '%'
      )
    )
  ORDER BY p.rating DESC NULLS LAST, p.wallet_balance DESC;
$$;

-- public_mitra_showcase() SENGAJA TIDAK diubah -- itu untuk halaman publik
-- (showcase marketing), bukan daftar penugasan, jadi mitra yang sedang
-- istirahat tetap boleh tampil di sana.

COMMIT;
