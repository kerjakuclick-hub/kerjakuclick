-- Jalankan ini HANYA jika tabel `orders` sudah dibuat sebelumnya
-- (dari versi schema.sql yang belum punya kolom waktu & preferensi).

alter table orders add column if not exists preferred_time text;
alter table orders add column if not exists mitra_gender_preference text
  check (mitra_gender_preference in ('Pria', 'Wanita', 'Bebas'));
