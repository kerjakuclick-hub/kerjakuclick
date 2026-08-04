-- ============================================================================
-- 015_mitra_applications.sql
--
-- Tabel pendaftaran mitra dari form publik + bucket Storage KHUSUS PRIVATE
-- untuk dokumen sensitif (foto profil, KTP, KK). Ini murni FILTER AWAL
-- pengumpulan data — proses wawancara, verifikasi keaslian dokumen, dan
-- pelatihan tetap dilakukan manual sesuai SOP yang sudah berjalan.
--
-- PENTING: bucket "mitra-applications" dibuat PUBLIC = FALSE (privat).
-- Berbeda dari bucket "mitra-photos"/"site-media" yang memang untuk
-- ditampilkan publik — dokumen KTP/KK TIDAK BOLEH bisa diakses lewat link
-- langsung oleh siapa pun. Hanya admin yang bisa membukanya lewat signed
-- URL sementara (lihat app/api/admin/mitra-applications/get-file-url).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS mitra_applications (
  id              BIGSERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL,
  address         TEXT NOT NULL,
  phone           TEXT NOT NULL,
  social_media    TEXT,
  skill_category  TEXT[] NOT NULL,
  photo_path      TEXT,
  ktp_path        TEXT,
  kk_path         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  admin_notes     TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES profiles(id)
);

COMMENT ON TABLE mitra_applications IS 'Pendaftaran mitra dari form publik — filter awal, keputusan akhir tetap manual (wawancara, verifikasi dokumen, pelatihan)';
COMMENT ON COLUMN mitra_applications.photo_path IS 'Path di bucket privat mitra-applications, BUKAN URL publik';

ALTER TABLE mitra_applications ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang boleh baca/ubah data pendaftar (lewat client bersesi admin).
-- INSERT dari form publik dilakukan lewat API route dengan service role
-- (getSupabaseAdmin), jadi tidak perlu policy INSERT terpisah untuk anon.
DROP POLICY IF EXISTS "mitra_applications_admin_all" ON mitra_applications;
CREATE POLICY "mitra_applications_admin_all" ON mitra_applications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Bucket PRIVATE (public: false) untuk dokumen sensitif
INSERT INTO storage.buckets (id, name, public)
VALUES ('mitra-applications', 'mitra-applications', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
