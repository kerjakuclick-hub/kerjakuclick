// GANTI ISI lib/types.ts Anda dengan file ini.
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2/8.2/8.4 Dokumen Bisnis
// Revisi Pasca-Audit Fraud, migrasi 025_order_messages_trust_safety.sql:
//   A. Type BARU OrderMessage -- baris chat Bagian 7.2 "Komunikasi
//      Ter-mediasi" (pengganti pertukaran nomor WA mentah mitra<->klien).
//   B. Type BARU MitraViolation -- baris log "Modul Trust & Safety" Bagian
//      8.4, sumber turunan untuk MitraProfile.violation_count.
//
// Perubahan dari versi Anda:
//   1. Order: tambah mitra_id_card_sent_at & mitra_id_card_sent_by (BARU —
//      fitur "Kirim ID Mitra via WA", migrasi 017).
//   2. MitraProfile.skill_category & EligibleMitra.skill_category: dikoreksi
//      dari `string | null` jadi `string[] | null` -- sesuai migrasi 014
//      (multi-keahlian) yang sudah diterapkan di database, type lama di
//      file ini belum di-update mengikuti. Kalau ada kode lain yang sempat
//      menulis skill_category sebagai string tunggal, TypeScript sekarang
//      akan menandainya sebagai error supaya ketahuan lebih awal.
//   3. MitraProfile: tambah is_available, unavailable_reason,
//      unavailable_since (BARU — fitur "Toggle Ketersediaan Mitra",
//      migrasi 023). Terpisah dari is_active yang dikontrol admin --
//      is_available dikontrol mitra sendiri lewat dasbor.
//
// Perubahan BARU (18 September 2026) -- fitur "Skema Fee Berjenjang" (Bagian
// 6.2 Dokumen Bisnis Revisi Pasca-Audit Fraud), migrasi
// 024_tier_based_platform_fee.sql:
//   4. MitraProfile: tambah violation_count (dipakai sebagai syarat naik ke
//      tier Terpercaya/Unggulan, diisi manual oleh admin, default 0).
//   5. EligibleMitra: tambah fee_percent -- fungsi eligible_mitra_for_order()
//      sekarang juga mengembalikan persentase fee tier mitra yang
//      bersangkutan, supaya admin bisa melihatnya langsung di dropdown
//      "Pilih mitra eligible" (bukan lagi flat 20% untuk semua).
//   6. Type BARU MitraTierInfo -- bentuk hasil RPC mitra_tier_info(), dipakai
//      Dasbor Mitra utk menampilkan tier & rincian biaya secara transparan
//      (Bagian 6.1).

export type OrderStatus = "unassigned" | "assigned" | "working" | "completed" | "cancelled";

export type Order = {
  id: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  service_type: string;
  total_price: number;
  scheduled_date: string | null;
  preferred_time: string | null;
  mitra_gender_preference: string | null;
  mitra_id: string | null;
  status: OrderStatus;
  created_at: string;
  min_wallet_required: number; // generated column, 20% dari total_price (migrasi 007) -- SEKARANG HANYA acuan lama/tampilan; ambang kelayakan riil sejak migrasi 024 mengikuti tier fee mitra masing-masing (lihat mitra_fee_percent()), bukan flat 20% lagi
  mitra_id_card_sent_at: string | null; // migrasi 017 — TIDAK dipakai lagi sejak notifikasi klien otomatis (migrasi 020), dibiarkan ada di DB untuk histori
  mitra_id_card_sent_by: string | null; // migrasi 017 — idem
  client_notified_at: string | null; // BARU — migrasi 020: waktu notifikasi WA "pesanan disetujui" berhasil terkirim otomatis
  client_notify_error: string | null; // BARU — migrasi 020: pesan error terakhir kalau notifikasi otomatis gagal
  mitra_notified_at: string | null; // BARU — migrasi 022: waktu notifikasi WA "tugas baru" berhasil terkirim otomatis ke mitra
  mitra_notify_error: string | null; // BARU — migrasi 022: pesan error terakhir kalau notifikasi otomatis ke mitra gagal
};

export type MitraOption = {
  id: string;
  name: string;
  wallet_balance: number;
};

export type MitraProfile = {
  id: string;
  name: string;
  phone: string;
  wallet_balance: number;
  total_earnings: number;
  status: "training" | "ahli";
  is_active: boolean;
  gender: "Pria" | "Wanita" | null; // migrasi 007
  skill_category: string[] | null; // DIKOREKSI — array sejak migrasi 014
  photo_url: string | null; // migrasi 007
  rating: number | null; // migrasi 007
  is_available: boolean; // BARU — migrasi 023: toggle ketersediaan milik mitra sendiri
  unavailable_reason: string | null; // BARU — migrasi 023: alasan saat is_available = false
  unavailable_since: string | null; // BARU — migrasi 023: sejak kapan is_available = false
  violation_count: number; // BARU — migrasi 024: jumlah pelanggaran tercatat, syarat naik tier Terpercaya/Unggulan (0 pelanggaran), diisi manual admin, default 0
};

export type MitraSelfProfile = MitraProfile;

// Model LAMA (bagi hasil 80/20) — tabel `transactions`. Dibiarkan ada untuk
// membaca data historis (lihat app/admin/transaksi/page.tsx & TaskList.tsx),
// TIDAK ada baris baru masuk ke sini sejak migrasi 008.
export type Transaction = {
  id: number;
  order_id: number;
  mitra_id: string;
  gross_amount: number;
  mitra_share: number;
  platform_share: number;
  type: "order_completion" | "adjustment";
  created_at: string;
};

// ============================================================================
// Model deposit Addendum Fase 1.1 (menggantikan model bagi hasil lama
// untuk order yang completed SETELAH migrasi 008)
// ============================================================================

export type Invoice = {
  id: number;
  order_id: number;
  invoice_number: string;
  recipient_type: "klien" | "mitra";
  purpose: "konfirmasi" | "pembayaran"; // BARU — migrasi 020, default 'konfirmasi' untuk data lama
  drive_file_url: string | null; // BARU — migrasi 021, arsip audit Google Drive (null kalau belum/gagal)
  file_url: string | null;
  generated_at: string;
  sent_at: string | null;
  sent_by: string | null;
  channel: string;
};

export type WalletTransaction = {
  id: number;
  mitra_id: string;
  type: "topup" | "deduction";
  amount: number;
  balance_after: number;
  related_order_id: number | null;
  created_at: string;
};

export type Earning = {
  id: number;
  mitra_id: string;
  order_id: number;
  amount: number;
  period_date: string;
  created_at: string;
};

// Hasil RPC eligible_mitra_for_order (migrasi 008, dikoreksi 014/023/024)
export type EligibleMitra = {
  mitra_id: string;
  name: string;
  wallet_balance: number;
  skill_category: string[] | null; // DIKOREKSI — array sejak migrasi 014
  status: "training" | "ahli" | null;
  gender: "Pria" | "Wanita" | null;
  rating: number | null;
  fee_percent: number; // BARU — migrasi 024: persentase fee tier mitra ini (0.07/0.08/0.10), dipakai juga sebagai ambang saldo riil (wallet_balance >= total_price * fee_percent)
};

// Hasil RPC mitra_tier_info() — migrasi 024. Dipakai Dasbor Mitra (Bagian
// 6.1 "Transparansi Rincian Biaya") untuk menampilkan tier & progres mitra
// menuju tier berikutnya secara transparan sebelum/saat order berjalan.
export type MitraTierInfo = {
  tier_name: "Baru" | "Reguler" | "Terpercaya" | "Unggulan";
  fee_percent: number; // 0.07 | 0.08 | 0.10
  completed_orders: number;
  rating: number | null;
  violation_count: number;
  next_tier_name: string | null; // null kalau sudah di tier tertinggi (Unggulan)
  next_tier_orders_needed: number | null;
  next_tier_rating_needed: number | null;
};

// ============================================================================
// Bagian 7.2/8.2/8.4 (migrasi 025_order_messages_trust_safety.sql)
// ============================================================================

export type OrderMessageSender = "mitra" | "admin" | "customer" | "system";

/** Satu baris chat pada Chat Pesanan (Bagian 7.2 "Komunikasi Ter-mediasi")
 *  -- kanal in-app yang menggantikan pertukaran nomor WA mentah antara
 *  mitra & klien. Dibaca/ditulis mitra & admin langsung lewat Supabase
 *  client (RLS di migrasi 025), dan oleh klien lewat
 *  app/api/customer/orders/[id]/messages/route.ts (service-role, karena
 *  klien bukan Supabase Auth user). */
export type OrderMessage = {
  id: number;
  order_id: number;
  sender_type: OrderMessageSender;
  sender_id: string | null; // null untuk pesan sistem
  sender_name: string;
  body: string;
  created_at: string;
};

/** Satu baris log pada "Modul Trust & Safety" (Bagian 8.4) -- sumber
 *  turunan untuk MitraProfile.violation_count (dihitung otomatis lewat
 *  trigger database, lihat migrasi 025). */
export type MitraViolation = {
  id: number;
  mitra_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};
