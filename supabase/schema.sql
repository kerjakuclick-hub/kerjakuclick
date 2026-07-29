-- Kerjakuclick — Schema Supabase (Tahap 1)
-- Jalankan ini di SQL Editor pada project Supabase baru.
-- Jika tabel `orders` sudah pernah dibuat sebelumnya, jangan jalankan file
-- ini lagi — lihat migrations/001_add_waktu_preferensi.sql sebagai gantinya.

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  phone text not null,
  role text check (role in ('admin', 'mitra')) default 'mitra',
  wallet_balance bigint default 0,
  total_earnings bigint default 0,
  status text check (status in ('training','ahli')) default 'training',
  is_active boolean default true
);

create table orders (
  id bigserial primary key,
  customer_name text not null,
  customer_phone text not null,
  address text not null,
  service_type text not null,
  total_price bigint not null,
  scheduled_date date,
  preferred_time text,
  mitra_gender_preference text check (
    mitra_gender_preference in ('Pria', 'Wanita', 'Bebas')
  ),
  mitra_id uuid references profiles(id) default null,
  status text check (status in ('unassigned','assigned','working','completed','cancelled')) default 'unassigned',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table orders enable row level security;

-- Fungsi SECURITY DEFINER ini melewati RLS saat mengecek role admin,
-- supaya kebijakan di bawah tidak query ulang dirinya sendiri
-- (infinite recursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles_self_read" on profiles for select using (auth.uid() = id);
create policy "profiles_admin_all" on profiles for all using (public.is_admin());

create policy "orders_admin_all" on orders for all using (public.is_admin());
create policy "orders_mitra_own" on orders for select using (mitra_id = auth.uid());
