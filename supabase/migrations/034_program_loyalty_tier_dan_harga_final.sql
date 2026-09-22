-- ============================================================================
-- 034_program_loyalty_tier_dan_harga_final.sql
--
-- Implementasi 3 dokumen FINAL (22 September 2026) yang Anda kirim &
-- konfirmasi sebagai acuan resmi terbaru: "Logika Hitung Harga Jual Paket",
-- "Logika Hitung Harga Tambah Waktu", "Program Loyalty Tier Mitra".
-- MENGGANTIKAN TOTAL skema tier "Baru/Reguler/Terpercaya" (berdasar total
-- order seumur hidup + rating) dari migrasi 024/030, yang baru berumur 2
-- hari. Harga jual produk (lib/services.ts) TIDAK diubah lewat migrasi ini
-- -- itu murni data TypeScript, tidak ada kolom database yang menyimpannya.
--
-- 4 tier loyalty BARU (DIKONFIRMASI 22 September 2026):
--   Tier     | Syarat                                            | Fee Fast | Fee PRO
--   ---------|----------------------------------------------------|----------|--------
--   New      | status TRAINING (default mitra baru)               | 13%      | 10%
--   Reguler  | status AKTIF, >30 job selesai BULAN KALENDER INI    | 12%      | 9%
--   Commit   | status AKTIF, >60 job bulan ini, 0 pelanggaran      | 11%      | 8%
--   Pro      | status AKTIF, >90 job bulan ini, 0 pelanggaran,     | 10%      | 7%
--            | AKTIF SOSMED                                        |          |
--
-- Keputusan implementasi yang DIKONFIRMASI Anda (lewat pertanyaan klarifikasi
-- 22 September 2026), karena dokumen sumber tidak menjelaskan detail teknis:
--   1. "Job/bulan" dihitung dari BULAN KALENDER BERJALAN (tanggal 1 sampai
--      akhir bulan), dievaluasi ulang otomatis tiap kali dicek -- BUKAN
--      rolling 30 hari. Konsekuensinya: tier mitra bisa NAIK ATAU TURUN
--      begitu kalender berganti bulan (job bulan lalu tidak lagi dihitung).
--   2. "AKTIF"/"TRAINING" pada dokumen loyalty DIPETAKAN ke kolom
--      `profiles.status` yang SUDAH ADA sejak schema awal ('training' /
--      'ahli') -- BUKAN kolom baru. 'training' = tier New, 'ahli' = syarat
--      dasar utk naik ke Reguler/Commit/Pro (job bulan ini yang menentukan
--      tier persisnya di antara ketiganya).
--   3. "0 PELANGGARAN" pakai kolom `violation_count` yang SUDAH ADA (migrasi
--      024, diisi manual admin lewat "Modul Trust & Safety").
--   4. "AKTIF SOSMED" adalah kolom BARU (`profiles.sosmed_active`), diisi
--      manual oleh admin lewat halaman Kelola Mitra (pola sama dengan
--      violation_count) -- BELUM ada verifikasi otomatis ke akun media
--      sosial mitra manapun.
--   5. Sistem tier LAMA (Baru/Reguler/Terpercaya + syarat rating) DIGANTI
--      TOTAL -- rating TIDAK LAGI jadi syarat tier apa pun (kolom
--      profiles.rating TETAP ADA, masih dipakai di tempat lain seperti
--      showcase publik mitra & sorting eligible_mitra_for_order(), cuma
--      tidak lagi menentukan fee).
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. orders.completed_at (BARU) -- timestamp order jadi 'completed',
--      diisi otomatis oleh trigger (BUKAN oleh aplikasi). Dipakai utk hitung
--      job bulan kalender berjalan. Backfill best-effort utk data lama.
--   2. profiles.sosmed_active (BARU, default false).
--   3. mitra_monthly_completed_orders(uuid) -- BARU: hitung job selesai
--      bulan kalender berjalan berdasar completed_at.
--   4. mitra_loyalty_tier(uuid) -- BARU: nama tier (New/Reguler/Commit/Pro)
--      dari status + job bulan ini + violation_count + sosmed_active.
--   5. mitra_fee_percent(uuid, text) -- GANTI TOTAL: pakai mitra_loyalty_tier()
--      x label Fast/PRO, tabel fee baru di atas.
--   6. mitra_tier_info(uuid) -- GANTI TOTAL: tier baru, job bulan ini,
--      progres ke tier berikutnya (job lagi yang dibutuhkan) -- rating &
--      completed_orders (lifetime) DIBUANG dari hasil RPC ini.
--   7. mitra_wallet_threshold() -- ambang saldo minimum FLAT ikut naik
--      (15% x Rp70.000 = Rp10.500, mengikuti kenaikan harga Setrika Fast di
--      lib/services.ts -- TOLONG DIKONFIRMASI, lihat catatan di file itu).
--   8. handle_order_completed_deposit_model() DIUBAH: SEKARANG JUGA mengisi
--      completed_at (SET NOW() via UPDATE, karena trigger AFTER tidak bisa
--      mengubah NEW yang sudah commit) setiap kali order pertama kali jadi
--      completed -- fee tetap dihitung dari mitra_fee_percent(mitra_id,
--      service_type), yang sekarang otomatis pakai tier baru.
--   9. eligible_mitra_for_order() TIDAK PERLU diubah -- sudah memanggil
--      mitra_fee_percent()/mitra_wallet_threshold() secara tidak langsung,
--      otomatis ikut memakai definisi baru begitu migrasi ini jalan.
--
-- YANG DIARSIPKAN (TIDAK dihapus, konsisten pola migrasi 008/030):
--   - Definisi mitra_fee_percent(uuid, text) & mitra_tier_info(uuid) versi
--     migrasi 030 (tier Baru/Reguler/Terpercaya) -- DI-REPLACE (CREATE OR
--     REPLACE, signature sama persis) sehingga tidak ada 2 fungsi fee yang
--     bisa beda hasil. Definisi lengkap versi lama ada di migrasi 030 kalau
--     perlu rollback.
--
-- Jalankan SETELAH backup database (mengubah trigger & fungsi keuangan aktif
-- yang menyentuh saldo deposit real mitra, sama seperti migrasi 024/028/030).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. orders.completed_at -- BARU. Nullable (order lama yang belum pernah
--    completed, atau completed sebelum migrasi ini, ditangani lewat
--    backfill best-effort di bawah).
-- ----------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.completed_at IS
  'Waktu order berubah status jadi completed (migrasi 034), diisi otomatis oleh trigger handle_order_completed_deposit_model(). Dipakai mitra_monthly_completed_orders() utk hitung job selesai bulan kalender berjalan pada Program Loyalty Tier.';

-- Backfill best-effort utk order yang SUDAH completed sebelum migrasi ini --
-- pakai created_at sebagai pendekatan (order kerjakuclick tipikal selesai di
-- hari yang sama/berdekatan dengan dibuat, jadi cukup akurat utk keperluan
-- hitung job bulanan). Order yang completed_at-nya nanti diisi backfill ini
-- TIDAK 100% presisi, tapi jauh lebih baik daripada NULL (yang berarti tidak
-- terhitung sama sekali di bulan manapun).
UPDATE orders
  SET completed_at = created_at
  WHERE status = 'completed' AND completed_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. profiles.sosmed_active -- BARU. Syarat "AKTIF SOSMED" utk tier Pro.
--    Additive only, default false (aman utk data live -- semua mitra
--    existing mulai dari status paling konservatif, admin yang mengaktifkan
--    manual per mitra yang memang aktif sosmed-nya).
-- ----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sosmed_active BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.sosmed_active IS
  'Syarat "AKTIF SOSMED" utk tier loyalty Pro (migrasi 034, Program Loyalty Tier final 22 September 2026). Diisi manual oleh admin lewat halaman Kelola Mitra, default false.';

-- ----------------------------------------------------------------------------
-- 3. mitra_monthly_completed_orders(uuid) -- job selesai BULAN KALENDER
--    BERJALAN (dari tanggal 1 bulan ini sampai sekarang), berdasar
--    completed_at. STABLE (bukan VOLATILE) supaya aman dipanggil berulang
--    dalam satu query/transaksi tanpa masalah performa.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_monthly_completed_orders(p_mitra_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM orders o
  WHERE o.mitra_id = p_mitra_id
    AND o.status = 'completed'
    AND o.completed_at >= date_trunc('month', now())
    AND o.completed_at < date_trunc('month', now()) + interval '1 month';
$$;

COMMENT ON FUNCTION public.mitra_monthly_completed_orders(UUID) IS
  'Jumlah order completed milik mitra ini pada BULAN KALENDER BERJALAN (tanggal 1 s/d sekarang, reset otomatis tiap bulan baru) -- dasar Program Loyalty Tier (migrasi 034). Berdasar orders.completed_at, BUKAN created_at.';

GRANT EXECUTE ON FUNCTION public.mitra_monthly_completed_orders(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. mitra_loyalty_tier(uuid) -- nama tier loyalty (New/Reguler/Commit/Pro)
--    dari status + job bulan ini + violation_count + sosmed_active. Gaya
--    cascading CASE WHEN sama persis dengan mitra_fee_percent() migrasi
--    024/030 (cek syarat tier tertinggi dulu, jatuh ke tier di bawahnya).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_loyalty_tier(p_mitra_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN x.status = 'ahli' AND x.monthly_jobs > 90 AND x.violation_count = 0 AND x.sosmed_active THEN 'Pro'
    WHEN x.status = 'ahli' AND x.monthly_jobs > 60 AND x.violation_count = 0 THEN 'Commit'
    WHEN x.status = 'ahli' AND x.monthly_jobs > 30 THEN 'Reguler'
    ELSE 'New'
  END
  FROM (
    SELECT
      p.status,
      p.violation_count,
      p.sosmed_active,
      public.mitra_monthly_completed_orders(p.id) AS monthly_jobs
    FROM profiles p
    WHERE p.id = p_mitra_id
  ) x;
$$;

COMMENT ON FUNCTION public.mitra_loyalty_tier(UUID) IS
  'Nama tier loyalty mitra (New/Reguler/Commit/Pro) sesuai Program Loyalty Tier final (migrasi 034, 22 September 2026): status aktif (profiles.status=''ahli'') + job selesai bulan kalender berjalan + 0 pelanggaran + aktif sosmed. Mitra berstatus training SELALU tier New apa pun jumlah jobnya.';

GRANT EXECUTE ON FUNCTION public.mitra_loyalty_tier(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. mitra_fee_percent(uuid, text) -- GANTI TOTAL (signature SAMA dengan
--    migrasi 030, jadi CREATE OR REPLACE aman, tidak perlu DROP dulu).
-- ----------------------------------------------------------------------------
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
        WHEN 'Pro' THEN 0.10
        WHEN 'Commit' THEN 0.11
        WHEN 'Reguler' THEN 0.12
        ELSE 0.13
      END
  END;
$$;

COMMENT ON FUNCTION public.mitra_fee_percent(UUID, TEXT) IS
  'Persentase fee platform FINAL (Program Loyalty Tier, 22 September 2026), tergantung tier loyalty mitra (New/Reguler/Commit/Pro, lihat mitra_loyalty_tier()) DAN label Fast/PRO produk: New 13%/10%, Reguler 12%/9%, Commit 11%/8%, Pro 10%/7% (Fast/PRO). MENGGANTIKAN TOTAL skema tier Baru/Reguler/Terpercaya (migrasi 024/030, berdasar total order seumur hidup + rating) -- rating DIHAPUS TOTAL dari syarat fee.';

GRANT EXECUTE ON FUNCTION public.mitra_fee_percent(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. mitra_tier_info(uuid) -- GANTI TOTAL: kolom baru sesuai tier loyalty
--    (job bulan ini, bukan lagi lifetime + rating). Signature (nama fungsi +
--    parameter) SAMA, tapi bentuk RETURNS TABLE beda -- Postgres tidak bisa
--    CREATE OR REPLACE kalau return type berubah, jadi DROP dulu.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mitra_tier_info(UUID);

CREATE FUNCTION public.mitra_tier_info(p_mitra_id UUID)
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
      WHEN 'Pro' THEN 0.10 WHEN 'Commit' THEN 0.11 WHEN 'Reguler' THEN 0.12 ELSE 0.13
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

COMMENT ON FUNCTION public.mitra_tier_info(UUID) IS
  'Info tier loyalty lengkap (nama, fee Fast & PRO, job bulan ini, progres ke tier berikutnya) untuk Dasbor Mitra -- migrasi 034 (Program Loyalty Tier final), GANTI TOTAL migrasi 030 (yang berdasar total order seumur hidup + rating -- keduanya DIHAPUS dari syarat tier). Catatan: mitra berstatus training TIDAK PERNAH naik dari tier New apa pun jumlah jobnya -- next_tier_name-nya tetap "Reguler" sebagai target begitu status di-set "ahli" oleh admin.';

GRANT EXECUTE ON FUNCTION public.mitra_tier_info(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. mitra_wallet_threshold() -- ambang saldo minimum FLAT, ikut naik
--    mengikuti kenaikan harga Setrika Fast (Rp55.000 -> Rp70.000) di
--    lib/services.ts: 15% x Rp70.000 = Rp10.500. TOLONG DIKONFIRMASI kalau
--    ternyata seharusnya tetap Rp8.250 (dokumen final tidak menyebut ambang
--    ini secara eksplisit) -- kalau perlu dibalik, ganti angka di sini +
--    MITRA_WALLET_MIN_BALANCE di lib/services.ts.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_wallet_threshold()
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 10500::BIGINT; -- ROUND(0.15 * 70000), Setrika Fast (harga final 22 Sep 2026)
$$;

COMMENT ON FUNCTION public.mitra_wallet_threshold() IS
  'Ambang saldo deposit minimum FLAT yang harus dijaga mitra supaya tampil eligible ditugaskan order APAPUN (15% x harga Setrika Fast = Rp10.500 sejak migrasi 034, naik dari Rp8.250 migrasi 030 mengikuti kenaikan harga Setrika Fast). Menggantikan pengecekan dinamis per-order lama (migrasi 024/028).';

-- ----------------------------------------------------------------------------
-- 8. Trigger model deposit: TETAP memotong fee lewat mitra_fee_percent()
--    (yang sekarang otomatis pakai tier loyalty baru), DITAMBAH pengisian
--    completed_at (BARU, langkah 1) supaya job bulan ini bisa dihitung
--    akurat mulai dari order yang completed SETELAH migrasi ini berjalan.
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

    -- BARU (migrasi 034): catat waktu completed -- trigger ini AFTER UPDATE,
    -- jadi mengubah NEW tidak akan tersimpan; perlu UPDATE eksplisit. Selalu
    -- dijalankan sekali per transisi jadi completed (dijaga oleh kondisi IF
    -- di atas), independen dari pengaman anti-proses-dobel di bawah supaya
    -- completed_at tetap terisi walau baris wallet_transactions-nya
    -- (seharusnya tidak mungkin) sudah ada duluan.
    IF NEW.completed_at IS NULL THEN
      UPDATE orders SET completed_at = NOW() WHERE id = NEW.id;
    END IF;

    -- Jaga-jaga: jangan proses dua kali untuk order yang sama (pola yang
    -- sama seperti pengaman di fungsi sebelumnya).
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
  'Model deposit (migrasi 008): order selesai -> potong fee dari wallet_balance mitra + catat completed_at (BARU migrasi 034). Fee = ROUND(total_price * mitra_fee_percent(mitra_id, service_type)) -- sejak migrasi 034 persentasenya dari Program Loyalty Tier (New/Reguler/Commit/Pro berdasar job bulan kalender berjalan), bukan lagi tier Baru/Reguler/Terpercaya (migrasi 024/030).';

-- Trigger trg_order_completed_deposit (migrasi 008) sudah terpasang ke
-- tabel orders dan otomatis memakai definisi fungsi terbaru di atas --
-- TIDAK perlu DROP/CREATE ulang triggernya.

-- ----------------------------------------------------------------------------
-- 9. eligible_mitra_for_order() TIDAK diubah di migrasi ini -- definisinya
--    (migrasi 030) sudah memanggil public.mitra_wallet_threshold() &
--    public.mitra_fee_percent(p.id, o.service_type) tanpa hardcode apa pun,
--    jadi otomatis ikut memakai definisi BARU begitu migrasi ini selesai.
-- ----------------------------------------------------------------------------

COMMIT;
