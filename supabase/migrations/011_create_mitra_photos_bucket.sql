-- ============================================================================
-- 011_create_mitra_photos_bucket.sql
--
-- Membuat Storage bucket "mitra-photos" LANGSUNG lewat SQL (tidak perlu
-- klik manual di Supabase Dashboard seperti bucket "invoices" sebelumnya —
-- ternyata bisa langsung lewat migrasi).
--
-- Bucket dibuat PUBLIC karena foto profil mitra memang akan ditampilkan di
-- landing page publik (section Mitra Showcase) — sama seperti pertimbangan
-- bucket "invoices".
-- ============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mitra-photos', 'mitra-photos', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
