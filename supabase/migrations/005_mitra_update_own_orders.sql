-- Mitra perlu bisa update status order miliknya sendiri (misalnya dari
-- "assigned" ke "working" lalu "completed") lewat Dasbor Mitra.
-- Kebijakan ini membatasi: hanya baris yang mitra_id-nya cocok dengan
-- dirinya sendiri, dan hanya boleh set status ke 'working' atau 'completed'
-- (tidak bisa reassign ke mitra lain atau ubah ke status admin-only).

drop policy if exists "orders_mitra_update_own" on orders;
create policy "orders_mitra_update_own" on orders for update
  using (mitra_id = auth.uid())
  with check (mitra_id = auth.uid() and status in ('working', 'completed'));
