-- ============================================================================
-- 020_client_notify_and_payment_invoice.sql
--
-- Addendum "Notifikasi Klien Otomatis + Invoice Pembayaran":
--   1. Notifikasi WA otomatis ke klien saat mitra ditugaskan (menggantikan
--      alur manual ID Card gambar + invoice PDF yang dikirim admin satu per
--      satu) -- butuh kolom pelacak berhasil/gagalnya pengiriman.
--   2. Invoice PEMBAYARAN baru yang terbit otomatis saat mitra klik
--      "Selesaikan Tugas" di dashboard mitra -- beda dari dokumen lama yang
--      terbit saat PENUGASAN (konfirmasi/task-slip, migrasi 007). Mitra
--      sendiri yang mengunduh & mengirim invoice ini ke klien via WA
--      (mitra yang menerima pembayaran tunai/transfer), jadi butuh kolom
--      pembeda `purpose` supaya kedua jenis dokumen tidak tertukar di query.
--
-- Sifat: ADDITIVE ONLY, aman untuk data live. Tidak ada DROP/RENAME/ALTER
-- TYPE pada kolom yang sudah ada.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. orders — jejak notifikasi WA otomatis "pesanan disetujui"
-- ----------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_notify_error TEXT;

COMMENT ON COLUMN orders.client_notified_at IS 'Waktu notifikasi WA "pesanan disetujui" berhasil terkirim otomatis ke klien saat mitra ditugaskan';
COMMENT ON COLUMN orders.client_notify_error IS 'Pesan error terakhir kalau pengiriman notifikasi otomatis ke klien gagal (admin bisa coba kirim ulang manual)';

-- ----------------------------------------------------------------------------
-- 2. invoices — bedakan dokumen "konfirmasi" (task-slip saat penugasan,
--    sudah ada sejak migrasi 007, dikirim admin) dari "pembayaran" (invoice/
--    struk saat pekerjaan selesai, dikirim MITRA sendiri ke klien).
-- ----------------------------------------------------------------------------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'konfirmasi'
    CHECK (purpose IN ('konfirmasi', 'pembayaran'));

COMMENT ON COLUMN invoices.purpose IS 'konfirmasi = dokumen saat penugasan mitra (lama); pembayaran = invoice/struk saat pekerjaan selesai, dikirim mitra sendiri ke klien';

COMMIT;
