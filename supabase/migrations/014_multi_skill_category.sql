-- ============================================================================
-- 014_multi_skill_category.sql
--
-- Mengubah profiles.skill_category dari TEXT tunggal jadi TEXT[] (array),
-- supaya satu mitra bisa punya lebih dari 1 keahlian sekaligus.
--
-- Kategori dibakukan jadi 3 (sesuai yang disebutkan untuk form pendaftaran):
--   'Setrika', 'Bersihkan Rumah', 'Cuci Kendaraan'
--
-- Data lama (nilai tunggal seperti "Cuci mobil", "Cleaning") otomatis
-- dibungkus jadi array 1 elemen — TIDAK HILANG, tapi nilainya masih bebas
-- (belum otomatis dipetakan ke 3 kategori baku di atas). Admin perlu
-- mengecek ulang & menyesuaikan lewat Kelola Mitra setelah migrasi ini.
-- ============================================================================

BEGIN;

ALTER TABLE profiles
  ALTER COLUMN skill_category TYPE TEXT[]
  USING CASE
    WHEN skill_category IS NULL OR skill_category = '' THEN NULL
    ELSE ARRAY[skill_category]
  END;

COMMENT ON COLUMN profiles.skill_category IS 'Array keahlian mitra (bisa lebih dari 1), mis. {"Setrika","Cuci Kendaraan"}';

-- ----------------------------------------------------------------------------
-- Update eligible_mitra_for_order: cocokkan service_type ke SALAH SATU
-- elemen array skill_category (bukan hanya 1 nilai tunggal seperti dulu)
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

-- ----------------------------------------------------------------------------
-- Update public_mitra_showcase: skill_category sekarang array
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public_mitra_showcase();

CREATE FUNCTION public_mitra_showcase()
RETURNS TABLE (
  id UUID,
  name TEXT,
  photo_url TEXT,
  status TEXT,
  skill_category TEXT[],
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
