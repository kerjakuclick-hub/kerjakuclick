-- ============================================================================
-- 016_les_private_verification.sql
--
-- Mendukung layanan baru "Les Private": tambah kolom verifikasi pendidikan
-- di form pendaftaran mitra (pendidikan terakhir, status masih kuliah,
-- dokumen KTM kalau masih kuliah), dan seed slot Media Library untuk foto
-- promosi kategori Les Private.
--
-- Sifat: ADDITIVE ONLY, aman untuk data live.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. mitra_applications — kolom verifikasi pendidikan (dipakai saat proses
--    pendaftaran/wawancara, terutama untuk mitra Les Private: mahasiswa
--    semester akhir, guru honorer, sarjana)
-- ----------------------------------------------------------------------------
ALTER TABLE mitra_applications
  ADD COLUMN IF NOT EXISTS last_education TEXT,
  ADD COLUMN IF NOT EXISTS is_student BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS student_id_path TEXT;

COMMENT ON COLUMN mitra_applications.last_education IS 'Pendidikan terakhir pendaftar, mis. SMA/D3/S1';
COMMENT ON COLUMN mitra_applications.is_student IS 'True kalau pendaftar sedang berkuliah (semester akhir dll)';
COMMENT ON COLUMN mitra_applications.student_id_path IS 'Path KTM (Kartu Tanda Mahasiswa) di bucket privat mitra-applications, wajib diisi kalau is_student = true';

-- ----------------------------------------------------------------------------
-- 2. profiles — field yang sama untuk mitra yang sudah aktif, supaya admin
--    bisa lihat kualifikasi pendidikan saat menugaskan Les Private
-- ----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_education TEXT;

COMMENT ON COLUMN profiles.last_education IS 'Pendidikan terakhir mitra, dicatat terutama untuk mitra Les Private';

-- ----------------------------------------------------------------------------
-- 3. Seed slot Media Library untuk foto promosi Les Private
-- ----------------------------------------------------------------------------
INSERT INTO site_media (slug, label) VALUES
  ('service_les_private', 'Layanan: Les Private')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
