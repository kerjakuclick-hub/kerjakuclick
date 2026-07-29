-- Jalankan ini di SQL Editor Supabase kalau tabel `orders` sudah ada
-- (setelah migration 001_add_waktu_preferensi.sql).

alter table orders add column if not exists scheduled_date date;
