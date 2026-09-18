-- ============================================================================
-- 028_platform_fee_tech_component.sql
--
-- Koreksi Bagian 6.2 "Skema Fee Berjenjang" -- ditugaskan Anda langsung (18
-- September 2026), saat meninjau slide "Makin loyal & berperforma baik, makin
-- ringan potongannya":
--
--   "Potongan platform harusnya 10% + tech fast/pro. Pemberlakuan tier 10%
--   tetap berlaku, tetapi untuk tech tetap konstan tech fast/pro"
--
-- Artinya potongan platform yang SEBENARNYA per order = 2 komponen:
--   1. Persentase tier mitra (7% Unggulan / 8% Terpercaya / 10% Baru-Reguler)
--      dari total_price -- ini yang TURUN seiring tier mitra naik (migrasi
--      024, TIDAK berubah di migrasi ini).
--   2. Biaya Teknologi -- KONSTAN per jenis produk (Rp2.000 utk produk
--      berlabel Fast, Rp5.000 utk produk berlabel PRO), TIDAK ikut turun
--      walau tier mitra naik ke Terpercaya/Unggulan.
--
-- SEBELUM migrasi ini: trigger handle_order_completed_deposit_model()
-- (migrasi 008, diubah migrasi 024) HANYA memotong persentase tier
-- (ROUND(total_price * fee_pct)) -- komponen Biaya Teknologi belum pernah
-- ikut dipotong sama sekali dari saldo deposit mitra, walau sudah muncul di
-- dokumen bisnis & slide sosialisasi sejak awal. Migrasi ini menutup celah
-- itu.
--
-- Tarif Biaya Teknologi (SATU sumber kebenaran per layer, HARUS disinkron
-- manual dengan TECH_FEE_RATES di lib/services.ts kalau berubah):
--   Setrika Fast / Cleaning Fast : Rp2.000 (Tech Fast)
--   Setrika PRO / Cleaning PRO   : Rp5.000 (Tech Pro)
-- Sengaja DIBATASI ke 4 varian ini dulu (sama seperti EXTRA_TIME_RATES di
-- lib/services.ts) -- Cuci Kendaraan & Les Private masih orderable:false,
-- kalau nanti diaktifkan tambahkan case-nya juga di order_tech_fee() di
-- bawah SEKALIGUS di lib/services.ts TECH_FEE_RATES.
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. Fungsi baru public.order_tech_fee(text) -- biaya teknologi konstan
--      per order berdasarkan service_type, dipanggil trigger & fungsi
--      kelayakan mitra di bawah.
--   2. handle_order_completed_deposit_model() (migrasi 008/024) DIUBAH: fee
--      yang dipotong dari wallet mitra sekarang = ROUND(total_price *
--      fee_pct) + order_tech_fee(service_type) -- bukan cuma persentase
--      saja.
--   3. eligible_mitra_for_order() (migrasi 023/024) DIUBAH: ambang saldo
--      minimum ikut menambahkan order_tech_fee(service_type), supaya mitra
--      yang ditampilkan sebagai "eligible" beneran punya saldo cukup untuk
--      menutupi potongan penuh (persen + teknologi), bukan cuma persennya.
--
-- YANG **TIDAK** DILAKUKAN MIGRASI INI:
--   - Tidak mengubah mitra_fee_percent()/mitra_tier_info() -- skema tier
--     7/8/10% itu sendiri sudah benar sejak migrasi 024, tidak disentuh.
--   - Tidak mengubah saldo/transaksi yang sudah tercatat -- hanya berlaku
--     untuk order yang completed SETELAH migrasi ini dijalankan.
--   - Tidak mengubah skema "Tambah Waktu Kerja" (migrasi 027) -- harga
--     tambah waktu di EXTRA_TIME_RATES sudah include porsi teknologinya
--     sendiri untuk waktu tambahan itu (lihat komentar di lib/services.ts),
--     terpisah dari Biaya Teknologi flat per-order di migrasi ini.
--
-- Jalankan SETELAH backup database (mengubah trigger & fungsi keuangan
-- aktif, sama seperti migrasi 024).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. order_tech_fee(text) -- biaya teknologi KONSTAN per order, tidak
--    dipengaruhi tier mitra. IMMUTABLE murni fungsi dari service_type teks,
--    tidak query tabel apa pun.
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
  'Biaya Teknologi KONSTAN per order (Rp2.000 produk Fast, Rp5.000 produk PRO) -- ditugaskan 18 September 2026: bagian dari potongan platform yang TIDAK ikut turun walau tier mitra naik (beda dari mitra_fee_percent() yang memang turun per tier). Dibatasi ke 4 varian orderable saat ini (Setrika/Cleaning Fast & PRO), sinkron manual dengan TECH_FEE_RATES di lib/services.ts -- 0 untuk varian lain (Cuci Kendaraan, Les Private) sampai keduanya orderable dan case-nya ditambahkan di sini.';

GRANT EXECUTE ON FUNCTION public.order_tech_fee(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Trigger model deposit: potongan sekarang = persentase tier + Biaya
--    Teknologi konstan. Nama & pengaman anti-proses-dobel TIDAK berubah.
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
  'Model deposit (Addendum Fase 1.1, migrasi 008): order selesai -> potong fee dari wallet_balance mitra. Sejak migrasi 024, fee_pct dinamis lewat mitra_fee_percent() (tier 7-10%). Sejak migrasi 028, potongan = ROUND(total_price * fee_pct) + order_tech_fee(service_type) -- Biaya Teknologi konstan yang TIDAK ikut turun per tier.';

-- Trigger trg_order_completed_deposit (migrasi 008) sudah terpasang ke
-- tabel orders dan otomatis memakai definisi fungsi terbaru di atas --
-- TIDAK perlu DROP/CREATE ulang triggernya.

-- ----------------------------------------------------------------------------
-- 3. eligible_mitra_for_order(): ambang saldo sekarang juga menghitung
--    Biaya Teknologi konstan, supaya mitra yang tampil "eligible" beneran
--    cukup saldonya untuk potongan penuh. Kolom hasil TIDAK berubah (tetap
--    fee_percent saja) -- Biaya Teknologi ditampilkan di UI admin lewat
--    lib/services.ts getServiceTechFee(order.service_type), konstan per
--    order jadi tidak perlu ikut per-baris mitra.
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
      )
    )
  ORDER BY p.rating DESC NULLS LAST, p.wallet_balance DESC;
$$;

COMMENT ON FUNCTION eligible_mitra_for_order(BIGINT) IS
  'Daftar mitra eligible untuk sebuah order. Sejak migrasi 024, ambang saldo minimum = total_price * fee_percent tier mitra. Sejak migrasi 028, ambang ikut menambahkan order_tech_fee(service_type) (Biaya Teknologi konstan) supaya cukup untuk potongan penuh, bukan cuma persennya.';

COMMIT;
