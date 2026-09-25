-- ============================================================================
-- 038_fee_penuh_tambah_waktu_dan_ambang_saldo_13persen.sql
--
-- Implementasi 3 KONFIRMASI Anda (25 September 2026):
--
--   1. FEE PENUH DARI TAMBAH WAKTU.
--      Rumus harga tambah waktu (HT) per 30 menit:
--        HT_30 = (HJ - Fee Platform) : 2 + Fee Platform
--      Fee Platform yang ada di dalam HT sekarang DIPOTONG PENUH dari saldo
--      deposit mitra (dipakai platform utk biaya marketing/promosi).
--      SEBELUMNYA sistem memotong Fee% x (HJ + HT), sehingga dari HT
--      platform hanya dapat Fee% x HT (contoh Setrika Fast tier New: Rp5.142,
--      bukan Rp9.100). Sekarang:
--        Fee dipotong = ROUND(HJ x Fee%) + orders.extra_time_fee
--      extra_time_fee = kolom BARU, diisi aplikasi SAAT klien mengajukan
--      tambah waktu (snapshot, sama seperti extra_time_price) -- jadi nominal
--      fee yang dipotong nanti PERSIS sama dengan fee yang dipakai waktu
--      menghitung harga ke klien, walau tier mitra berubah di tengah jalan.
--
--   2. DURASI TAMBAH WAKTU: Fast & PRO sama-sama bisa +30 ATAU +60 menit.
--      60 menit = 2x harga 30 menit (fee ikut 2x). Tidak ada perubahan
--      database utk ini (CHECK extra_time_minutes IN (0,30,60) dari migrasi
--      027 sudah cocok) -- logikanya di lib/services.ts & API tambah waktu.
--
--   3. AMBANG SALDO MINIMUM = potongan produk Fast terkecil dengan
--      PERSENTASE AWAL (13%, fee tier New label Fast -- TIDAK ikut tier
--      mitra): 13% x Rp70.000 (Setrika Fast) = Rp9.100, SATU angka flat utk
--      semua jenis order. Sebelumnya Rp10.500 (15%).
--
-- ORDER LAMA: order yang sudah ditambah waktu SEBELUM migrasi ini punya
-- extra_time_fee = 0 (tidak tercatat). Supaya potongannya tidak tiba-tiba
-- berubah, trigger tetap memakai cara LAMA untuk order seperti itu
-- (extra_time_price > 0 tapi extra_time_fee = 0 -> Fee% x total_price).
--
-- Jalankan SETELAH backup database, di SQL Editor dengan role postgres.
-- Mengubah trigger keuangan aktif (sama seperti migrasi 024/028/030/034).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. orders.extra_time_fee -- BARU.
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS extra_time_fee INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_extra_time_fee_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_extra_time_fee_check CHECK (extra_time_fee >= 0);

COMMENT ON COLUMN public.orders.extra_time_fee IS
  'Fee Platform yang ada di dalam harga tambah waktu (migrasi 038): (ROUND(HJ x Fee%)) x (menit / 30), dihitung & disimpan aplikasi saat klien mengajukan tambah waktu. Dipotong PENUH dari saldo deposit mitra saat order selesai. 0 = tidak ada tambah waktu, atau order lama sebelum migrasi 038.';

-- ----------------------------------------------------------------------------
-- 2. mitra_wallet_threshold() -- 13% x Setrika Fast = Rp9.100 (flat).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mitra_wallet_threshold()
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 9100::BIGINT; -- ROUND(0.13 * 70000): persentase awal (tier New, label Fast) x Setrika Fast
$$;

COMMENT ON FUNCTION public.mitra_wallet_threshold() IS
  'Ambang saldo deposit minimum FLAT supaya mitra eligible ditugaskan order APA PUN (migrasi 038): potongan produk Fast terkecil dengan persentase awal 13% (tidak ikut tier) = 13% x Rp70.000 Setrika Fast = Rp9.100. Harus sinkron dengan MITRA_WALLET_MIN_BALANCE di lib/services.ts.';

-- ----------------------------------------------------------------------------
-- 3. Trigger potongan fee saat order selesai.
--    Sama persis dengan migrasi 034, KECUALI cara menghitung `fee`.
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
  base_price BIGINT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    IF NEW.mitra_id IS NULL THEN
      RAISE EXCEPTION 'Order % tidak memiliki mitra_id, tidak bisa diselesaikan', NEW.id;
    END IF;

    IF NEW.completed_at IS NULL THEN
      UPDATE orders SET completed_at = NOW() WHERE id = NEW.id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE related_order_id = NEW.id AND type = 'deduction'
    ) THEN

      fee_pct := public.mitra_fee_percent(NEW.mitra_id, NEW.service_type);

      IF COALESCE(NEW.extra_time_price, 0) > 0 AND COALESCE(NEW.extra_time_fee, 0) = 0 THEN
        -- Order LAMA (tambah waktu sebelum migrasi 038, fee-nya tidak
        -- tercatat): tetap pakai cara lama supaya tidak berubah diam-diam.
        fee := ROUND(NEW.total_price * fee_pct);
      ELSE
        -- BARU (migrasi 038): fee paket utama + fee penuh dari tambah waktu.
        base_price := NEW.total_price - COALESCE(NEW.extra_time_price, 0);
        fee := ROUND(base_price * fee_pct) + COALESCE(NEW.extra_time_fee, 0);
      END IF;

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
  'Model deposit: order selesai -> potong fee dari wallet_balance mitra + isi completed_at. Sejak migrasi 038: fee = ROUND((total_price - extra_time_price) x mitra_fee_percent()) + extra_time_fee (fee penuh dari tambah waktu). Order lama dengan tambah waktu tapi extra_time_fee = 0 tetap memakai ROUND(total_price x fee%).';

-- Trigger trg_order_completed_deposit (migrasi 008) otomatis memakai
-- definisi fungsi di atas. eligible_mitra_for_order() & API assign otomatis
-- memakai mitra_wallet_threshold() yang baru.

COMMIT;

NOTIFY pgrst, 'reload schema';
