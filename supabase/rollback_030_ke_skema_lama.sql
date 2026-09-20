-- ============================================================================
-- rollback_030_ke_skema_lama.sql
--
-- ROLLBACK DARURAT untuk migrasi 030_upgrade_fee_tier_produk_dan_ambang_
-- saldo.sql -- mengembalikan skema fee platform & ambang saldo mitra PERSIS
-- ke kondisi TEPAT SEBELUM migrasi 030 dijalankan (yaitu: hasil gabungan
-- migrasi 024 + 028 + 029, skema tier 7/8/10%/Unggulan 7% + Biaya Teknologi
-- flat Rp2.000/5.000 + ambang saldo dinamis per order).
--
-- FILE INI **BUKAN** MIGRASI BIASA -- SENGAJA diletakkan di luar folder
-- supabase/migrations/ (bukan diberi nomor urut 031 dst.) supaya TIDAK ikut
-- tercatat sebagai bagian riwayat migrasi normal oleh Supabase CLI. Jalankan
-- MANUAL lewat SQL Editor di dashboard Supabase HANYA kalau migrasi 030
-- ternyata bermasalah & Anda perlu kembali ke skema lama secepatnya.
--
-- ==========================================================================
-- !! PENTING -- BACA DULU SEBELUM MENJALANKAN !!
--
-- File ini HANYA membalikkan sisi DATABASE (function & trigger). Kode
-- aplikasi (TypeScript, lib/services.ts dkk.) yang sudah di-deploy tetap
-- memanggil fungsi-fungsi BARU (mitra_wallet_threshold(), mitra_fee_percent
-- dengan 2 argumen, mitra_tier_info() yang balikan fast_fee_percent/
-- pro_fee_percent). Kalau Anda jalankan file ini TAPI kode aplikasi yang
-- sedang live masih versi migrasi 030, situs akan ERROR (RPC yang dipanggil
-- kode tidak ketemu / bentuk datanya beda) -- BUKAN kembali normal.
--
-- Jadi: jalankan file ini SELALU BERBARENGAN dengan me-revert deployment
-- kode ke commit SEBELUM Phase 1 (integrasi skema harga baru) di-deploy
-- (mis. `git revert` commit terkait lalu redeploy, atau redeploy commit
-- lama lewat Vercel). Jangan jalankan salah satu saja.
-- ==========================================================================
--
-- Jalankan SETELAH backup database (sama seperti migrasi 030 sendiri --
-- file ini juga mengubah trigger & fungsi keuangan aktif).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Buang fungsi & function BARU yang ditambahkan migrasi 030 (tidak
--    pernah ada sebelumnya) -- mitra_wallet_threshold(), order_product_
--    tier_label(text), dan versi 2-argumen mitra_fee_percent().
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mitra_wallet_threshold();
DROP FUNCTION IF EXISTS public.order_product_tier_label(TEXT);
DROP FUNCTION IF EXISTS public.mitra_fee_percent(UUID, TEXT);

-- ----------------------------------------------------------------------------
-- 2. mitra_fee_percent(uuid) -- kembalikan versi migrasi 024 (1 argumen,
--    tier 7/8/10%, termasuk tier "Unggulan" yang dihapus migrasi 030).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_fee_percent(p_mitra_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN x.completed_orders > 250 AND COALESCE(x.rating, 0) >= 4.8 AND x.violation_count = 0 THEN 0.07
    WHEN x.completed_orders > 100 AND COALESCE(x.rating, 0) >= 4.7 AND x.violation_count = 0 THEN 0.08
    ELSE 0.10
  END
  FROM (
    SELECT
      p.rating,
      p.violation_count,
      (SELECT COUNT(*) FROM orders o WHERE o.mitra_id = p.id AND o.status = 'completed') AS completed_orders
    FROM profiles p
    WHERE p.id = p_mitra_id
  ) x;
$$;

COMMENT ON FUNCTION public.mitra_fee_percent(UUID) IS
  'Persentase fee platform mitra berdasar tier (Bagian 6.2 Dokumen Bisnis Revisi Sept 2026): 0.10 (Baru/Reguler), 0.08 (Terpercaya), 0.07 (Unggulan). DIKEMBALIKAN lewat rollback_030_ke_skema_lama.sql dari migrasi 024 -- lihat migrasi 030 untuk versi 2-argumen yang digantikan.';

GRANT EXECUTE ON FUNCTION public.mitra_fee_percent(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. mitra_tier_info(uuid) -- kembalikan versi migrasi 024 (satu kolom
--    fee_percent, termasuk tier "Unggulan").
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mitra_tier_info(UUID);

CREATE FUNCTION public.mitra_tier_info(p_mitra_id UUID)
RETURNS TABLE (
  tier_name TEXT,
  fee_percent NUMERIC,
  completed_orders BIGINT,
  rating NUMERIC,
  violation_count INTEGER,
  next_tier_name TEXT,
  next_tier_orders_needed INTEGER,
  next_tier_rating_needed NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT
      p.rating,
      p.violation_count,
      (SELECT COUNT(*) FROM orders o WHERE o.mitra_id = p.id AND o.status = 'completed') AS completed_orders
    FROM profiles p
    WHERE p.id = p_mitra_id
  )
  SELECT
    CASE
      WHEN completed_orders > 250 AND COALESCE(rating, 0) >= 4.8 AND violation_count = 0 THEN 'Unggulan'
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 'Terpercaya'
      WHEN completed_orders > 30 AND COALESCE(rating, 0) >= 4.5 THEN 'Reguler'
      ELSE 'Baru'
    END AS tier_name,
    CASE
      WHEN completed_orders > 250 AND COALESCE(rating, 0) >= 4.8 AND violation_count = 0 THEN 0.07
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 0.08
      ELSE 0.10
    END AS fee_percent,
    completed_orders,
    rating,
    violation_count,
    CASE
      WHEN completed_orders > 250 AND COALESCE(rating, 0) >= 4.8 AND violation_count = 0 THEN NULL
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 'Unggulan'
      ELSE 'Terpercaya'
    END AS next_tier_name,
    CASE
      WHEN completed_orders > 250 AND COALESCE(rating, 0) >= 4.8 AND violation_count = 0 THEN NULL
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN GREATEST(251 - completed_orders, 0)::INTEGER
      ELSE GREATEST(101 - completed_orders, 0)::INTEGER
    END AS next_tier_orders_needed,
    CASE
      WHEN completed_orders > 250 AND COALESCE(rating, 0) >= 4.8 AND violation_count = 0 THEN NULL
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 4.8
      ELSE 4.7
    END AS next_tier_rating_needed
  FROM base;
$$;

COMMENT ON FUNCTION public.mitra_tier_info(UUID) IS
  'Info tier lengkap + progres ke tier berikutnya. DIKEMBALIKAN lewat rollback_030_ke_skema_lama.sql dari migrasi 024 -- lihat migrasi 030 untuk versi fast_fee_percent/pro_fee_percent yang digantikan.';

GRANT EXECUTE ON FUNCTION public.mitra_tier_info(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. order_tech_fee(text) -- pastikan versi migrasi 028 tetap ada persis
--    (migrasi 030 TIDAK menghapusnya, cuma berhenti memanggilnya -- baris
--    ini jaga-jaga kalau ternyata sempat dihapus manual).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_tech_fee(p_service_type TEXT)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(regexp_replace(trim(p_service_type), '\s+', '-', 'g'))
    WHEN 'setrika-fast' THEN 2000
    WHEN 'setrika-pro' THEN 5000
    WHEN 'cleaning-fast' THEN 2000
    WHEN 'cleaning-pro' THEN 5000
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.order_tech_fee(TEXT) IS
  'Biaya Teknologi KONSTAN per order (Rp2.000 Fast, Rp5.000 PRO), 4 varian Setrika/Cleaning saja. Dikonfirmasi tetap ada lewat rollback_030_ke_skema_lama.sql (migrasi 028).';

GRANT EXECUTE ON FUNCTION public.order_tech_fee(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Trigger model deposit: kembalikan ke fee = persen tier + Biaya
--    Teknologi konstan (migrasi 028), TANPA label Fast/PRO 2-dimensi.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_order_completed_deposit_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fee_pct NUMERIC;
  tech_fee BIGINT;
  fee BIGINT;
  net_earning BIGINT;
  balance_before BIGINT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    IF NEW.mitra_id IS NULL THEN
      RAISE EXCEPTION 'Order % tidak memiliki mitra_id, tidak bisa diselesaikan', NEW.id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE related_order_id = NEW.id AND type = 'deduction'
    ) THEN

      fee_pct := public.mitra_fee_percent(NEW.mitra_id);
      tech_fee := public.order_tech_fee(NEW.service_type);
      fee := ROUND(NEW.total_price * fee_pct) + tech_fee;
      net_earning := NEW.total_price - fee;

      SELECT wallet_balance INTO balance_before
      FROM profiles WHERE id = NEW.mitra_id FOR UPDATE;

      UPDATE profiles
        SET wallet_balance = wallet_balance - fee
        WHERE id = NEW.mitra_id;

      INSERT INTO wallet_transactions (mitra_id, type, amount, balance_after, related_order_id)
        VALUES (NEW.mitra_id, 'deduction', fee, balance_before - fee, NEW.id);

      INSERT INTO earnings (mitra_id, order_id, amount, period_date)
        VALUES (NEW.mitra_id, NEW.id, net_earning, CURRENT_DATE);

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_order_completed_deposit_model() IS
  'Model deposit (migrasi 008): order selesai -> potong fee dari wallet_balance mitra. DIKEMBALIKAN lewat rollback_030_ke_skema_lama.sql ke fee = ROUND(total_price * fee_pct tier) + order_tech_fee(service_type) (migrasi 024+028), TANPA skema tier x label Fast/PRO migrasi 030.';

-- Trigger trg_order_completed_deposit (migrasi 008) tetap terpasang & otomatis
-- memakai definisi fungsi terbaru di atas -- tidak perlu DROP/CREATE ulang.

-- ----------------------------------------------------------------------------
-- 6. eligible_mitra_for_order(): kembalikan PERSIS versi migrasi 029
--    (ambang dinamis persen + Biaya Teknologi dari migrasi 028, DITAMBAH
--    perbaikan pencocokan skill_category dari migrasi 029 -- bug fix ini
--    TETAP DIPERTAHANKAN, bukan bagian dari migrasi 030 yang mau di-rollback).
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
  rating NUMERIC,
  fee_percent NUMERIC
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
    p.rating,
    public.mitra_fee_percent(p.id) AS fee_percent
  FROM profiles p
  JOIN orders o ON o.id = p_order_id
  WHERE p.role = 'mitra'
    AND p.is_active = true
    AND p.is_available = true
    AND p.wallet_balance >=
      ROUND(o.total_price * public.mitra_fee_percent(p.id)) + public.order_tech_fee(o.service_type)
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
           OR sk = public.order_required_skill(o.service_type)
      )
    )
  ORDER BY p.rating DESC NULLS LAST, p.wallet_balance DESC;
$$;

COMMENT ON FUNCTION eligible_mitra_for_order(BIGINT) IS
  'Daftar mitra eligible untuk sebuah order. DIKEMBALIKAN lewat rollback_030_ke_skema_lama.sql ke ambang saldo dinamis (persen tier + Biaya Teknologi, migrasi 024/028) + perbaikan skill_category migrasi 029 -- TANPA ambang flat & label Fast/PRO 2-dimensi migrasi 030.';

COMMIT;

-- ============================================================================
-- SETELAH menjalankan file ini: pastikan deployment kode (Vercel) juga
-- sudah di-revert ke commit SEBELUM Phase 1 (integrasi skema harga baru)
-- di-deploy. Cek juga dropdown "Pilih mitra eligible" & Dasbor Mitra
-- tampil normal (fee_percent satu angka, bukan fast/pro terpisah) sebagai
-- tanda rollback berhasil.
-- ============================================================================
