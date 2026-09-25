-- ============================================================================
-- 039_revisi_harga_fee_platform_palu.sql
--
-- REVISI HARGA & FEE PLATFORM (25 September 2026) -- setelah kajian UMR
-- Kota Palu & kelayakan harga di Palu. Harga jual, transport (Rp20.000) &
-- bahan baku ada di lib/services.ts (bukan database). Di database hanya:
--
--   1. mitra_fee_percent(uuid, text) -- fee baru per tier x label:
--        Tier     | Fast | PRO
--        New      | 11%  | 10%   (sebelumnya 13% / 10%)
--        Reguler  | 10%  |  9%   (12% /  9%)
--        Commit   |  9%  |  8%   (11% /  8%)
--        Pro      |  8%  |  7%   (10% /  7%)
--      Syarat tier (mitra_loyalty_tier) TIDAK berubah.
--   2. mitra_tier_info(uuid) -- angka fee yang ditampilkan di Dasbor Mitra
--      disamakan (bentuk kolom TIDAK berubah, jadi cukup CREATE OR REPLACE).
--   3. mitra_wallet_threshold() -- 11% x Setrika Fast Rp60.000 = Rp6.600
--      (sebelumnya Rp9.100).
--
-- Trigger potongan fee (migrasi 038) TIDAK diubah -- otomatis memakai
-- mitra_fee_percent() yang baru. Fee tambah waktu yang SUDAH tersimpan di
-- order lama (extra_time_fee) tetap seperti saat diajukan.
--
-- Jalankan di SQL Editor (role postgres) SEBELUM push kode, setelah backup.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.mitra_fee_percent(p_mitra_id UUID, p_service_type TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN public.order_product_tier_label(p_service_type) = 'PRO' THEN
      CASE public.mitra_loyalty_tier(p_mitra_id)
        WHEN 'Pro' THEN 0.07
        WHEN 'Commit' THEN 0.08
        WHEN 'Reguler' THEN 0.09
        ELSE 0.10
      END
    ELSE
      CASE public.mitra_loyalty_tier(p_mitra_id)
        WHEN 'Pro' THEN 0.08
        WHEN 'Commit' THEN 0.09
        WHEN 'Reguler' THEN 0.10
        ELSE 0.11
      END
  END;
$$;

COMMENT ON FUNCTION public.mitra_fee_percent(UUID, TEXT) IS
  'Fee platform per tier loyalty x label Fast/PRO (revisi 25 Sep 2026, migrasi 039): New 11%/10%, Reguler 10%/9%, Commit 9%/8%, Pro 8%/7%. Harus sinkron dengan PLATFORM_FEE_TIERS di lib/services.ts.';

CREATE OR REPLACE FUNCTION public.mitra_tier_info(p_mitra_id UUID)
RETURNS TABLE (
  tier_name TEXT,
  fast_fee_percent NUMERIC,
  pro_fee_percent NUMERIC,
  monthly_completed_orders INTEGER,
  status TEXT,
  violation_count INTEGER,
  sosmed_active BOOLEAN,
  next_tier_name TEXT,
  next_tier_jobs_needed INTEGER
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT
      p.status,
      p.violation_count,
      p.sosmed_active,
      public.mitra_monthly_completed_orders(p.id) AS monthly_jobs,
      public.mitra_loyalty_tier(p.id) AS tier
    FROM profiles p
    WHERE p.id = p_mitra_id
  )
  SELECT
    tier AS tier_name,
    CASE tier
      WHEN 'Pro' THEN 0.08 WHEN 'Commit' THEN 0.09 WHEN 'Reguler' THEN 0.10 ELSE 0.11
    END AS fast_fee_percent,
    CASE tier
      WHEN 'Pro' THEN 0.07 WHEN 'Commit' THEN 0.08 WHEN 'Reguler' THEN 0.09 ELSE 0.10
    END AS pro_fee_percent,
    monthly_jobs AS monthly_completed_orders,
    status,
    violation_count,
    sosmed_active,
    CASE tier
      WHEN 'Pro' THEN NULL
      WHEN 'Commit' THEN 'Pro'
      WHEN 'Reguler' THEN 'Commit'
      ELSE 'Reguler'
    END AS next_tier_name,
    CASE tier
      WHEN 'Pro' THEN NULL
      WHEN 'Commit' THEN GREATEST(91 - monthly_jobs, 0)::INTEGER
      WHEN 'Reguler' THEN GREATEST(61 - monthly_jobs, 0)::INTEGER
      ELSE GREATEST(31 - monthly_jobs, 0)::INTEGER
    END AS next_tier_jobs_needed
  FROM base;
$$;

CREATE OR REPLACE FUNCTION public.mitra_wallet_threshold()
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6600::BIGINT; -- ROUND(0.11 * 60000): fee awal (tier New, label Fast) x Setrika Fast
$$;

COMMENT ON FUNCTION public.mitra_wallet_threshold() IS
  'Ambang saldo deposit minimum FLAT (revisi 25 Sep 2026, migrasi 039): 11% (fee awal tier New label Fast) x Rp60.000 Setrika Fast = Rp6.600. Harus sinkron dengan MITRA_WALLET_MIN_BALANCE di lib/services.ts.';

COMMIT;

NOTIFY pgrst, 'reload schema';
