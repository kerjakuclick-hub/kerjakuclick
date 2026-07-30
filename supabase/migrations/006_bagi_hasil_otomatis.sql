-- Tahap 4: Bagi Hasil Otomatis (80% mitra / 20% platform)
--
-- Dipicu otomatis oleh database trigger setiap kali status order berubah
-- jadi 'completed' — baik itu diubah dari Dasbor Mitra maupun Dasbor Admin.
-- Trigger dipilih (bukan logika di API route) supaya satu-satunya sumber
-- kebenaran, dan tidak mungkin diproses dua kali dari dua jalur berbeda.

create table if not exists transactions (
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

drop policy if exists "transactions_admin_all" on transactions;
create policy "transactions_admin_all" on transactions for select using (public.is_admin());

drop policy if exists "transactions_mitra_own" on transactions;
create policy "transactions_mitra_own" on transactions for select using (mitra_id = auth.uid());

-- Fungsi pemroses bagi hasil. SECURITY DEFINER supaya bisa menulis ke
-- transactions & profiles terlepas dari siapa yang memicu update order
-- (mitra hanya boleh update status order sendiri, tidak boleh langsung
-- mengubah saldo — trigger inilah yang melakukannya atas nama sistem).
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

    -- Jaga-jaga: jangan proses dua kali kalau trigger ini sempat jalan
    -- lebih dari sekali untuk order yang sama.
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

drop trigger if exists on_order_completed on orders;
create trigger on_order_completed
  after update on orders
  for each row
  execute function public.handle_order_completion();
