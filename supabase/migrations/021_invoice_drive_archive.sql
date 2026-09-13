-- ============================================================================
-- 021_invoice_drive_archive.sql
--
-- Addendum "Arsip Invoice Pembayaran ke Google Drive": setiap invoice
-- pembayaran yang terbit (mitra klik "Selesaikan Tugas") disalin otomatis ke
-- satu folder Drive khusus untuk audit -- kolom ini menyimpan link arsipnya.
-- Nullable karena arsip Drive bersifat best-effort (invoice tetap terbit
-- normal walau arsip Drive gagal/belum di-setup).
--
-- Sifat: ADDITIVE ONLY, aman untuk data live.
-- ============================================================================

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS drive_file_url TEXT;

COMMENT ON COLUMN invoices.drive_file_url IS 'Link arsip Google Drive (audit) -- null kalau arsip Drive belum di-setup atau gagal upload';

COMMIT;
