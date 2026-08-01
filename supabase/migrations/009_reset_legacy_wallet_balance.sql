-- ============================================================================
-- 009_reset_legacy_wallet_balance.sql
--
-- Dijalankan SETELAH 007 & 008, dan SETELAH Anda siap secara operasional
-- (lihat "Rencana Rollout" di bawah) — BUKAN otomatis bagian dari 008, supaya
-- Anda punya jeda untuk komunikasi ke mitra dulu kalau perlu.
--
-- Konteks (sudah dikonfirmasi): wallet_balance yang terakumulasi dari model
-- lama (80% per order completed) SELAMA INI HANYA ANGKA PENCATATAN — mitra
-- selalu terima tunai langsung dari klien, tidak ada mekanisme pencairan/
-- withdraw yang pernah dibangun. Jadi aman direset ke 0 tanpa ada hak mitra
-- yang hilang.
--
-- Tetap dibuatkan snapshot dulu (bukan main DROP), untuk jaga-jaga kalau
-- suatu saat ada yang mempertanyakan "kok saldo saya yang dulu Rp X hilang".
-- ============================================================================

BEGIN;

-- 1. Snapshot nilai lama sebelum direset — arsip, bukan tabel aktif.
CREATE TABLE IF NOT EXISTS legacy_wallet_snapshot (
  id                       BIGSERIAL PRIMARY KEY,
  mitra_id                 UUID NOT NULL REFERENCES profiles(id),
  wallet_balance_before    BIGINT NOT NULL,
  total_earnings_at_reset  BIGINT NOT NULL,
  note                     TEXT DEFAULT 'Reset transisi ke model deposit addendum Fase 1.1 — nilai lama adalah pencatatan bagi-hasil 80/20 yang tidak pernah dicairkan (dikonfirmasi 1 Agustus 2026).',
  snapshotted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO legacy_wallet_snapshot (mitra_id, wallet_balance_before, total_earnings_at_reset)
SELECT id, wallet_balance, total_earnings
FROM profiles
WHERE role = 'mitra';

-- 2. Reset wallet_balance ke 0 — mulai dari titik ini, wallet_balance berarti
--    DEPOSIT (harus diisi lewat top up), bukan lagi akumulasi bagi hasil.
--    total_earnings SENGAJA TIDAK direset — biarkan sebagai angka lifetime
--    omzet historis mitra (statistik, bukan saldo yang bisa ditarik).
UPDATE profiles
SET wallet_balance = 0
WHERE role = 'mitra';

COMMIT;

-- Cek hasil:
-- SELECT id, name, wallet_balance, total_earnings FROM profiles WHERE role = 'mitra';
