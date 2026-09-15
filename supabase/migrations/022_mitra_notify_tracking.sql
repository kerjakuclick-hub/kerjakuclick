-- ============================================================================
-- 022_mitra_notify_tracking.sql
--
-- Addendum "Notifikasi Mitra Otomatis": begitu admin menugaskan mitra ke
-- sebuah pesanan, mitra langsung dapat WA otomatis berisi detail tugas +
-- kontak klien (lihat lib/whatsapp.ts buildMitraAssignedMessage &
-- app/api/admin/orders/assign/route.ts) -- sebelumnya mitra baru tahu ada
-- tugas kalau membuka dasbor mitra sendiri.
--
-- Kolom pelacak ini mengikuti pola client_notified_at/client_notify_error
-- (migrasi 020) supaya admin bisa lihat status & klik "Coba Kirim Lagi" di
-- OrdersFeed kalau pengiriman WA ke mitra gagal.
--
-- Sifat: ADDITIVE ONLY, aman untuk data live. Tidak ada DROP/RENAME/ALTER
-- TYPE pada kolom yang sudah ada.
-- ============================================================================

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS mitra_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mitra_notify_error TEXT;

COMMENT ON COLUMN orders.mitra_notified_at IS 'Waktu notifikasi WA "tugas baru" berhasil terkirim otomatis ke mitra saat ditugaskan admin';
COMMENT ON COLUMN orders.mitra_notify_error IS 'Pesan error terakhir kalau pengiriman notifikasi otomatis ke mitra gagal (admin bisa coba kirim ulang lewat tombol di OrdersFeed)';

COMMIT;
