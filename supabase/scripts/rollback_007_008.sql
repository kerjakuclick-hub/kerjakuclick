-- ============================================================================
-- Rollback untuk 007_addendum_fase_1_1_schema.sql + 008_switch_to_deposit_model.sql
--
-- Ada 2 skenario rollback, pilih sesuai kebutuhan:
--
-- SKENARIO A — Rollback total (hapus semua penambahan addendum)
-- SKENARIO B — Darurat: kembali ke trigger LAMA (bagi hasil 80/20) saja,
--              tanpa menghapus skema baru (kalau ternyata perlu waktu lebih
--              lama untuk keputusan rekonsiliasi saldo)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SKENARIO B (paling mungkin dipakai duluan): kembalikan trigger LAMA aktif,
-- matikan trigger BARU. Data yang sudah sempat tercatat di wallet_transactions
-- / earnings selama trigger baru aktif TIDAK dihapus otomatis — cek dulu
-- manual apakah perlu dibersihkan sebelum reaktivasi trigger lama, supaya
-- tidak ada order yang diproses dua model sekaligus.
-- ----------------------------------------------------------------------------
BEGIN;

DROP TRIGGER IF EXISTS trg_order_completed_deposit ON orders;

DROP TRIGGER IF EXISTS on_order_completed ON orders;
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_completion();

COMMIT;

-- ============================================================================
-- SKENARIO A — Rollback total (jalankan TERPISAH dari Skenario B di atas,
-- jangan keduanya sekaligus). PERINGATAN: menghapus data invoices,
-- wallet_transactions, earnings yang sudah sempat masuk sejak migrasi 007/008
-- dijalankan. Tabel & data model LAMA (transactions, kolom wallet_balance,
-- dst.) TIDAK terpengaruh oleh rollback ini.
-- ============================================================================

/*
BEGIN;

DROP TRIGGER IF EXISTS trg_order_completed_deduction ON orders;
DROP FUNCTION IF EXISTS handle_order_completed_deposit_model();
DROP FUNCTION IF EXISTS topup_wallet(UUID, BIGINT);
DROP FUNCTION IF EXISTS invoices_pending_reminder(INT);
DROP FUNCTION IF EXISTS eligible_mitra_for_order(BIGINT);
DROP FUNCTION IF EXISTS generate_invoice_number();

-- Aktifkan lagi trigger lama (Skenario B) supaya order tetap bisa completed
-- dengan logika yang berjalan sebelumnya.
DROP TRIGGER IF EXISTS on_order_completed ON orders;
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_completion();

DROP POLICY IF EXISTS "earnings_mitra_read_own" ON earnings;
DROP POLICY IF EXISTS "earnings_admin_all" ON earnings;
DROP POLICY IF EXISTS "wallet_tx_mitra_read_own" ON wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_admin_all" ON wallet_transactions;
DROP POLICY IF EXISTS "invoices_mitra_read_own" ON invoices;
DROP POLICY IF EXISTS "invoices_admin_all" ON invoices;

DROP TABLE IF EXISTS earnings;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS invoices;

ALTER TABLE orders DROP COLUMN IF EXISTS min_wallet_required;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS skill_category,
  DROP COLUMN IF EXISTS gender;

COMMIT;
*/
