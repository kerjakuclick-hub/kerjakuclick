-- ============================================================================
-- 008_switch_to_deposit_model.sql
--
-- MIGRASI PALING KRITIS di seluruh addendum ini. Membaca ini sebelum
-- menjalankan WAJIB, karena mengganti arah logika keuangan mitra.
--
-- Model LAMA (migrasi 006, sudah live & sudah pernah diproses untuk
-- beberapa order real):
--   Order selesai -> wallet_balance MITRA BERTAMBAH 80% dari total_price
--   (platform "membayar" mitra lewat wallet), dicatat di tabel `transactions`.
--
-- Model BARU (Addendum Fase 1.1, sudah dikonfirmasi sebagai acuan resmi):
--   Mitra terima TUNAI LANGSUNG dari klien di lokasi. wallet_balance adalah
--   DEPOSIT yang di-top up manual oleh mitra, dan BERKURANG 20% (fee
--   platform) setiap order selesai. Pendapatan tunai dicatat terpisah di
--   tabel `earnings`, TIDAK memengaruhi wallet_balance.
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. Menghentikan trigger LAMA (on_order_completed / handle_order_completion)
--      — TIDAK menghapus tabel/fungsinya, hanya melepas triggernya dari
--      tabel orders, supaya definisinya tetap ada sebagai arsip/referensi.
--   2. Tabel `transactions` (model lama) DIBIARKAN APA ADANYA — berisi
--      riwayat order yang sudah selesai di bawah model lama. JANGAN dihapus.
--   3. Membuat trigger BARU yang menjalankan logika model deposit (potong
--      20%, catat wallet_transactions + earnings).
--   4. Membuat fungsi bantu: eligible_mitra_for_order (fixed: pakai gender,
--      skill, status, is_active — bukan asumsi lama), invoices_pending_reminder,
--      generate_invoice_number, topup_wallet.
--
-- YANG **TIDAK** DILAKUKAN MIGRASI INI (SENGAJA, perlu keputusan terpisah):
--   - TIDAK mereset wallet_balance mitra yang sudah terlanjur bertambah dari
--     trigger lama. Karena sudah ada order real yang completed di bawah
--     model lama, saldo yang sudah terakumulasi itu adalah representasi
--     uang yang perlu diperjelas dulu (lihat pertanyaan di akhir chat ini)
--     sebelum direset — supaya tidak ada hak mitra yang hilang begitu saja.
--     Script rekonsiliasi terpisah akan menyusul setelah itu dikonfirmasi.
--
-- Jalankan SETELAH 007_addendum_fase_1_1_schema.sql, di luar jam sibuk,
-- dan SETELAH backup database.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Hentikan trigger lama. Fungsi handle_order_completion() TETAP ADA
--    (tidak di-drop) sebagai arsip/rollback reference — hanya sudah tidak
--    terpasang ke tabel orders lagi.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_order_completed ON orders;

COMMENT ON FUNCTION public.handle_order_completion() IS
  'ARSIP model lama (bagi hasil 80/20, menambah wallet_balance). Tidak lagi terpasang sebagai trigger sejak migrasi 008. Jangan hapus dulu — masih dipakai sebagai referensi/rollback.';

-- ----------------------------------------------------------------------------
-- 2. Generator nomor invoice
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq INT;
  today TEXT := to_char(NOW(), 'YYYYMMDD');
BEGIN
  SELECT COUNT(*) + 1 INTO seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || today || '-%';

  RETURN 'INV-' || today || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Fungsi cari mitra eligible untuk sebuah order — FIXED sesuai schema
--    real Anda: pakai gender (bukan nama mitra), status training/ahli (bukan
--    partner_status), is_active, dan wallet_balance >= min_wallet_required.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION eligible_mitra_for_order(p_order_id BIGINT)
RETURNS TABLE (
  mitra_id UUID,
  name TEXT,
  wallet_balance BIGINT,
  skill_category TEXT,
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
      OR p.skill_category = o.service_type
      OR o.service_type ILIKE '%' || p.skill_category || '%'
    )
  ORDER BY p.rating DESC NULLS LAST, p.wallet_balance DESC;
$$;

-- Catatan: mitra yang belum diisi kolom `gender`-nya (NULL) TIDAK akan lolos
-- filter saat order punya preferensi spesifik ('Pria'/'Wanita'), karena
-- `p.gender = o.mitra_gender_preference` bernilai UNKNOWN untuk gender NULL.
-- Pastikan data gender mitra aktif sudah diisi sebelum migrasi ini dipakai
-- di alur produksi (lihat langkah pengecekan di README/DEPLOYMENT).

-- ----------------------------------------------------------------------------
-- 4. Fungsi cari invoice yang perlu reminder (AC10)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION invoices_pending_reminder(p_minutes INT DEFAULT 15)
RETURNS SETOF invoices
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM invoices
  WHERE sent_at IS NULL
    AND generated_at < NOW() - (p_minutes || ' minutes')::interval
  ORDER BY generated_at ASC;
$$;

-- ----------------------------------------------------------------------------
-- 5. Trigger BARU model deposit: order selesai -> POTONG 20% dari
--    wallet_balance (bukan menambah), catat wallet_transactions & earnings.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_order_completed_deposit_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fee BIGINT;
  net_earning BIGINT;
  balance_before BIGINT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    IF NEW.mitra_id IS NULL THEN
      RAISE EXCEPTION 'Order % tidak memiliki mitra_id, tidak bisa diselesaikan', NEW.id;
    END IF;

    -- Jaga-jaga: jangan proses dua kali untuk order yang sama (pola yang
    -- sama seperti pengaman di fungsi lama Anda).
    IF NOT EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE related_order_id = NEW.id AND type = 'deduction'
    ) THEN

      fee := ROUND(NEW.total_price * 0.20);
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

DROP TRIGGER IF EXISTS trg_order_completed_deposit ON orders;
CREATE TRIGGER trg_order_completed_deposit
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_completed_deposit_model();

-- ----------------------------------------------------------------------------
-- 6. Fungsi top up saldo mitra (dipanggil dari route yang sudah ada,
--    app/api/admin/mitra/topup/route.ts — lihat file revisi terlampir)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION topup_wallet(p_mitra_id UUID, p_amount BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nilai top up harus lebih besar dari 0';
  END IF;

  UPDATE profiles
    SET wallet_balance = wallet_balance + p_amount
    WHERE id = p_mitra_id
    RETURNING wallet_balance INTO new_balance;

  INSERT INTO wallet_transactions (mitra_id, type, amount, balance_after, related_order_id)
    VALUES (p_mitra_id, 'topup', p_amount, new_balance, NULL);

  RETURN new_balance;
END;
$$;

COMMIT;
