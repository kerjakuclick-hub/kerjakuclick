-- ============================================================================
-- 027_order_extra_time_and_invoice_notify.sql
--
-- Bagian "Skema Tambah Waktu Kerja" (diangkat dari DOK BISNIS SEPT 2026.pdf,
-- dokumen sebelum revisi pasca-audit fraud -- belum pernah diimplementasikan
-- ke sistem sebelum ini) + otomatisasi pengiriman invoice pembayaran.
--
-- 1. orders.extra_time_* -- klien bisa menambah waktu kerja (HANYA 30 atau
--    60 menit, HANYA untuk order Setrika Fast/PRO & Cleaning Fast/PRO, lihat
--    lib/services.ts EXTRA_TIME_RATES) lewat tombol di dashboard klien
--    (app/riwayat/page.tsx) SEBELUM pesanan diselesaikan mitra. Dokumen
--    eksplisit membatasi ini "dispensasi 1 jam kerja" per pesanan -- kalau
--    klien perlu lebih, wajib bikin pesanan baru (repeat order), BUKAN
--    menambah lagi di pesanan yang sama. Makanya extra_time_minutes dibatasi
--    CHECK ke (0, 30, 60) -- tidak bisa diakumulasi lebih dari itu.
--
--    total_price pesanan LANGSUNG ditambah nominal tambah waktu begitu
--    diajukan (bukan disimpan terpisah lalu dijumlah nanti) -- supaya semua
--    perhitungan yang sudah ada (potongan fee tier mitra saat completed,
--    min_wallet_required, invoice pembayaran) otomatis ikut benar tanpa
--    perlu diubah satu-satu; extra_time_minutes/extra_time_price di sini
--    murni jejak audit + dasar tampilan rincian di UI & invoice.
--
-- 2. orders.invoice_notified_at / invoice_notify_error -- jejak pengiriman
--    OTOMATIS invoice pembayaran ke klien lewat Fonnte begitu mitra
--    menyelesaikan tugas (app/api/mitra/orders/update/route.ts). Pola sama
--    persis dengan client_notified_at/client_notify_error (migrasi 020) &
--    mitra_notified_at/mitra_notify_error (migrasi 022), cuma untuk event
--    yang berbeda (selesai kerja, bukan penugasan) -- MENGGANTIKAN alur lama
--    "mitra unduh PDF lalu kirim manual sendiri via WA pribadinya".
--
-- Sifat: ADDITIVE ONLY, aman untuk data live.
-- ============================================================================

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS extra_time_minutes SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_time_price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_time_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_notify_error TEXT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_extra_time_minutes_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_extra_time_minutes_check CHECK (extra_time_minutes IN (0, 30, 60));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_extra_time_price_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_extra_time_price_check CHECK (extra_time_price >= 0);

COMMENT ON COLUMN public.orders.extra_time_minutes IS 'Tambah waktu kerja yang diajukan klien -- 0 (belum ada), 30, atau 60 menit. Maks 1x per pesanan (lihat skema di lib/services.ts EXTRA_TIME_RATES); kalau perlu lebih, klien wajib repeat order baru.';
COMMENT ON COLUMN public.orders.extra_time_price IS 'Nominal rupiah tambah waktu (sudah termasuk di total_price) -- disimpan terpisah murni untuk jejak audit & rincian tampilan, bukan sumber kebenaran harga.';
COMMENT ON COLUMN public.orders.extra_time_requested_at IS 'Kapan klien mengajukan tambah waktu -- null kalau belum pernah.';
COMMENT ON COLUMN public.orders.invoice_notified_at IS 'Waktu invoice pembayaran berhasil terkirim otomatis ke WA klien lewat Fonnte, begitu mitra menyelesaikan tugas.';
COMMENT ON COLUMN public.orders.invoice_notify_error IS 'Pesan error terakhir kalau pengiriman otomatis invoice pembayaran ke WA klien gagal.';

COMMIT;
