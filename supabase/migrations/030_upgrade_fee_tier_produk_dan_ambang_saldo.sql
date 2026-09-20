-- ============================================================================
-- 030_upgrade_fee_tier_produk_dan_ambang_saldo.sql
--
-- Implementasi dokumen "UPDATE WEBSITE KERJAKU.CLICK" (struktur versi baru,
-- 20 September 2026) -- Bagian "Logika Perhitungan" & "Sistem Dompet Mitra".
-- Menggantikan TOTAL skema tier lama (migrasi 024, 7/8/10% flat per mitra)
-- dan Biaya Teknologi flat (migrasi 028, Rp2.000/5.000) dengan skema baru
-- yang berbeda per TIER MITRA **dan** per LABEL Fast/PRO produk sekaligus.
--
-- Tier & fee baru (tier "Unggulan" DIHAPUS -- dokumen baru cuma 3 tier):
--   Tier         Syarat                              Fee Fast   Fee PRO
--   Baru         0-30 order selesai                  15%        13%
--   Reguler      >30 order, rating >=4.5              14%        12%
--   Terpercaya   >100 order, rating >=4.7              13%        11%
--
-- ASUMSI yang perlu Anda konfirmasi: syarat "0 pelanggaran" untuk tier
-- Terpercaya (migrasi 024) DIPERTAHANKAN di sini walau dokumen baru tidak
-- menyebutnya eksplisit -- kalau ternyata mau dihapus, tinggal hapus kondisi
-- `violation_count = 0` di mitra_fee_percent()/mitra_tier_info() di bawah.
--
-- Ambang saldo minimum mitra: dokumen menyebut "AMBANG BATAS 15% dari produk
-- berlabel FAST" -- DIBACA (dikonfirmasi Anda) sebagai saldo minimum FLAT =
-- 15% x Rp55.000 (Setrika Fast) = Rp8.250, MENGGANTIKAN pengecekan dinamis
-- per-order (saldo >= fee order spesifik) dari migrasi 024/028. Kalau nanti
-- harga Setrika Fast berubah, sinkronkan manual angka ini + MITRA_WALLET_
-- MIN_BALANCE di lib/services.ts.
--
-- Biaya Bahan Baku & Transport dari dokumen (Rp1.250/2.500 setrika,
-- Rp8.000/16.000 cleaning [toilet+lantai], Rp10.000 transport semua produk)
-- TIDAK memotong saldo deposit mitra di sini -- itu biaya operasional mitra
-- sendiri dari uang tunai yang diterima langsung dari klien, ditampilkan
-- transparan di Dasbor Mitra lewat getMaterialCost()/getTransportCost() di
-- lib/services.ts. Yang memotong saldo deposit mitra HANYA Fee Platform.
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. mitra_fee_percent(uuid, text) -- GANTI TOTAL fungsi lama (1 argumen).
--      Sekarang butuh service_type juga (label Fast/PRO produk), balikan
--      persentase sesuai tabel tier x label di atas.
--   2. mitra_tier_info(uuid) -- GANTI TOTAL: balikan fast_fee_percent &
--      pro_fee_percent (bukan lagi satu fee_percent), karena fee sekarang
--      2 dimensi (tergantung produk yang akan dikerjakan, bukan cuma tier).
--   3. mitra_wallet_threshold() -- BARU: ambang saldo minimum FLAT (Rp8.250).
--   4. order_product_tier_label(text) -- BARU: deteksi label Fast/PRO dari
--      service_type (semua produk saat ini namanya diakhiri "Fast"/"PRO").
--   5. handle_order_completed_deposit_model() DIUBAH: fee = ROUND(total_price
--      * mitra_fee_percent(mitra_id, service_type)) -- TIDAK ADA LAGI
--      tambahan order_tech_fee() (Biaya Teknologi flat dihapus total).
--   6. eligible_mitra_for_order() DIUBAH: ambang kelayakan sekarang
--      wallet_balance >= mitra_wallet_threshold() (FLAT), bukan lagi dihitung
--      dinamis per order + tech fee. fee_percent yang dikembalikan sekarang
--      dihitung per order_id ini (pakai service_type order tsb).
--
-- YANG DIARSIPKAN (TIDAK dihapus, cuma tidak dipakai lagi -- konsisten
-- dengan pola migrasi 008 "jangan hapus, arsipkan"):
--   - mitra_fee_percent(uuid) versi lama (1 argumen) -- DI-DROP karena
--     Postgres tidak bisa overload beda return semantics dengan aman di
--     sini & supaya tidak ada 2 fungsi fee yang bisa beda hasil; definisi
--     lengkapnya ada di migrasi 024 kalau perlu rollback.
--   - order_tech_fee(text) (migrasi 028) -- TETAP ADA, cuma tidak dipanggil
--     lagi dari trigger/eligible_mitra_for_order manapun sejak migrasi ini.
--
-- Jalankan SETELAH backup database (mengubah trigger & fungsi keuangan aktif
-- yang menyentuh saldo deposit real mitra, sama seperti migrasi 024/028).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. order_product_tier_label(text) -- label Fast/PRO dari service_type.
--    Semua produk orderable saat ini (Setrika, Cleaning, Les Private)
--    namanya diakhiri "Fast" atau "PRO" persis (lihat lib/services.ts) --
--    fallback ke 'Fast' kalau tidak ketemu kata "PRO" sama sekali.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_product_tier_label(p_service_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_service_type ILIKE '%pro%' THEN 'PRO'
    ELSE 'Fast'
  END;
$$;

COMMENT ON FUNCTION public.order_product_tier_label(TEXT) IS
  'Label Fast/PRO sebuah order dari teks service_type -- dipakai mitra_fee_percent(uuid, text) untuk menentukan kolom fee yang berlaku (migrasi 030, dokumen struktur baru 20 September 2026). HARUS disinkron dengan getProductTierLabel() di lib/services.ts.';

GRANT EXECUTE ON FUNCTION public.order_product_tier_label(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. mitra_wallet_threshold() -- ambang saldo minimum FLAT (15% x harga
--    Setrika Fast). Konstanta murni, tidak query tabel apa pun -- kalau
--    harga Setrika Fast berubah, ubah manual angka di sini SEKALIGUS
--    MITRA_WALLET_MIN_BALANCE di lib/services.ts.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_wallet_threshold()
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 8250::BIGINT; -- ROUND(0.15 * 55000), Setrika Fast
$$;

COMMENT ON FUNCTION public.mitra_wallet_threshold() IS
  'Ambang saldo deposit minimum FLAT yang harus dijaga mitra supaya tampil eligible ditugaskan order APAPUN (migrasi 030: 15% x harga Setrika Fast = Rp8.250). Menggantikan pengecekan dinamis per-order (migrasi 024/028).';

GRANT EXECUTE ON FUNCTION public.mitra_wallet_threshold() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. mitra_fee_percent(uuid, text) -- GANTI TOTAL versi lama (1 argumen,
--    migrasi 024). Drop dulu supaya tidak ada 2 fungsi fee yang bisa
--    dipanggil dengan hasil berbeda.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mitra_fee_percent(UUID);

CREATE OR REPLACE FUNCTION public.mitra_fee_percent(p_mitra_id UUID, p_service_type TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN public.order_product_tier_label(p_service_type) = 'PRO' THEN
      CASE
        WHEN x.completed_orders > 100 AND COALESCE(x.rating, 0) >= 4.7 AND x.violation_count = 0 THEN 0.11
        WHEN x.completed_orders > 30 AND COALESCE(x.rating, 0) >= 4.5 THEN 0.12
        ELSE 0.13
      END
    ELSE
      CASE
        WHEN x.completed_orders > 100 AND COALESCE(x.rating, 0) >= 4.7 AND x.violation_count = 0 THEN 0.13
        WHEN x.completed_orders > 30 AND COALESCE(x.rating, 0) >= 4.5 THEN 0.14
        ELSE 0.15
      END
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

COMMENT ON FUNCTION public.mitra_fee_percent(UUID, TEXT) IS
  'Persentase fee platform BARU (dokumen struktur website versi baru, 20 September 2026), tergantung tier mitra DAN label Fast/PRO produk: Baru 15%/13%, Reguler 14%/12%, Terpercaya 13%/11% (Fast/PRO). Menggantikan mitra_fee_percent(uuid) 1-argumen (migrasi 024, 7/8/10% flat) yang di-drop di migrasi ini. ASUMSI: syarat "0 pelanggaran" utk Terpercaya dipertahankan dari migrasi 024, dokumen baru tidak menyebutnya eksplisit -- konfirmasi ke pemilik produk.';

GRANT EXECUTE ON FUNCTION public.mitra_fee_percent(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. mitra_tier_info(uuid) -- GANTI TOTAL: balikan fast_fee_percent &
--    pro_fee_percent terpisah (fee sekarang 2 dimensi), dipakai Dasbor
--    Mitra (app/mitra/page.tsx) supaya mitra lihat kedua angka sekaligus.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mitra_tier_info(UUID);

CREATE FUNCTION public.mitra_tier_info(p_mitra_id UUID)
RETURNS TABLE (
  tier_name TEXT,
  fast_fee_percent NUMERIC,
  pro_fee_percent NUMERIC,
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
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 'Terpercaya'
      WHEN completed_orders > 30 AND COALESCE(rating, 0) >= 4.5 THEN 'Reguler'
      ELSE 'Baru'
    END AS tier_name,
    CASE
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 0.13
      WHEN completed_orders > 30 AND COALESCE(rating, 0) >= 4.5 THEN 0.14
      ELSE 0.15
    END AS fast_fee_percent,
    CASE
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN 0.11
      WHEN completed_orders > 30 AND COALESCE(rating, 0) >= 4.5 THEN 0.12
      ELSE 0.13
    END AS pro_fee_percent,
    completed_orders,
    rating,
    violation_count,
    CASE
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN NULL
      ELSE 'Terpercaya'
    END AS next_tier_name,
    CASE
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN NULL
      ELSE GREATEST(101 - completed_orders, 0)::INTEGER
    END AS next_tier_orders_needed,
    CASE
      WHEN completed_orders > 100 AND COALESCE(rating, 0) >= 4.7 AND violation_count = 0 THEN NULL
      ELSE 4.7
    END AS next_tier_rating_needed
  FROM base;
$$;

COMMENT ON FUNCTION public.mitra_tier_info(UUID) IS
  'Info tier lengkap (nama, fee Fast & PRO terpisah, progres ke tier berikutnya) untuk Dasbor Mitra -- migrasi 030, menggantikan versi migrasi 024 yang cuma punya satu fee_percent (sekarang fee tergantung juga label Fast/PRO produk, jadi dikembalikan 2 angka).';

GRANT EXECUTE ON FUNCTION public.mitra_tier_info(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Trigger model deposit: fee sekarang = tier x label produk, TIDAK ADA
--    LAGI tambahan Biaya Teknologi (order_tech_fee(), migrasi 028 dihapus
--    dari sini -- fungsinya sendiri TETAP ada/diarsipkan, cuma tidak
--    dipanggil lagi).
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

    IF NOT EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE related_order_id = NEW.id AND type = 'deduction'
    ) THEN

      fee_pct := public.mitra_fee_percent(NEW.mitra_id, NEW.service_type);
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
  'Model deposit (migrasi 008): order selesai -> potong fee dari wallet_balance mitra. Sejak migrasi 030, fee = ROUND(total_price * mitra_fee_percent(mitra_id, service_type)) -- tier x label Fast/PRO produk, TIDAK ADA LAGI komponen Biaya Teknologi flat (migrasi 028, dihapus).';

-- Trigger trg_order_completed_deposit (migrasi 008) sudah terpasang ke
-- tabel orders dan otomatis memakai definisi fungsi terbaru di atas --
-- TIDAK perlu DROP/CREATE ulang triggernya.

-- ----------------------------------------------------------------------------
-- 6. eligible_mitra_for_order(): ambang kelayakan sekarang FLAT
--    (mitra_wallet_threshold()), bukan dihitung dinamis per order. Kolom
--    fee_percent tetap dikembalikan (dihitung utk order_id ini) supaya
--    dropdown admin masih bisa menampilkan estimasi potongan per mitra.
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
    public.mitra_fee_percent(p.id, o.service_type) AS fee_percent
  FROM profiles p
  JOIN orders o ON o.id = p_order_id
  WHERE p.role = 'mitra'
    AND p.is_active = true
    AND p.is_available = true
    AND p.wallet_balance >= public.mitra_wallet_threshold()
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
  'Daftar mitra eligible untuk sebuah order. Sejak migrasi 030, ambang kelayakan = wallet_balance >= mitra_wallet_threshold() (FLAT, Rp8.250), MENGGANTIKAN ambang dinamis per-order (migrasi 024/028). fee_percent yang dikembalikan tetap dihitung dinamis (tier mitra x label Fast/PRO order ini) untuk ditampilkan di dropdown admin. Pencocokan skill_category (migrasi 029) TIDAK diubah.';

COMMIT;
