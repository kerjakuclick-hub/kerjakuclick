-- ============================================================================
-- 007_addendum_fase_1_1_schema.sql
--
-- Skema tambahan untuk Addendum Fase 1.1 — VERSI TERKOREKSI setelah audit
-- struktur project real (deep-audit.txt, 1 Agustus 2026).
--
-- Perbaikan dari draf migrasi sebelumnya:
--   - TIDAK menambah kolom `partner_status` — sudah ada kolom `status`
--     ('training'/'ahli') di tabel profiles, dipakai ulang.
--   - TIDAK menambah kolom `preferred_mitra_name` di orders — kolom
--     `mitra_gender_preference` sudah ada dan itulah makna "preferensi"
--     yang sebenarnya (Pria/Wanita/Bebas), bukan nama mitra spesifik.
--   - Menambah kolom `gender` di profiles supaya preferensi gender bisa
--     dicocokkan (sebelumnya tidak ada kolom ini sama sekali).
--
-- Sifat: ADDITIVE ONLY, aman untuk data live. Tidak ada DROP/RENAME/ALTER
-- TYPE pada kolom yang sudah ada.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. profiles — kolom identitas tambahan untuk ID Card Digital & matching
-- ----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Pria', 'Wanita')),
  ADD COLUMN IF NOT EXISTS skill_category TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);

COMMENT ON COLUMN profiles.gender IS 'Gender mitra, dipakai mencocokkan orders.mitra_gender_preference';
COMMENT ON COLUMN profiles.skill_category IS 'Kategori keahlian utama, mis. Setrika / Cleaning / Cuci Kendaraan';
COMMENT ON COLUMN profiles.photo_url IS 'URL foto profil untuk ID Card digital & invoice klien';
COMMENT ON COLUMN profiles.rating IS 'Rating rata-rata mitra (nullable jika belum ada data)';

-- Kolom `status` ('training'/'ahli') dan `is_active` SUDAH ADA di schema.sql
-- Anda — tidak ditambahkan lagi di sini, langsung dipakai di Bagian 5 migrasi
-- 008 (fungsi eligible_mitra_for_order).

-- ----------------------------------------------------------------------------
-- 2. orders — ambang saldo minimum penugasan (20% dari nilai layanan)
--
--    CATATAN PERFORMA: generated column ini me-rewrite tabel orders saat
--    ditambahkan (Postgres menghitung nilainya untuk semua baris lama).
--    Jalankan saat trafik rendah kalau tabel orders Anda sudah besar.
-- ----------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS min_wallet_required BIGINT
    GENERATED ALWAYS AS (ROUND(total_price * 0.20)) STORED;

COMMENT ON COLUMN orders.min_wallet_required IS 'Ambang saldo dompet minimum mitra agar bisa ditugaskan = 20% dari total_price';

-- Kolom `mitra_gender_preference` SUDAH ADA — tidak ditambahkan lagi,
-- langsung dipakai sebagai kriteria preferensi di eligible_mitra_for_order.

-- ----------------------------------------------------------------------------
-- 3. invoices — invoice digital ke klien & ke mitra (PDF, kirim manual WA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL UNIQUE,
  recipient_type  TEXT NOT NULL CHECK (recipient_type IN ('klien', 'mitra')),
  file_url        TEXT,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  sent_by         UUID REFERENCES profiles(id),
  channel         TEXT NOT NULL DEFAULT 'wa_manual'
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON invoices(generated_at) WHERE sent_at IS NULL;

COMMENT ON TABLE invoices IS 'Invoice digital (PDF) untuk klien & mitra; pengiriman WA dilakukan manual oleh admin';

-- ----------------------------------------------------------------------------
-- 4. wallet_transactions — jejak audit dompet DEPOSIT (model baru addendum)
--
--    Tabel ini TERPISAH dari tabel `transactions` yang sudah ada (yang
--    mencatat bagi-hasil model LAMA / 006). `transactions` lama TIDAK
--    dihapus atau diubah — dibiarkan sebagai arsip historis. Mulai migrasi
--    008, ledger yang aktif dipakai adalah `wallet_transactions` di bawah ini.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                BIGSERIAL PRIMARY KEY,
  mitra_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('topup', 'deduction')),
  amount            BIGINT NOT NULL,
  balance_after     BIGINT NOT NULL,
  related_order_id  BIGINT REFERENCES orders(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_mitra ON wallet_transactions(mitra_id, created_at DESC);

COMMENT ON TABLE wallet_transactions IS 'Jejak audit dompet DEPOSIT mitra (model addendum): top up (+) dan potongan fee platform (-)';

-- ----------------------------------------------------------------------------
-- 5. earnings — rekap pendapatan/omzet TUNAI mitra, terpisah dari dompet
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS earnings (
  id           BIGSERIAL PRIMARY KEY,
  mitra_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id     BIGINT NOT NULL REFERENCES orders(id),
  amount       BIGINT NOT NULL,      -- nilai transaksi jasa dikurangi fee platform (pendapatan bersih tunai)
  period_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_mitra_period ON earnings(mitra_id, period_date);

COMMENT ON TABLE earnings IS 'Rekap pendapatan/omzet tunai mitra (model addendum) — ledger terpisah dari dompet & dari tabel transactions lama';

-- ----------------------------------------------------------------------------
-- 6. RLS untuk tabel baru — pakai ULANG fungsi public.is_admin() yang SUDAH
--    ADA di schema Anda (tidak didefinisikan ulang di sini).
-- ----------------------------------------------------------------------------
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin_all" ON invoices;
CREATE POLICY "invoices_admin_all" ON invoices
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "invoices_mitra_read_own" ON invoices;
CREATE POLICY "invoices_mitra_read_own" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = invoices.order_id AND o.mitra_id = auth.uid())
  );

DROP POLICY IF EXISTS "wallet_tx_admin_all" ON wallet_transactions;
CREATE POLICY "wallet_tx_admin_all" ON wallet_transactions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "wallet_tx_mitra_read_own" ON wallet_transactions;
CREATE POLICY "wallet_tx_mitra_read_own" ON wallet_transactions
  FOR SELECT USING (mitra_id = auth.uid());

DROP POLICY IF EXISTS "earnings_admin_all" ON earnings;
CREATE POLICY "earnings_admin_all" ON earnings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "earnings_mitra_read_own" ON earnings;
CREATE POLICY "earnings_mitra_read_own" ON earnings
  FOR SELECT USING (mitra_id = auth.uid());

COMMIT;
