-- Jalankan ini di SQL Editor Supabase supaya perubahan tabel `orders`
-- (insert/update) bisa didengar secara realtime oleh Dasbor Admin.

alter publication supabase_realtime add table orders;
