-- ============================================================================
-- 024_tier_based_platform_fee.sql
--
-- Implementasi Bagian 6.2 "Skema Fee Berjenjang Berdasarkan Loyalitas &
-- Performa" dari Dokumen Bisnis Revisi & Strategi Pasca-Audit Fraud
-- (September 2026), disetujui untuk diterapkan LANGSUNG ke semua mitra aktif
-- (bukan bertahap).
--
-- LATAR BELAKANG: audit internal fraud menemukan mitra merasa potongan
-- platform "20%" terlalu tinggi. Model deposit yang berjalan sejak migrasi
-- 008 memang memotong FLAT 20% dari saldo deposit mitra setiap order
-- selesai -- persis sama dengan keluhan tsb. Migrasi ini mengganti flat 20%
-- itu dengan skema berjenjang 7-10% berdasarkan jumlah order selesai,
-- rating, dan riwayat pelanggaran mitra, supaya mitra yang loyal & berkinerja
-- baik merasakan potongan yang lebih rendah secara nyata -- bukan cuma janji
-- di dokumen.
--
-- Tier (identik dengan Bagian 6.2):
--   Baru       : 0-30 order selesai                              -> 10%
--   Reguler    : >30 order, rating >= 4.5                        -> 10%
--   Terpercaya : >100 order, rating >= 4.7, 0 pelanggaran         -> 8%
--   Unggulan   : >250 order, rating >= 4.8, 0 pelanggaran         -> 7%
-- (Baru & Reguler sama-sama 10% -- bedanya cuma status/label yang tampil ke
-- mitra; keduanya belum memenuhi syarat naik ke Terpercaya/Unggulan.)
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. Tambah kolom profiles.violation_count (default 0, diisi manual admin
--      lewat Kelola Mitra -- BELUM ada UI-nya di migrasi ini, ditambahkan
--      terpisah kalau dibutuhkan; default 0 berarti semua mitra existing
--      otomatis eligible dari sisi syarat "0 pelanggaran").
--   2. Fungsi mitra_fee_percent(uuid) -- satu sumber kebenaran persentase fee
--      tier mitra, dipakai baik oleh trigger penyelesaian order maupun oleh
--      eligible_mitra_for_order() supaya tidak ada dua logika tier yang bisa
--      berbeda.
--   3. Fungsi mitra_tier_info(uuid) -- versi lengkap (nama tier + progres ke
--      tier berikutnya) untuk ditampilkan transparan di Dasbor Mitra (Bagian
--      6.1), dipanggil langsung dari app/mitra/page.tsx.
--   4. Trigger handle_order_completed_deposit_model() (migrasi 008) DIUBAH:
--      fee sekarang dihitung dari mitra_fee_percent(), bukan hardcode 0.20.
--      Trigger yang sudah terpasang (trg_order_completed_deposit) otomatis
--      memakai definisi fungsi terbaru ini -- tidak perlu DROP/CREATE ulang
--      trigger-nya.
--   5. eligible_mitra_for_order() (terakhir diubah migrasi 023) DIUBAH:
--      ambang saldo minimum sekarang dihitung per-mitra dari
--      mitra_fee_percent() masing-masing (mitra tier Unggulan cukup 7% dari
--      nilai order, bukan lagi flat 20% dari kolom orders.min_wallet_required
--      lama), dan ikut mengembalikan fee_percent supaya admin bisa lihat di
--      dropdown penugasan.
--
-- YANG **TIDAK** DILAKUKAN MIGRASI INI:
--   - Kolom orders.min_wallet_required (generated column, migrasi 007) TIDAK
--     dihapus/diubah -- dibiarkan sebagai angka referensi lama di UI admin,
--     TIDAK lagi dipakai sebagai ambang kelayakan yang sebenarnya (lihat
--     app/api/admin/orders/assign/route.ts versi baru, yang sekarang
--     menghitung ambang dinamis lewat mitra_fee_percent()).
--   - Tidak mengubah saldo deposit mitra yang sudah ada -- perubahan skema
--     ini hanya berlaku untuk order yang completed SETELAH migrasi ini
--     dijalankan.
--
-- Jalankan SETELAH backup database, di luar jam sibuk (mengubah fungsi &
-- trigger keuangan aktif).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. profiles.violation_count -- syarat "0 pelanggaran" untuk tier
--    Terpercaya/Unggulan. Additive only, default 0 (aman untuk data live).
-- ----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.violation_count IS
  'Jumlah pelanggaran tercatat (mis. transaksi luar sistem, hasil tinjauan Bagian 7.3 dokumen bisnis) -- syarat naik ke tier Terpercaya/Unggulan (harus 0). Diisi manual oleh admin, default 0.';

-- ----------------------------------------------------------------------------
-- 2. mitra_fee_percent(uuid) -- satu sumber kebenaran persentase fee tier.
--    STABLE (bukan VOLATILE) supaya boleh dipanggil di WHERE clause
--    eligible_mitra_for_order() tanpa masalah performa/caching aneh.
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
  'Persentase fee platform mitra berdasar tier (Bagian 6.2 Dokumen Bisnis Revisi Sept 2026): 0.10 (Baru/Reguler), 0.08 (Terpercaya: >100 order, rating>=4.7, 0 pelanggaran), 0.07 (Unggulan: >250 order, rating>=4.8, 0 pelanggaran). Menggantikan flat 0.20 sejak migrasi 008.';

GRANT EXECUTE ON FUNCTION public.mitra_fee_percent(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. mitra_tier_info(uuid) -- versi lengkap untuk tampilan Dasbor Mitra
--    (Bagian 6.1: transparansi rincian biaya & progres tier).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_tier_info(p_mitra_id UUID)
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
  'Info tier lengkap + progres ke tier berikutnya untuk mitra tertentu, dipakai Dasbor Mitra (Bagian 6.1 Dokumen Bisnis Revisi Sept 2026) supaya rincian biaya & syarat kenaikan tier transparan.';

GRANT EXECUTE ON FUNCTION public.mitra_tier_info(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Trigger model deposit (migrasi 008): fee sekarang dinamis per tier,
--    bukan hardcode 0.20. Nama & pengaman anti-proses-dobel TIDAK berubah.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_order_completed_deposit_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fee_pct NUMERIC;
  fee BIGINT;
  net_earning BIGINT;
  balance_before BIGINT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    IF NEW.mitra_id IS NULL THEN
      RAISE EXCEPTION 'Order % tidak memiliki mitra_id, tidak bisa diselesaikan', NEW.id;
    END IF;

    -- Jaga-jaga: jangan proses dua kali untuk order yang sama (pola yang
    -- sama seperti pengaman di fungsi sebelumnya).
    IF NOT EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE related_order_id = NEW.id AND type = 'deduction'
    ) THEN

      fee_pct := public.mitra_fee_percent(NEW.mitra_id);
      fee := ROUND(NEW.total_price * fee_pct);
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
  'Model deposit (Addendum Fase 1.1, migrasi 008): order selesai -> potong fee dari wallet_balance mitra. Sejak migrasi 024, fee_pct dinamis lewat mitra_fee_percent() (tier 7-10%), sebelumnya hardcode 0.20.';

-- Trigger trg_order_completed_deposit (migrasi 008) sudah terpasang ke
-- tabel orders dan otomatis memakai definisi fungsi terbaru di atas --
-- TIDAK perlu DROP/CREATE ulang triggernya.

-- ----------------------------------------------------------------------------
-- 5. eligible_mitra_for_order(): ambang saldo dinamis per tier mitra +
--    kembalikan fee_percent. Definisi lain (gender/skill/is_active/
--    is_available) IDENTIK dengan migrasi 023, tidak ada yang dikurangi.
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
    AND p.wallet_balance >= ROUND(o.total_price * public.mitra_fee_percent(p.id))
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

COMMENT ON FUNCTION eligible_mitra_for_order(BIGINT) IS
  'Daftar mitra eligible untuk sebuah order. Sejak migrasi 024, ambang saldo minimum = total_price * fee_percent tier mitra masing-masing (bukan lagi flat 20% dari orders.min_wallet_required).';

COMMIT;
