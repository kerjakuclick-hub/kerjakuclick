-- Migrasi 017: tracking pengiriman ID Card mitra ke klien saat dispatch.
-- Konsisten dengan pola sent_at/sent_by yang sudah ada di tabel invoices.
--
-- PENTING: tempel manual ke Supabase SQL Editor -- migrasi tidak otomatis
-- jalan cuma karena git push (sesuai catatan lama Anda).

alter table public.orders
  add column if not exists mitra_id_card_sent_at timestamptz,
  add column if not exists mitra_id_card_sent_by uuid references public.profiles(id);