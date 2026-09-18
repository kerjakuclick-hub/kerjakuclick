-- ============================================================================
-- 026_order_messages_location.sql
--
-- Perluasan Chat Pesanan (Bagian 7.2/8.2, lanjutan migrasi
-- 025_order_messages_trust_safety.sql): dukungan kirim LOKASI di dalam chat
-- in-app, supaya mitra & klien bisa saling berbagi titik lokasi (mis. lokasi
-- mitra saat menuju rumah klien, atau titik alamat yang sulit ditemukan)
-- tanpa keluar ke WA pribadi.
--
-- Desain: SEDERHANA -- cukup 2 kolom angka (lat/lng) + 1 kolom penanda tipe
-- pesan, BUKAN skema attachment umum. Ini pilihan yang paling mudah dipahami
-- baik oleh mitra maupun klien (cuma "titik di peta"), dan paling ringan
-- dirawat -- tidak perlu storage bucket/upload file seperti kalau memakai
-- skema attachment generik.
--
-- Sifat: ADDITIVE ONLY (ALTER TABLE ADD COLUMN + 1 CHECK constraint baru),
-- aman untuk data live. Baris chat lama otomatis dianggap message_type =
-- 'text' (default), tidak ada migrasi data yang diperlukan.
-- ============================================================================

BEGIN;

ALTER TABLE public.order_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'location')),
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Pesan bertipe 'location' WAJIB punya kedua koordinat; pesan 'text' (mode
-- lama, mayoritas data) tidak wajib -- constraint ini yang menjaga
-- konsistensi data ke depannya tanpa mengubah baris yang sudah ada.
ALTER TABLE public.order_messages
  DROP CONSTRAINT IF EXISTS order_messages_location_requires_coords;
ALTER TABLE public.order_messages
  ADD CONSTRAINT order_messages_location_requires_coords
  CHECK (
    message_type <> 'location'
    OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)
  );

COMMENT ON COLUMN public.order_messages.message_type IS 'Jenis isi pesan chat -- "text" (default, mode lama) atau "location" (titik lokasi, lihat location_lat/location_lng).';
COMMENT ON COLUMN public.order_messages.location_lat IS 'Latitude titik lokasi yang dibagikan -- hanya diisi kalau message_type = ''location''.';
COMMENT ON COLUMN public.order_messages.location_lng IS 'Longitude titik lokasi yang dibagikan -- hanya diisi kalau message_type = ''location''.';

-- Tidak ada perubahan RLS -- policy insert/select yang sudah ada di migrasi
-- 025 (per sender_type & kecocokan order) berlaku sama untuk pesan lokasi,
-- karena policy itu tidak membatasi isi kolom body/message_type.

COMMIT;
