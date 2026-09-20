-- ============================================================================
-- 031_mitra_applications_checklist_dokumen.sql
--
-- Revisi form Daftar Mitra publik (ditugaskan Anda, 20 September 2026, awal
-- Phase 2 redesain UI): upload FOTO KTP & FOTO KK dihapus dari form
-- pendaftaran -- terlalu banyak friksi untuk calon mitra baru (upload 3 foto
-- dokumen + KTM kalau mahasiswa). Diganti CHECKLIST self-declaration: calon
-- mitra cuma centang "saya punya dokumen ini" (ya/tidak), BUKAN upload foto
-- dokumennya saat ini. Verifikasi fisik dokumen tetap dilakukan manual saat
-- wawancara/pelatihan (proses ini SUDAH ADA di luar sistem, tidak berubah --
-- lihat catatan migrasi 015).
--
-- Foto Profil & foto KTM (khusus mahasiswa) TIDAK terpengaruh -- keduanya
-- TETAP wajib upload seperti sebelumnya (foto profil dipakai utk ID Card
-- digital mitra begitu diterima; KTM tetap bukti keaslian status mahasiswa
-- sesuai SOP di migrasi 016/018 -- beda dari KTP/KK yang cukup checklist).
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. Tambah kolom has_ktp & has_kk (boolean, default false) -- checklist
--      self-declaration dari form.
--   2. Kolom ktp_path & kk_path (migrasi 015) TIDAK DIHAPUS -- dibiarkan
--      NULLABLE seperti semula, diisi NULL untuk pendaftaran BARU (tidak
--      upload lagi), TETAP menyimpan path lama untuk pendaftaran LAMA yang
--      sudah sempat upload sebelum migrasi ini (jangan hapus data existing,
--      konsisten pola "jangan hapus, arsipkan" migrasi 008). Admin masih
--      bisa buka dokumen lama itu lewat tombol "Lihat KTP/KK" yang sudah ada
--      -- UI admin (MitraApplicationsList.tsx) menampilkan tombol itu KALAU
--      path-nya masih ada, dan badge checklist KALAU tidak.
-- ============================================================================

BEGIN;

ALTER TABLE mitra_applications
  ADD COLUMN IF NOT EXISTS has_ktp BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_kk BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN mitra_applications.has_ktp IS
  'Checklist self-declaration calon mitra saat daftar: "saya punya KTP" (ya/tidak) -- MENGGANTIKAN upload foto KTP (migrasi 031). Verifikasi fisik tetap manual saat wawancara.';
COMMENT ON COLUMN mitra_applications.has_kk IS
  'Checklist self-declaration calon mitra saat daftar: "saya punya KK" (ya/tidak) -- MENGGANTIKAN upload foto KK (migrasi 031). Verifikasi fisik tetap manual saat wawancara.';
COMMENT ON COLUMN mitra_applications.ktp_path IS
  'Path di bucket privat mitra-applications (migrasi 015). Sejak migrasi 031 SELALU NULL untuk pendaftaran baru (upload dihapus, lihat has_ktp) -- kolom ini dipertahankan hanya untuk pendaftaran lama yang sudah sempat upload sebelum migrasi ini.';
COMMENT ON COLUMN mitra_applications.kk_path IS
  'Path di bucket privat mitra-applications (migrasi 015). Sejak migrasi 031 SELALU NULL untuk pendaftaran baru (upload dihapus, lihat has_kk) -- kolom ini dipertahankan hanya untuk pendaftaran lama yang sudah sempat upload sebelum migrasi ini.';

COMMIT;
