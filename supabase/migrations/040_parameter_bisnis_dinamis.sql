-- ============================================================================
-- 040_parameter_bisnis_dinamis.sql
--
-- FITUR "PARAMETER BISNIS" (25 September 2026): semua angka acuan logika
-- hitung kerjaku.click dipindah ke database dan diisi SUPER ADMIN lewat
-- Dasbor Admin -> Parameter Bisnis (/admin/parameter). Tidak perlu lagi
-- mengubah kode untuk ganti harga/fee/transport/katalog.
--
-- YANG DIBUAT:
--   1. profiles.is_super_admin -- hanya akun ini yang bisa melihat & mengubah
--      Parameter Bisnis (admin biasa tidak melihat menunya).
--   2. business_settings (1 baris) -- transport, aturan tambah waktu.
--   3. fee_tiers -- fee Fast/PRO & syarat naik tier per tier loyalty.
--   4. service_categories -- kategori jasa, label keahlian mitra, bahan baku.
--   5. service_products -- katalog produk & varian + HARGA JUAL FINAL.
--   6. business_param_history -- riwayat setiap perubahan (siapa, kapan,
--      nilai lama -> baru).
--   Nilai awal = nilai resmi yang berjalan sekarang (migrasi 039 +
--   lib/services.ts 25 Sep 2026) -- tidak ada angka yang berubah.
--
-- FUNGSI YANG SEKARANG MEMBACA TABEL (bukan angka tertulis di fungsi):
--   mitra_fee_percent, mitra_loyalty_tier, mitra_tier_info,
--   mitra_wallet_threshold (= fee New Fast x harga produk Fast termurah),
--   order_product_tier_label, order_required_skill.
--   Trigger potongan fee (migrasi 038) TIDAK diubah -- otomatis ikut.
--
-- LAINNYA: batasan orders.extra_time_minutes dilonggarkan (dulu hanya
--   0/30/60) supaya pilihan durasi tambah waktu bisa diatur dari dasbor.
--
-- KEAMANAN: semua tabel RLS aktif TANPA policy -- hanya server (service
-- role) & fungsi database (SECURITY DEFINER) yang bisa membaca/menulis.
-- Perubahan hanya lewat API /api/admin/business-params yang mengecek
-- is_super_admin.
--
-- Jalankan di SQL Editor (role postgres) SETELAH backup, SEBELUM push kode.
-- Setelah itu jalankan juga langkah "Jadikan Super Admin" di bagian bawah.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Super Admin
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_super_admin IS
  'Super Admin (migrasi 040): satu-satunya yang bisa melihat & mengubah Parameter Bisnis di Dasbor Admin. Hanya berlaku untuk role admin.';

-- ----------------------------------------------------------------------------
-- 2. Tabel parameter
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  transport_cost INTEGER NOT NULL CHECK (transport_cost >= 0),
  extra_time_unit_minutes INTEGER NOT NULL DEFAULT 30 CHECK (extra_time_unit_minutes > 0),
  extra_time_options INTEGER[] NOT NULL DEFAULT ARRAY[30, 60],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_tiers (
  tier TEXT PRIMARY KEY CHECK (tier IN ('New', 'Reguler', 'Commit', 'Pro')),
  sort_order SMALLINT NOT NULL,
  fast_pct NUMERIC(5,4) NOT NULL CHECK (fast_pct >= 0 AND fast_pct <= 0.5),
  pro_pct NUMERIC(5,4) NOT NULL CHECK (pro_pct >= 0 AND pro_pct <= 0.5),
  min_monthly_jobs INTEGER NOT NULL DEFAULT 0 CHECK (min_monthly_jobs >= 0),
  require_zero_violations BOOLEAN NOT NULL DEFAULT false,
  require_sosmed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  button_label TEXT NOT NULL,
  skill_label TEXT,
  is_les_private BOOLEAN NOT NULL DEFAULT false,
  material_cost_fast INTEGER NOT NULL DEFAULT 0 CHECK (material_cost_fast >= 0),
  material_cost_pro INTEGER NOT NULL DEFAULT 0 CHECK (material_cost_pro >= 0),
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.service_categories(id),
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Fast', 'PRO')),
  price INTEGER NOT NULL CHECK (price > 0),
  unit TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  detil_pekerjaan TEXT[],
  subject_label TEXT,
  subject_levels TEXT[],
  orderable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_products_name_lower_key
  ON public.service_products (lower(name));

CREATE TABLE IF NOT EXISTS public.business_param_history (
  id BIGSERIAL PRIMARY KEY,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID,
  changed_by_name TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);

CREATE INDEX IF NOT EXISTS business_param_history_changed_at_idx
  ON public.business_param_history (changed_at DESC);

COMMENT ON TABLE public.business_settings IS 'Parameter Bisnis (migrasi 040): transport flat & aturan tambah waktu. Diisi Super Admin di /admin/parameter.';
COMMENT ON TABLE public.fee_tiers IS 'Parameter Bisnis (migrasi 040): fee platform Fast/PRO & syarat naik tier loyalty (job bulan ini LEBIH DARI min_monthly_jobs).';
COMMENT ON TABLE public.service_categories IS 'Parameter Bisnis (migrasi 040): kategori jasa, label keahlian mitra, biaya & merek bahan baku.';
COMMENT ON TABLE public.service_products IS 'Parameter Bisnis (migrasi 040): katalog produk & varian dengan HARGA JUAL FINAL. name tersimpan di orders.service_type -- jangan diganti setelah dibuat.';
COMMENT ON TABLE public.business_param_history IS 'Riwayat perubahan Parameter Bisnis (siapa, kapan, nilai lama -> baru).';

-- updated_at otomatis
CREATE OR REPLACE FUNCTION public.bp_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_settings_touch ON public.business_settings;
CREATE TRIGGER trg_business_settings_touch BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.bp_touch_updated_at();
DROP TRIGGER IF EXISTS trg_fee_tiers_touch ON public.fee_tiers;
CREATE TRIGGER trg_fee_tiers_touch BEFORE UPDATE ON public.fee_tiers
  FOR EACH ROW EXECUTE FUNCTION public.bp_touch_updated_at();
DROP TRIGGER IF EXISTS trg_service_categories_touch ON public.service_categories;
CREATE TRIGGER trg_service_categories_touch BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.bp_touch_updated_at();
DROP TRIGGER IF EXISTS trg_service_products_touch ON public.service_products;
CREATE TRIGGER trg_service_products_touch BEFORE UPDATE ON public.service_products
  FOR EACH ROW EXECUTE FUNCTION public.bp_touch_updated_at();

-- RLS: aktif tanpa policy (hanya service role & fungsi SECURITY DEFINER)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_param_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Nilai awal = nilai resmi yang berjalan sekarang
-- ----------------------------------------------------------------------------
INSERT INTO public.business_settings (id, transport_cost, extra_time_unit_minutes, extra_time_options)
VALUES (1, 20000, 30, ARRAY[30, 60])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fee_tiers (tier, sort_order, fast_pct, pro_pct, min_monthly_jobs, require_zero_violations, require_sosmed) VALUES
  ('New', 1, 0.11, 0.1, 0, false, false),
  ('Reguler', 2, 0.1, 0.09, 30, false, false),
  ('Commit', 3, 0.09, 0.08, 60, true, false),
  ('Pro', 4, 0.08, 0.07, 90, true, true)
ON CONFLICT (tier) DO NOTHING;

INSERT INTO public.service_categories (id, name, button_label, skill_label, is_les_private, material_cost_fast, material_cost_pro, materials, active, sort_order) VALUES
  ('setrika', 'Setrika Pakaian', 'Setrika', 'Setrika', false, 1250, 2500, '[{"label":"Pelembut & pewangi pakaian","merek":"Kispray"}]'::jsonb, true, 1),
  ('bersihkan-rumah', 'Bersihkan Rumah', 'Bersihkan Rumah', 'Bersihkan Rumah', false, 8000, 16000, '[{"label":"Pembersih toilet","merek":"Vixal"},{"label":"Cairan pel lantai","merek":"Super Pel"}]'::jsonb, true, 2),
  ('les-private', 'Les Private', 'Les Private', NULL, true, 0, 0, '[]'::jsonb, true, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_products (id, category_id, name, tier, price, unit, duration, description, detil_pekerjaan, subject_label, subject_levels, orderable, sort_order) VALUES
  ('setrika-fast', 'setrika', 'Setrika Fast', 'Fast', 60000, '25 Pcs / Paket', '1 Jam', 'Layanan setrika pakaian harian yang dikerjakan dengan waktu singkat dan padat.', ARRAY['Setrika rapi hingga 25 Pcs pakaian (dewasa & anak)', 'Pakaian disemprot pelembut & pewangi Kispray sebelum disetrika', 'Pilihan finishing: dilipat rapi atau digantung (hanger)']::text[], NULL, NULL, true, 1),
  ('setrika-pro', 'setrika', 'Setrika PRO', 'PRO', 85000, '40 Pcs / Paket', '2 Jam', 'Layanan setrika pakaian lebih banyak yang dikerjakan lebih lengkap dan menyeluruh.', ARRAY['Setrika rapi hingga 40 Pcs pakaian (dewasa & anak)', 'Pakaian disemprot pelembut & pewangi Kispray sebelum disetrika', 'Pilihan finishing: dilipat rapi atau digantung (hanger)']::text[], NULL, NULL, true, 2),
  ('cleaning-fast', 'bersihkan-rumah', 'Cleaning Fast', 'Fast', 80000, '1 Rumah (Tipe 36/40)', '1.5 Jam', 'Layanan pembersihan harian rumah/properti kecil yang dikerjakan dengan waktu singkat dan padat.', ARRAY['Menyapu & mengepel seluruh ruangan', 'Penataan ruang: kamar, toilet, ruang tamu (living room), dapur']::text[], NULL, NULL, true, 3),
  ('cleaning-pro', 'bersihkan-rumah', 'Cleaning PRO', 'PRO', 125000, '1 Rumah (Tipe 50/80)', '2.5 Jam', 'Layanan pembersihan harian rumah/properti menengah yang dikerjakan lebih lengkap dan menyeluruh.', ARRAY['Menyapu & mengepel seluruh ruangan', 'Penataan ruang: kamar, toilet, ruang tamu, teras, dapur', 'Mencuci alat makan & peralatan dapur']::text[], NULL, NULL, true, 4),
  ('les-mengaji-fast', 'les-private', 'Mengaji Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Mengaji', ARRAY['TK', 'SD', 'SMP', 'SMA']::text[], true, 10),
  ('les-mengaji-pro', 'les-private', 'Mengaji PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Mengaji', ARRAY['TK', 'SD', 'SMP', 'SMA']::text[], true, 11),
  ('les-bahasa-inggris-fast', 'les-private', 'Bahasa Inggris Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Bahasa Inggris', ARRAY['TK', 'SD', 'SMP', 'SMA']::text[], true, 12),
  ('les-bahasa-inggris-pro', 'les-private', 'Bahasa Inggris PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Bahasa Inggris', ARRAY['TK', 'SD', 'SMP', 'SMA']::text[], true, 13),
  ('les-matematika-fast', 'les-private', 'Matematika Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Matematika', ARRAY['SD', 'SMP', 'SMA']::text[], true, 14),
  ('les-matematika-pro', 'les-private', 'Matematika PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Matematika', ARRAY['SD', 'SMP', 'SMA']::text[], true, 15),
  ('les-fisika-fast', 'les-private', 'Fisika Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Fisika', ARRAY['SMP', 'SMA']::text[], true, 16),
  ('les-fisika-pro', 'les-private', 'Fisika PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Fisika', ARRAY['SMP', 'SMA']::text[], true, 17),
  ('les-kimia-fast', 'les-private', 'Kimia Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Kimia', ARRAY['SMP', 'SMA']::text[], true, 18),
  ('les-kimia-pro', 'les-private', 'Kimia PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Kimia', ARRAY['SMP', 'SMA']::text[], true, 19),
  ('les-biologi-fast', 'les-private', 'Biologi Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Biologi', ARRAY['SMP', 'SMA']::text[], true, 20),
  ('les-biologi-pro', 'les-private', 'Biologi PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Biologi', ARRAY['SMP', 'SMA']::text[], true, 21),
  ('les-komputer-fast', 'les-private', 'Komputer Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Komputer', ARRAY['SD', 'SMP', 'SMA']::text[], true, 22),
  ('les-komputer-pro', 'les-private', 'Komputer PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Komputer', ARRAY['SD', 'SMP', 'SMA']::text[], true, 23),
  ('les-membaca-anak-fast', 'les-private', 'Belajar Membaca Anak Fast', 'Fast', 65000, '1x Pertemuan', '1 Jam', NULL, NULL, 'Belajar Membaca Anak', ARRAY['TK', 'SD']::text[], true, 24),
  ('les-membaca-anak-pro', 'les-private', 'Belajar Membaca Anak PRO', 'PRO', 90000, '1x Pertemuan', '2 Jam', NULL, NULL, 'Belajar Membaca Anak', ARRAY['TK', 'SD']::text[], true, 25)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 4. Fungsi database membaca tabel parameter
-- ----------------------------------------------------------------------------

-- Label Fast/PRO dari nama produk (katalog), cadangan: tebak dari teks.
CREATE OR REPLACE FUNCTION public.order_product_tier_label(p_service_type TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.tier FROM service_products sp
      WHERE lower(sp.name) = lower(trim(p_service_type)) LIMIT 1),
    CASE WHEN p_service_type ILIKE '%pro%' THEN 'PRO' ELSE 'Fast' END
  );
$$;

-- Label keahlian mitra untuk sebuah produk: label kategori, atau nama mata
-- pelajaran (Les Private). Cadangan: pemetaan lama migrasi 029.
CREATE OR REPLACE FUNCTION public.order_required_skill(p_service_type TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(sc.skill_label, sp.subject_label)
       FROM service_products sp
       JOIN service_categories sc ON sc.id = sp.category_id
      WHERE lower(sp.name) = lower(trim(p_service_type)) LIMIT 1),
    CASE
      WHEN lower(trim(p_service_type)) LIKE 'setrika%' THEN 'Setrika'
      WHEN lower(trim(p_service_type)) LIKE 'cleaning%' THEN 'Bersihkan Rumah'
      ELSE NULL
    END
  );
$$;

-- Tier loyalty dari syarat di fee_tiers.
CREATE OR REPLACE FUNCTION public.mitra_loyalty_tier(p_mitra_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN x.status = 'ahli'
      AND x.monthly_jobs > pro.min_monthly_jobs
      AND (NOT pro.require_zero_violations OR x.violation_count = 0)
      AND (NOT pro.require_sosmed OR x.sosmed_active) THEN 'Pro'
    WHEN x.status = 'ahli'
      AND x.monthly_jobs > com.min_monthly_jobs
      AND (NOT com.require_zero_violations OR x.violation_count = 0)
      AND (NOT com.require_sosmed OR x.sosmed_active) THEN 'Commit'
    WHEN x.status = 'ahli'
      AND x.monthly_jobs > reg.min_monthly_jobs
      AND (NOT reg.require_zero_violations OR x.violation_count = 0)
      AND (NOT reg.require_sosmed OR x.sosmed_active) THEN 'Reguler'
    ELSE 'New'
  END
  FROM (
    SELECT p.status, COALESCE(p.violation_count, 0) AS violation_count,
           COALESCE(p.sosmed_active, false) AS sosmed_active,
           public.mitra_monthly_completed_orders(p.id) AS monthly_jobs
    FROM profiles p WHERE p.id = p_mitra_id
  ) x
  CROSS JOIN (SELECT * FROM fee_tiers WHERE tier = 'Pro') pro
  CROSS JOIN (SELECT * FROM fee_tiers WHERE tier = 'Commit') com
  CROSS JOIN (SELECT * FROM fee_tiers WHERE tier = 'Reguler') reg;
$$;

-- Fee platform = fee_tiers[tier mitra] x label produk.
CREATE OR REPLACE FUNCTION public.mitra_fee_percent(p_mitra_id UUID, p_service_type TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.order_product_tier_label(p_service_type) = 'PRO' THEN f.pro_pct
    ELSE f.fast_pct
  END
  FROM fee_tiers f
  WHERE f.tier = COALESCE(public.mitra_loyalty_tier(p_mitra_id), 'New');
$$;

COMMENT ON FUNCTION public.mitra_fee_percent(UUID, TEXT) IS
  'Fee platform dari tabel fee_tiers (Parameter Bisnis, migrasi 040) x label Fast/PRO produk. Diatur Super Admin di /admin/parameter.';

-- Info tier untuk Dasbor Mitra (bentuk kolom sama dengan migrasi 034/039).
CREATE OR REPLACE FUNCTION public.mitra_tier_info(p_mitra_id UUID)
RETURNS TABLE (
  tier_name TEXT,
  fast_fee_percent NUMERIC,
  pro_fee_percent NUMERIC,
  monthly_completed_orders INTEGER,
  status TEXT,
  violation_count INTEGER,
  sosmed_active BOOLEAN,
  next_tier_name TEXT,
  next_tier_jobs_needed INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      p.status,
      p.violation_count,
      p.sosmed_active,
      public.mitra_monthly_completed_orders(p.id) AS monthly_jobs,
      COALESCE(public.mitra_loyalty_tier(p.id), 'New') AS tier
    FROM profiles p
    WHERE p.id = p_mitra_id
  )
  SELECT
    b.tier,
    cur.fast_pct,
    cur.pro_pct,
    b.monthly_jobs,
    b.status,
    b.violation_count,
    b.sosmed_active,
    nxt.tier,
    CASE WHEN nxt.tier IS NULL THEN NULL
         ELSE GREATEST(nxt.min_monthly_jobs + 1 - b.monthly_jobs, 0)::INTEGER END
  FROM base b
  JOIN fee_tiers cur ON cur.tier = b.tier
  LEFT JOIN LATERAL (
    SELECT f.tier, f.min_monthly_jobs FROM fee_tiers f
    WHERE f.sort_order > cur.sort_order
    ORDER BY f.sort_order LIMIT 1
  ) nxt ON true;
$$;

-- Ambang saldo = fee New Fast x harga produk Fast termurah yang bisa dipesan.
CREATE OR REPLACE FUNCTION public.mitra_wallet_threshold()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ROUND(
      (SELECT fast_pct FROM fee_tiers WHERE tier = 'New')
      * (SELECT MIN(sp.price) FROM service_products sp
           JOIN service_categories sc ON sc.id = sp.category_id
          WHERE sp.tier = 'Fast' AND sp.orderable AND sc.active)
    )::BIGINT,
    6600
  );
$$;

COMMENT ON FUNCTION public.mitra_wallet_threshold() IS
  'Ambang saldo minimum FLAT (migrasi 040) = fee tier New label Fast x harga produk Fast termurah yang bisa dipesan (Parameter Bisnis). Sama dengan getWalletMinBalance() di lib/services.ts.';

-- ----------------------------------------------------------------------------
-- 5. Tambah waktu: pilihan durasi diatur dari dasbor
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_extra_time_minutes_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_extra_time_minutes_check CHECK (extra_time_minutes >= 0);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- LANGKAH SETELAH MIGRASI: Jadikan Super Admin
-- Ganti email di bawah dengan email akun admin Anda, lalu jalankan:
--
--   update public.profiles set is_super_admin = true
--   where role = 'admin'
--     and id = (select id from auth.users where email = 'EMAIL_ANDA@contoh.com');
-- ============================================================================
