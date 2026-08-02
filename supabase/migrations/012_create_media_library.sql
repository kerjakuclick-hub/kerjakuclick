-- ============================================================================
-- 012_create_media_library.sql
--
-- Membuat "Media Library" serbaguna — bukan cuma untuk 3 foto kategori
-- layanan, tapi tempat umum menyimpan gambar promosi apapun ke depannya
-- (banner promo, foto testimoni, dll) yang bisa diatur admin dari dashboard
-- tanpa perlu minta bantuan developer tiap kali ganti gambar.
--
-- Sifat: ADDITIVE. Tabel & bucket baru, tidak menyentuh yang sudah ada.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Tabel site_media — tiap baris adalah satu "slot" gambar dengan key unik
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_media (
  slug        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  image_url   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id)
);

COMMENT ON TABLE site_media IS 'Media library serbaguna — gambar promosi/kategori layanan yang bisa diatur admin dari dashboard, dipakai landing page publik';

ALTER TABLE site_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_media_public_read" ON site_media;
CREATE POLICY "site_media_public_read" ON site_media
  FOR SELECT USING (true);
  -- Public read: gambar ini memang ditampilkan di landing page publik.

DROP POLICY IF EXISTS "site_media_admin_write" ON site_media;
CREATE POLICY "site_media_admin_write" ON site_media
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Storage bucket untuk file gambar media library
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Seed 3 slot awal untuk kategori layanan (langsung siap dipakai,
--    admin tinggal upload foto, tidak perlu bikin slot baru dulu)
-- ----------------------------------------------------------------------------
INSERT INTO site_media (slug, label) VALUES
  ('service_setrika', 'Layanan: Setrika'),
  ('service_bersihkan_rumah', 'Layanan: Bersihkan Rumah'),
  ('service_cuci_kendaraan', 'Layanan: Cuci Kendaraan')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
