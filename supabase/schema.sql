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
create policy "orders_mitra_update_own" on orders for update
  using (mitra_id = auth.uid())
  with check (mitra_id = auth.uid() and status in ('working', 'completed'));

-- Tahap 4: pembukuan bagi hasil 80/20, diproses otomatis lewat trigger
-- setiap kali status order berubah jadi 'completed'.
create table transactions (
  id bigserial primary key,
  order_id bigint references orders(id) not null,
  mitra_id uuid references profiles(id) not null,
  gross_amount bigint not null,
  mitra_share bigint not null,
  platform_share bigint not null,
  type text check (type in ('order_completion', 'adjustment')) default 'order_completion',
  created_at timestamptz default now()
);

alter table transactions enable row level security;

create policy "transactions_admin_all" on transactions for select using (public.is_admin());
create policy "transactions_mitra_own" on transactions for select using (mitra_id = auth.uid());

create or replace function public.handle_order_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mitra_share bigint;
  v_platform_share bigint;
begin
  if NEW.status = 'completed'
     and OLD.status is distinct from 'completed'
     and NEW.mitra_id is not null then

    if not exists (select 1 from public.transactions where order_id = NEW.id) then
      v_mitra_share := floor(NEW.total_price * 0.8);
      v_platform_share := NEW.total_price - v_mitra_share;

      insert into public.transactions (order_id, mitra_id, gross_amount, mitra_share, platform_share, type)
      values (NEW.id, NEW.mitra_id, NEW.total_price, v_mitra_share, v_platform_share, 'order_completion');

      update public.profiles
      set wallet_balance = wallet_balance + v_mitra_share,
          total_earnings = total_earnings + v_mitra_share
      where id = NEW.mitra_id;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger on_order_completed
  after update on orders
  for each row
  execute function public.handle_order_completion();
