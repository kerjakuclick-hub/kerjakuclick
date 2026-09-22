-- ============================================================================
-- 036_perbaikan_secret_cron_pakai_vault.sql
--
-- PERBAIKAN atas migrasi 035 (fitur "Alarm Waktu Habis"): langkah manual yang
-- diminta di sana -- `ALTER DATABASE postgres SET app.settings.cron_secret =
-- '...'` -- TERNYATA ditolak oleh Supabase begitu benar-benar dijalankan di
-- SQL Editor:
--     ERROR: 42501: permission denied to set parameter "app.settings.cron_secret"
-- Rupanya role yang dipakai koneksi SQL Editor di project Supabase Anda tidak
-- punya privilese ALTER DATABASE (project TIDAK memiliki database itu secara
-- penuh lewat role tersebut) -- pendekatan `current_setting()` dari migrasi
-- 035 tidak bisa dipakai di sini.
--
-- GANTI ke SUPABASE VAULT (vault.create_secret / vault.decrypted_secrets) --
-- fitur resmi bawaan Supabase yang memang dirancang persis untuk kasus ini:
-- menyimpan rahasia yang dibaca pg_cron/pg_net/trigger, TANPA butuh
-- privilese ALTER DATABASE apa pun (Vault sudah aktif di semua project
-- Supabase, tidak perlu CREATE EXTENSION).
--
-- YANG DILAKUKAN MIGRASI INI:
--   Jadwal cron 'kerjakuclick-time-up-check' (dibuat migrasi 035) DIHAPUS &
--   DIBUAT ULANG di sini -- isinya SAMA PERSIS kecuali sumber header
--   `x-cron-secret`, sekarang diambil dari `vault.decrypted_secrets`
--   (dicari lewat kolom `name = 'kerjakuclick_cron_secret'`) alih-alih
--   `current_setting('app.settings.cron_secret', true)`.
--   `ORDER BY created_at DESC LIMIT 1` dipasang berjaga-jaga kalau secret
--   dengan nama sama ini sempat dibuat lebih dari sekali (mis. langkah
--   manual di bawah tidak sengaja dijalankan dua kali) -- subquery tetap
--   pasti mengembalikan SATU baris (yang paling baru), bukan error "more
--   than one row returned by a subquery".
--
-- LANGKAH MANUAL (GANTI dari langkah migrasi 035 -- jalankan SEKALI SAJA di
-- Supabase Dashboard -> SQL Editor, SETELAH migrasi ini ter-push. SENGAJA
-- TIDAK dimasukkan ke file migrasi ini supaya rahasianya tidak ikut
-- ke-commit ke git):
--
--   select vault.create_secret(
--     'ISI_DENGAN_STRING_SAMA_PERSIS_DENGAN_CRON_SECRET_DI_VERCEL',
--     'kerjakuclick_cron_secret',
--     'Header x-cron-secret untuk endpoint /api/cron/time-up-check kerjaku.click'
--   );
--
-- (Kalau Anda sempat berhasil menjalankan `ALTER DATABASE ... SET` dari
-- migrasi 035 di project lain/percobaan lain, itu tidak masalah dibiarkan
-- ada -- tidak dipakai lagi oleh jadwal cron yang baru di migrasi ini, aman
-- diabaikan begitu saja.)
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kerjakuclick-time-up-check') THEN
    PERFORM cron.unschedule('kerjakuclick-time-up-check');
  END IF;
END $$;

SELECT cron.schedule(
  'kerjakuclick-time-up-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kerjaku.click/api/cron/time-up-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'kerjakuclick_cron_secret'
        ORDER BY created_at DESC
        LIMIT 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMIT;
