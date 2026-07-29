-- Perbaikan bug: "infinite recursion detected in policy for relation profiles".
--
-- Penyebab: kebijakan lama profiles_admin_all mengecek role admin dengan
-- query "select ... from profiles where id = auth.uid()" — tapi query itu
-- sendiri kena kebijakan yang sama, jadi Postgres mengecek dirinya sendiri
-- tanpa henti.
--
-- Perbaikan: pakai fungsi SECURITY DEFINER yang melewati RLS saat mengecek
-- role, sehingga tidak memicu rekursi.

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

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (public.is_admin());

drop policy if exists "orders_admin_all" on orders;
create policy "orders_admin_all" on orders for all using (public.is_admin());
