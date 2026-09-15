-- Migrasi: tabel untuk menyimpan permintaan reset PIN pelanggan (OTP dikirim via WA).
-- Jalankan lewat Supabase SQL Editor atau migration tool yang biasa Anda pakai.

create table if not exists customer_pin_resets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  otp_hash text not null,           -- format "salt:hash", sama pola dengan customers.pin_hash
  expires_at timestamptz not null,  -- OTP kedaluwarsa setelah beberapa menit
  attempts_left int not null default 5, -- jaga-jaga OTP ditebak berulang
  used_at timestamptz,              -- diisi begitu OTP berhasil dipakai / digantikan OTP baru
  created_at timestamptz not null default now()
);

-- Index untuk lookup "OTP aktif terbaru milik customer tertentu" (dipakai di confirmPinReset & rate limit)
create index if not exists idx_customer_pin_resets_customer_active
  on customer_pin_resets (customer_id, created_at desc)
  where used_at is null;