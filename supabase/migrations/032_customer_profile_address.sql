-- FILE BARU: supabase/migrations/032_customer_profile_address.sql
--
-- Migrasi "Profil Klien" di halaman AkunKU (21 September 2026, dari Anda
-- langsung): "Akunku selain fungsi cek riwayat pesanan, kolom chat in app,
-- dan profil klien (nama dan alamat serta kolom foto bisa pakai avatar."
--
-- Tabel public.customers (migrasi 018) tadinya cuma punya name + phone
-- (dipakai buat login) -- BELUM ada tempat menyimpan alamat pelanggan
-- sebagai bagian dari profil (alamat sebelumnya cuma disimpan per-pesanan
-- di tabel orders, bukan di profil akun). Kolom `address` di bawah ini
-- opsional (nullable) -- pelanggan lama tanpa alamat tersimpan tetap bisa
-- login normal, cuma bagian alamat di kartu profil kosong sampai diisi.
--
-- CATATAN "kolom foto bisa pakai avatar": tidak ada kolom foto baru di
-- sini SENGAJA -- foto profil ditampilkan sebagai avatar inisial nama
-- (dibuat di sisi tampilan, components/ProfilKlien.tsx), bukan upload foto
-- asli. Kalau nanti Anda mau upload foto sungguhan, tinggal tambah kolom
-- `photo_url` + bucket storage baru, pola persis migrasi
-- 011_create_mitra_photos_bucket.sql yang sudah ada untuk mitra.

alter table public.customers
  add column if not exists address text;
