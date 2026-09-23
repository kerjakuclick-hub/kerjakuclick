-- ============================================================================
-- 037_tingkat_pendidikan_les_private.sql
--
-- Revisi FORMULIR PESANAN & DAFTAR MITRA (diminta 23 September 2026):
--
--   1. FORMULIR PESANAN -- Wizard Les Private sekarang bertanya
--      "Tingkat Pendidikan Anak" (TK/SD/SMP/SMA) SEBELUM pilihan Mata
--      Pelajaran, dan daftar Mata Pelajaran yang muncul DIBATASI sesuai
--      tingkat yang dipilih (DIKONFIRMASI lewat pertanyaan klarifikasi --
--      opsi "Dibatasi sesuai tingkat" dipilih, bukan menampilkan semua
--      8 mata pelajaran untuk semua tingkat). Nilai tingkat yang dipilih
--      klien disimpan di orders.les_private_level, murni sebagai INFORMASI
--      (ditampilkan di invoice/riwayat/chat mitra) -- TIDAK dipakai untuk
--      pencocokan/filter mitra otomatis.
--
--   2. DAFTAR MITRA -- form pendaftaran mitra untuk kategori Les Private
--      sekarang punya field tambahan "Keahlian mengajar untuk tingkat
--      pendidikan" (checkbox, bisa pilih lebih dari 1): TK/SD/SMP/SMA/Umum.
--      DIKONFIRMASI lewat pertanyaan klarifikasi: field ini CUMA INFORMASI
--      untuk admin saat menyeleksi pendaftar & mengelola mitra (Kelola
--      Mitra) -- TIDAK dipakai membatasi dropdown "Pilih Mitra" atau fungsi
--      eligible_mitra_for_order() di database. Ejaan dibakukan "SMA" (bukan
--      "SMU") sesuai permintaan, konsisten dgn sisi klien di atas.
--
-- YANG DILAKUKAN MIGRASI INI (murni tambah kolom nullable, TIDAK ada
-- perubahan fungsi SQL/matching -- keputusan Bagian 2 di atas):
--   a. orders.les_private_level                       TEXT (nullable)
--   b. profiles.les_private_teaching_levels            TEXT[] (nullable)
--   c. mitra_applications.les_private_teaching_levels  TEXT[] (nullable)
-- ============================================================================

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS les_private_level TEXT;

COMMENT ON COLUMN orders.les_private_level IS
  'BARU -- migrasi 037: "TK"|"SD"|"SMP"|"SMA", HANYA diisi untuk order Les Private (dipilih klien di wizard pemesanan). Null untuk Setrika/Bersihkan Rumah. Murni informasi tampilan, TIDAK dipakai pencocokan mitra otomatis.';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS les_private_teaching_levels TEXT[];

COMMENT ON COLUMN profiles.les_private_teaching_levels IS
  'BARU -- migrasi 037: subset dari {"TK","SD","SMP","SMA","Umum"}, bisa lebih dari satu. Cuma informasi utk admin (Kelola Mitra) -- TIDAK dipakai membatasi eligible_mitra_for_order().';

ALTER TABLE mitra_applications
  ADD COLUMN IF NOT EXISTS les_private_teaching_levels TEXT[];

COMMENT ON COLUMN mitra_applications.les_private_teaching_levels IS
  'BARU -- migrasi 037: subset dari {"TK","SD","SMP","SMA","Umum"} yang diisi pendaftar lewat form publik (hanya relevan kalau skill_category mengandung salah satu kategori Les Private). Referensi manual admin saat approval -- TIDAK otomatis disalin ke profiles.';

COMMIT;
