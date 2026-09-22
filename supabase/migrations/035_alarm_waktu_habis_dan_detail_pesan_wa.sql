-- ============================================================================
-- 035_alarm_waktu_habis_dan_detail_pesan_wa.sql
--
-- Fitur "Alarm Waktu Habis", diangkat dari hasil audit lapangan (22 September
-- 2026): hampir seluruh klien mengabaikan durasi & cakupan kerja yang
-- disepakati, dan mitra segan mengingatkan/menegur klien secara langsung --
-- menyebabkan mitra kerja lembur tanpa tambahan bayaran.
--
-- SOLUSI (3 bagian, DIKONFIRMASI lewat pertanyaan klarifikasi 22 September
-- 2026 karena arsitektur cron/scheduled-job memang belum ada sama sekali di
-- proyek ini sebelum migrasi ini):
--   1. WA "pesanan disetujui" ke klien (buildOrderApprovedMessage,
--      lib/whatsapp.ts) sekarang mencantumkan Harga Jasa (sudah ada
--      sebelumnya), Durasi Waktu, & Cakupan Area Kerja secara eksplisit --
--      supaya batasannya disampaikan SISTEM sejak awal, bukan mitra yang
--      harus "menegur" klien di lapangan.
--   2. Dasbor Mitra menghitung mundur dari `working_started_at` (kolom BARU
--      di migrasi ini, diisi app/api/mitra/orders/update/route.ts saat mitra
--      klik "Mulai Kerjakan") + durasi & tambah waktu, lalu menampilkan alarm
--      + tombol "Ingatkan Klien via WA" (mitra-inisiatif, langsung kirim WA
--      lewat sistem -- BUKAN membagikan nomor pribadi mitra ke klien,
--      konsisten dengan kebijakan Bagian 7.2/8.2 yang sudah ada).
--   3. pg_cron + pg_net (DIKONFIRMASI dipakai Anda, dibanding Vercel Cron
--      yang perlu paket Pro berbayar untuk jadwal < 1x/hari, atau layanan
--      cron eksternal pihak ketiga) mengecek tiap 5 menit lewat
--      app/api/cron/time-up-check/route.ts, kirim WA OTOMATIS ke klien kalau
--      mitra belum sempat/lupa klik tombol pengingat manual.
--
-- Titik awal hitungan alarm DIKONFIRMASI = waktu mitra klik "Mulai Kerjakan"
-- (working_started_at), BUKAN jadwal pesanan (scheduled_date/preferred_time)
-- -- supaya akurat mengikuti waktu kerja aktual di lokasi, bukan jadwal yang
-- mungkin meleset (mitra datang lebih awal/telat dari jadwal).
--
-- YANG DILAKUKAN MIGRASI INI:
--   1. orders.working_started_at (BARU) -- diisi APLIKASI (bukan trigger,
--      beda dari completed_at migrasi 034) saat status assigned -> working.
--   2. orders.duration_minutes (BARU) -- snapshot estimasi durasi kerja
--      (menit) dari lib/services.ts SAAT mitra mulai kerja, dikunci supaya
--      tidak ikut berubah kalau katalog produk berubah belakangan.
--   3. orders.work_scope_snapshot (BARU) -- snapshot teks "Cakupan Area
--      Kerja" (unit + rincian pekerjaan) SAAT mitra mulai kerja, ditampilkan
--      di Dasbor Mitra & WA "waktu habis" supaya mitra & klien punya acuan
--      identik yang tidak berubah walau katalog berubah.
--   4. orders.time_up_notified_at / time_up_notify_error (BARU) -- jejak
--      pengiriman notifikasi WA "waktu habis" ke klien, pola sama persis
--      dengan client_notified_at/mitra_notified_at/invoice_notified_at yang
--      sudah ada (migrasi 020/022/027).
--   5. Extension pg_cron & pg_net (kalau belum aktif di project Supabase
--      Anda) + jadwal cron `kerjakuclick-time-up-check` yang memanggil
--      endpoint app/api/cron/time-up-check/route.ts tiap 5 menit lewat HTTP
--      POST (pg_net.http_post).
--
-- PENTING -- LANGKAH MANUAL DI LUAR MIGRASI INI (SENGAJA TIDAK dimasukkan ke
-- file ini supaya rahasianya TIDAK ikut ke-commit ke git):
--   1. Tambah env var CRON_SECRET di Vercel (isi string acak, misalnya hasil
--      `openssl rand -hex 32`), lalu redeploy.
--   2. Di Supabase Dashboard -> SQL Editor, jalankan SEKALI SAJA (ganti nilai
--      di bawah dengan STRING YANG SAMA PERSIS seperti CRON_SECRET di
--      Vercel):
--        ALTER DATABASE postgres SET app.settings.cron_secret = 'ISI_DENGAN_STRING_RAHASIA_ANDA';
--      (Ganti 'postgres' kalau nama database Anda beda -- cek di Project
--      Settings -> Database -> Connection info.)
--   Tanpa 2 langkah manual di atas, jadwal cron di bawah TETAP berjalan tiap
--   5 menit tapi selalu ditolak 401 oleh endpoint-nya (header rahasia kosong)
--   -- artinya TIDAK ADA WA yang benar-benar terkirim sampai keduanya diisi.
--   Silakan jalankan migrasi ini dulu, baru selesaikan 2 langkah manual di
--   atas kapan pun sebelum mengandalkan alarm otomatisnya.
-- ============================================================================

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS working_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS work_scope_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS time_up_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_up_notify_error TEXT;

-- pg_cron (penjadwal) & pg_net (HTTP client dari dalam Postgres) -- keduanya
-- extension resmi yang disediakan Supabase, aman diaktifkan lewat migrasi
-- biasa (CREATE EXTENSION IF NOT EXISTS aman dijalankan berkali-kali).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hapus jadwal lama dulu kalau migrasi ini pernah dijalankan sebagian
-- sebelumnya (mis. supabase db push sempat gagal di tengah jalan) --
-- supaya idempotent, aman di-`supabase db push` ulang tanpa bikin jadwal
-- dobel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kerjakuclick-time-up-check') THEN
    PERFORM cron.unschedule('kerjakuclick-time-up-check');
  END IF;
END $$;

-- Jadwal: tiap 5 menit, panggil endpoint pengecekan "waktu habis" lewat HTTP
-- POST. `current_setting('app.settings.cron_secret', true)` -- argumen kedua
-- `true` bikin fungsi ini balikan NULL (bukan error) kalau setting-nya belum
-- pernah diisi lewat langkah manual di atas; endpoint di sisi Next.js yang
-- menolak (401) kalau header-nya kosong/tidak cocok, BUKAN di sini -- supaya
-- migrasi ini sendiri tidak pernah gagal gara-gara setting belum diisi.
SELECT cron.schedule(
  'kerjakuclick-time-up-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kerjaku.click/api/cron/time-up-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMIT;
