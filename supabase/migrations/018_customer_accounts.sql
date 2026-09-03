-- FILE BARU: supabase/migrations/018_customer_accounts.sql
--
-- Tabel akun pelanggan (BUKAN admin/mitra -- itu tetap lewat Supabase Auth
-- & tabel profiles seperti biasa, tidak disentuh sama sekali di sini).
-- Pelanggan daftar dengan nama, nomor WA (unik), dan PIN 4 digit yang
-- di-hash (scrypt+salt, lihat lib/customerAuth.ts) -- PIN TIDAK PERNAH
-- disimpan dalam bentuk plain text.
--
-- Latar belakang: sebelumnya riwayat pesanan direncanakan bisa diakses
-- siapa saja yang tahu nomor WA orang lain (celah privasi, dibatalkan
-- sebelum sempat dipasang). Dengan tabel ini, riwayat & fitur "Pesan
-- Lagi" cuma bisa diakses lewat sesi login milik nomor WA itu sendiri.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_sessions_customer_id_idx
  on public.customer_sessions (customer_id);

alter table public.customers enable row level security;
alter table public.customer_sessions enable row level security;

-- SENGAJA tidak ada policy publik/anon di kedua tabel ini -- keduanya
-- HANYA diakses lewat service-role client di server
-- (app/api/customer/*/route.ts & app/api/riwayat/route.ts), tidak pernah
-- langsung dari browser lewat Supabase client-side. RLS aktif tanpa
-- policy = default deny untuk role anon & authenticated.
