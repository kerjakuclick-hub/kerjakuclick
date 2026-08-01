-- ============================================================================
-- Audit pra-migrasi: dampak ambang saldo baru (20%) terhadap mitra aktif.
--
-- KOREKSI dari draf sebelumnya: draf awal saya memakai tabel tarif ASUMSI
-- (Setrika Fast Rp40rb, dst.) yang belum pernah diverifikasi ke
-- lib/services.ts project Anda yang sebenarnya. Query di bawah ini TIDAK
-- menebak tarif — langsung mengambil kombinasi service_type & total_price
-- yang NYATA pernah dipakai di tabel orders Anda.
--
-- Jalankan sebagai SELECT biasa (read-only, aman).
-- ============================================================================

-- 1) Tarif yang benar-benar pernah dipakai (distinct service_type + harga),
--    supaya kita tahu variasi harga real, bukan tebakan.
SELECT DISTINCT service_type, total_price, ROUND(total_price * 0.20) AS ambang_20_persen
FROM orders
ORDER BY total_price;

-- 2) Rincian per mitra aktif x per kombinasi tarif nyata di atas: siapa yang
--    lolos/tidak lolos ambang baru.
WITH tarif_nyata AS (
  SELECT DISTINCT service_type, total_price
  FROM orders
)
SELECT
  p.id                              AS mitra_id,
  p.name                            AS nama_mitra,
  p.wallet_balance                  AS saldo_saat_ini,
  p.is_active,
  t.service_type,
  t.total_price,
  ROUND(t.total_price * 0.20)       AS ambang_baru_20_persen,
  CASE
    WHEN p.wallet_balance >= ROUND(t.total_price * 0.20) THEN 'LOLOS'
    ELSE 'TIDAK LOLOS — perlu top up'
  END                                AS status_ambang_baru
FROM profiles p
CROSS JOIN tarif_nyata t
WHERE p.role = 'mitra'
ORDER BY p.name, t.total_price;

-- 3) Ringkasan kritis: mitra aktif yang TIDAK LOLOS ambang baru untuk SEMUA
--    variasi tarif yang ada (termasuk tarif termurah) — mitra ini akan
--    langsung hilang dari seluruh daftar penugasan begitu migrasi 008 aktif.
SELECT
  p.id                                              AS mitra_id,
  p.name                                            AS nama_mitra,
  p.wallet_balance                                  AS saldo_saat_ini,
  p.is_active,
  (SELECT ROUND(MIN(total_price) * 0.20) FROM orders) AS ambang_termurah_20_persen,
  (SELECT ROUND(MIN(total_price) * 0.20) FROM orders) - p.wallet_balance AS kekurangan_top_up_minimum
FROM profiles p
WHERE p.role = 'mitra'
  AND p.is_active = true
  AND p.wallet_balance < (SELECT ROUND(MIN(total_price) * 0.20) FROM orders)
ORDER BY p.wallet_balance ASC;

-- 4) PENTING — cek kelengkapan data `gender` mitra aktif. Migrasi 008
--    menambahkan pencocokan preferensi gender klien vs profiles.gender.
--    Mitra aktif yang gender-nya masih NULL akan otomatis TIDAK muncul untuk
--    order yang preferensinya spesifik ('Pria'/'Wanita') — hanya tetap
--    muncul untuk order berpreferensi 'Bebas'. Isi dulu data gender mitra
--    aktif sebelum migrasi 008 dipakai di alur produksi.
SELECT id, name, gender, is_active
FROM profiles
WHERE role = 'mitra' AND is_active = true AND gender IS NULL;

-- 5) Cek juga: berapa banyak order historis yang preferensinya spesifik
--    (bukan 'Bebas' atau NULL) — untuk memperkirakan seberapa sering
--    pencocokan gender ini akan benar-benar dipakai.
SELECT mitra_gender_preference, COUNT(*)
FROM orders
GROUP BY mitra_gender_preference;
