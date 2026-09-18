-- ============================================================================
-- 029_fix_skill_category_matching.sql
--
-- BUG ditemukan Anda (18 September 2026): di Dasbor Admin, saat menugaskan
-- pesanan Cleaning Fast/PRO ("Bersihkan Rumah"), dropdown "Pilih mitra
-- eligible" cuma menampilkan 2 mitra (Ivanka, Farah Dilla Yanti) padahal ada
-- 5 mitra yang keahliannya "Bersihkan Rumah".
--
-- AKAR MASALAH: eligible_mitra_for_order() (migrasi 008/023/024/028)
-- mencocokkan keahlian mitra ke pesanan dengan substring literal:
--
--   EXISTS (SELECT 1 FROM unnest(p.skill_category) sk
--           WHERE o.service_type ILIKE '%' || sk || '%')
--
-- Checkbox keahlian di Dasbor Admin (components/admin/MitraTable.tsx,
-- SKILL_GROUPS) menyimpan skill_category persis sebagai "Setrika",
-- "Bersihkan Rumah", "Cuci Kendaraan" -- sedangkan orders.service_type
-- berisi nama PRODUK spesifik ("Setrika Fast", "Cleaning Fast", "Cuci
-- Motor", dst, dari lib/services.ts).
--   - "Setrika" KEBETULAN cocok (substring dari "Setrika Fast"/"Setrika
--     PRO") -> tidak kelihatan bermasalah.
--   - "Bersihkan Rumah" TIDAK PERNAH cocok dengan "Cleaning Fast"/"Cleaning
--     PRO" (bukan substring sama sekali, beda bahasa Indonesia/Inggris) --
--     ini yang dilaporkan.
--   - "Cuci Kendaraan" juga TIDAK PERNAH cocok dengan "Cuci Motor"/"Cuci
--     Mobil" (belum ketahuan karena kategori ini belum orderable).
-- Mitra yang skill_category-nya benar diisi "Bersihkan Rumah" jadi TIDAK
-- PERNAH lolos filter untuk order Cleaning -- 2 mitra yang tetap tampil
-- kemungkinan besar skill_category-nya masih NULL/kosong (baris "p.skill_
-- category IS NULL OR ..." di WHERE meloloskan mitra yang belum diisi sama
-- sekali keahliannya untuk SEMUA jenis order).
--
-- PERBAIKAN: tambah fungsi order_required_skill() yang memetakan
-- service_type ke label skill PERSIS seperti yang dipakai SKILL_GROUPS di
-- MitraTable.tsx, lalu tambahkan sebagai jalur pencocokan KEDUA (OR),
-- BUKAN mengganti substring match yang lama -- supaya Les Private (yang
-- memang cocok lewat substring nama mata pelajaran, mis. skill "Mengaji"
-- vs service_type "Mengaji — 1x Pertemuan") tetap berfungsi seperti
-- sebelumnya.
--
-- Kalau nanti SKILL_GROUPS di MitraTable.tsx berubah labelnya, sinkronkan
-- juga CASE di order_required_skill() di bawah.
--
-- Jalankan SETELAH backup database (mengubah fungsi yang dipakai alur
-- penugasan mitra).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. order_required_skill(text) -- label skill (PERSIS string checkbox di
--    MitraTable.tsx SKILL_GROUPS) yang relevan untuk sebuah service_type.
--    NULL kalau tidak dikenali (mis. varian les-private -- skill-nya
--    dicocokkan lewat substring nama mata pelajaran, bukan lewat fungsi
--    ini).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_required_skill(p_service_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(p_service_type)) LIKE 'setrika%' THEN 'Setrika'
    WHEN lower(trim(p_service_type)) LIKE 'cleaning%' THEN 'Bersihkan Rumah'
    WHEN lower(trim(p_service_type)) LIKE 'cuci%' THEN 'Cuci Kendaraan'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.order_required_skill(TEXT) IS
  'Memetakan orders.service_type (nama produk, mis. "Cleaning Fast") ke label skill PERSIS seperti checkbox SKILL_GROUPS di components/admin/MitraTable.tsx (mis. "Bersihkan Rumah") -- perbaikan migrasi 029 karena ILIKE substring saja tidak pernah cocok untuk "Bersihkan Rumah" vs "Cleaning Fast/PRO" dan "Cuci Kendaraan" vs "Cuci Motor/Mobil".';

GRANT EXECUTE ON FUNCTION public.order_required_skill(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. eligible_mitra_for_order(): filter skill_category ditambah jalur
--    pencocokan lewat order_required_skill(), SELAIN substring lama (yang
--    tetap dipertahankan untuk Les Private). Kolom hasil & bagian lain
--    (ambang saldo migrasi 028, gender, is_active/is_available) TIDAK
--    berubah.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS eligible_mitra_for_order(BIGINT);

CREATE FUNCTION eligible_mitra_for_order(p_order_id BIGINT)
RETURNS TABLE (
  mitra_id UUID,
  name TEXT,
  wallet_balance BIGINT,
  skill_category TEXT[],
  status TEXT,
  gender TEXT,
  rating NUMERIC,
  fee_percent NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.wallet_balance,
    p.skill_category,
    p.status,
    p.gender,
    p.rating,
    public.mitra_fee_percent(p.id) AS fee_percent
  FROM profiles p
  JOIN orders o ON o.id = p_order_id
  WHERE p.role = 'mitra'
    AND p.is_active = true
    AND p.is_available = true
    AND p.wallet_balance >=
      ROUND(o.total_price * public.mitra_fee_percent(p.id)) + public.order_tech_fee(o.service_type)
    AND (
      o.mitra_gender_preference IS NULL
      OR o.mitra_gender_preference = 'Bebas'
      OR p.gender = o.mitra_gender_preference
    )
    AND (
      p.skill_category IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p.skill_category) sk
        WHERE o.service_type ILIKE '%' || sk || '%'
           OR sk = public.order_required_skill(o.service_type)
      )
    )
  ORDER BY p.rating DESC NULLS LAST, p.wallet_balance DESC;
$$;

COMMENT ON FUNCTION eligible_mitra_for_order(BIGINT) IS
  'Daftar mitra eligible untuk sebuah order. Ambang saldo (migrasi 024/028) = total_price * fee_percent tier mitra + order_tech_fee(service_type). Sejak migrasi 029, pencocokan skill_category memakai substring lama ATAU order_required_skill(service_type) -- perbaikan bug "Bersihkan Rumah"/"Cuci Kendaraan" tidak pernah cocok dengan nama produk spesifik (Cleaning Fast/PRO, Cuci Motor/Mobil).';

COMMIT;
