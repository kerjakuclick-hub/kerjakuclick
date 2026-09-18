-- ============================================================================
-- 025_order_messages_trust_safety.sql
--
-- Bagian 7.2 (Komunikasi Ter-mediasi) & 8.2 (Hybrid WA + In-App) — Dokumen
-- Bisnis Revisi & Strategi Pasca-Audit Fraud:
--
--   Temuan audit: mitra menerima nomor WA klien mentah lewat notifikasi
--   otomatis (buildMitraAssignedMessage, lib/whatsapp.ts) begitu ditugaskan.
--   Nomor ini gampang disimpan mitra di luar sistem dan dipakai untuk
--   menawarkan kerja LANGSUNG ke klien (di luar platform) pada pesanan
--   berikutnya -- persis pola yang ditemukan di audit.
--
--   Perbaikan: koordinasi teknis (jadwal, perubahan, pertanyaan) dipindah
--   ke kanal IN-APP yang tercatat (order_messages) -- WA/Fonnte tetap
--   dipakai, tapi HANYA untuk notifikasi transaksional otomatis (status
--   berubah, tugas baru, dll), bukan lagi untuk membuka jalur kontak
--   pribadi mentah antara mitra & klien.
--
-- Bagian 8.4 (Dashboard & Modul Pendukung) -- "Modul Trust & Safety":
--   profiles.violation_count sudah ada sejak migrasi 024 (syarat naik ke
--   tier Terpercaya/Unggulan) tapi belum ada cara admin mengisinya selain
--   query manual di database. Ditambahkan tabel log mitra_violations supaya
--   setiap pelanggaran tercatat dengan alasan + siapa yang mencatat (jejak
--   audit), dan violation_count di profiles jadi ANGKA TURUNAN (derived)
--   dari jumlah baris log, bukan angka lepas yang bisa diubah tanpa jejak.
--
-- Sifat: ADDITIVE ONLY, aman untuk data live. Tidak ada DROP/RENAME/ALTER
-- TYPE pada kolom yang sudah ada.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. order_messages — log chat per pesanan (mitra <-> klien <-> admin)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_messages (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('mitra', 'admin', 'customer', 'system')),
  sender_id UUID, -- auth.uid() mitra/admin, atau customers.id pelanggan; NULL untuk pesan sistem
  sender_name TEXT NOT NULL, -- snapshot nama pengirim saat kirim (aman walau nama berubah kemudian)
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_messages_order_id_idx ON public.order_messages (order_id, created_at);

COMMENT ON TABLE public.order_messages IS 'Chat ter-mediasi per pesanan (Bagian 7.2/8.2) -- pengganti pertukaran nomor WA mentah antara mitra & klien.';

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Mitra: hanya bisa baca & kirim pesan untuk pesanan yang jadi tugasnya sendiri.
DROP POLICY IF EXISTS "order_messages_mitra_select" ON public.order_messages;
CREATE POLICY "order_messages_mitra_select" ON public.order_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_messages.order_id AND o.mitra_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_messages_mitra_insert" ON public.order_messages;
CREATE POLICY "order_messages_mitra_insert" ON public.order_messages
  FOR INSERT WITH CHECK (
    sender_type = 'mitra'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_messages.order_id AND o.mitra_id = auth.uid()
    )
  );

-- Admin: akses penuh (baca semua chat + kirim pesan admin/CS bila perlu turun tangan).
DROP POLICY IF EXISTS "order_messages_admin_all" ON public.order_messages;
CREATE POLICY "order_messages_admin_all" ON public.order_messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SENGAJA tidak ada policy publik/anon untuk pelanggan -- sama seperti
-- customers/customer_sessions (migrasi 018), pelanggan BUKAN Supabase Auth
-- user, jadi akses baca/tulis chat miliknya HANYA lewat service-role client
-- di app/api/customer/orders/[id]/messages/route.ts (setelah verifikasi
-- sesi login + kecocokan nomor HP ke pesanan). Pesan sistem (sender_type =
-- 'system', mis. saat mitra baru ditugaskan) juga ditulis lewat service-role
-- dari app/api/admin/orders/assign/route.ts, bukan lewat policy ini.

-- Realtime -- supaya Dasbor Mitra & Manajemen Pesanan admin langsung
-- menerima pesan baru tanpa refresh (idempotent, aman dijalankan ulang).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. mitra_violations — log "Modul Trust & Safety" (Bagian 8.4)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mitra_violations (
  id BIGSERIAL PRIMARY KEY,
  mitra_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id), -- admin yang mencatat
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mitra_violations_mitra_id_idx ON public.mitra_violations (mitra_id);

COMMENT ON TABLE public.mitra_violations IS 'Jejak audit pelanggaran mitra (Modul Trust & Safety, Bagian 8.4) -- profiles.violation_count dihitung otomatis dari jumlah baris di sini lewat trigger, bukan diisi lepas.';

ALTER TABLE public.mitra_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mitra_violations_admin_all" ON public.mitra_violations;
CREATE POLICY "mitra_violations_admin_all" ON public.mitra_violations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Mitra boleh lihat riwayat pelanggarannya sendiri (transparansi), tapi
-- tidak bisa insert/update/delete -- itu murni kewenangan admin.
DROP POLICY IF EXISTS "mitra_violations_mitra_select_own" ON public.mitra_violations;
CREATE POLICY "mitra_violations_mitra_select_own" ON public.mitra_violations
  FOR SELECT USING (mitra_id = auth.uid());

-- Trigger: profiles.violation_count = COUNT(*) baris mitra_violations milik
-- mitra tsb -- otomatis ter-update setiap admin menambah/menghapus catatan
-- pelanggaran, supaya tidak ada 2 sumber kebenaran yang bisa berbeda.
CREATE OR REPLACE FUNCTION public.sync_mitra_violation_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_mitra UUID;
BEGIN
  target_mitra := COALESCE(NEW.mitra_id, OLD.mitra_id);
  UPDATE public.profiles
  SET violation_count = (
    SELECT COUNT(*) FROM public.mitra_violations WHERE mitra_id = target_mitra
  )
  WHERE id = target_mitra;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_violation_count ON public.mitra_violations;
CREATE TRIGGER trg_sync_violation_count
AFTER INSERT OR DELETE ON public.mitra_violations
FOR EACH ROW EXECUTE FUNCTION public.sync_mitra_violation_count();

COMMIT;
