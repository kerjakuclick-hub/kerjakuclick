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
//
// Perubahan BARU (18 September 2026) -- fitur "Bagikan Lokasi" di Chat
// Pesanan, migrasi 026_order_messages_location.sql:
//   7. Type BARU OrderMessageType ("text" | "location").
//   8. OrderMessage: tambah message_type, location_lat, location_lng.
//
// Perubahan BARU (18 September 2026) -- fitur "Tambah Waktu Kerja" (diangkat
// dari DOK BISNIS SEPT 2026.pdf) + otomatisasi kirim invoice pembayaran,
// migrasi 027_order_extra_time_and_invoice_notify.sql:
//   9. Order: tambah extra_time_minutes, extra_time_price,
//      extra_time_requested_at (skema tambah waktu, lihat
//      lib/services.ts EXTRA_TIME_RATES) dan invoice_notified_at /
//      invoice_notify_error (jejak kirim otomatis invoice pembayaran ke WA
//      klien lewat Fonnte, MENGGANTIKAN alur lama mitra kirim manual).

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
  min_wallet_required: number; // generated column, 20% dari total_price (migrasi 007) -- SEKARANG HANYA acuan lama/tampilan; ambang kelayakan riil sejak migrasi 030/034 adalah FLAT (lihat mitra_wallet_threshold()/MITRA_WALLET_MIN_BALANCE, Rp10.500 sejak 22 Sep 2026), bukan lagi 20% ataupun dinamis per tier (migrasi 024/028)
  completed_at: string | null; // BARU — migrasi 034 (22 September 2026): waktu order status berubah jadi 'completed' (diisi otomatis oleh trigger), dipakai utk hitung "job selesai bulan kalender berjalan" pada Program Loyalty Tier. Data lama (completed sebelum migrasi 034) di-backfill dari created_at sebagai pendekatan.
  mitra_id_card_sent_at: string | null; // migrasi 017 — TIDAK dipakai lagi sejak notifikasi klien otomatis (migrasi 020), dibiarkan ada di DB untuk histori
  mitra_id_card_sent_by: string | null; // migrasi 017 — idem
  client_notified_at: string | null; // BARU — migrasi 020: waktu notifikasi WA "pesanan disetujui" berhasil terkirim otomatis
  client_notify_error: string | null; // BARU — migrasi 020: pesan error terakhir kalau notifikasi otomatis gagal
  mitra_notified_at: string | null; // BARU — migrasi 022: waktu notifikasi WA "tugas baru" berhasil terkirim otomatis ke mitra
  mitra_notify_error: string | null; // BARU — migrasi 022: pesan error terakhir kalau notifikasi otomatis ke mitra gagal
  extra_time_minutes: number; // BARU — migrasi 027: 0 | 30 | 60, tambah waktu yang diajukan klien
  extra_time_price: number; // BARU — migrasi 027: nominal tambah waktu (sudah termasuk di total_price), murni jejak audit/tampilan
  extra_time_requested_at: string | null; // BARU — migrasi 027
  invoice_notified_at: string | null; // BARU — migrasi 027: waktu invoice pembayaran berhasil terkirim otomatis ke WA klien
  invoice_notify_error: string | null; // BARU — migrasi 027: pesan error terakhir kalau pengiriman otomatis gagal
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
  violation_count: number; // BARU — migrasi 024: jumlah pelanggaran tercatat, syarat naik tier (0 pelanggaran wajib utk tier Commit & Pro sejak migrasi 034 -- Program Loyalty Tier final), diisi manual admin lewat Trust & Safety, default 0
  sosmed_active: boolean; // BARU — migrasi 034 (Program Loyalty Tier final, 22 September 2026): syarat "AKTIF SOSMED" utk tier Pro (fee terendah). Diisi manual admin lewat halaman Kelola Mitra, default false.
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
  fee_percent: number; // migrasi 024, dihitung ulang sejak migrasi 030: persentase fee tier mitra x label Fast/PRO produk order ini (11-15%, lihat mitra_fee_percent(uuid, text)/MitraTierInfo) -- SEKARANG cuma untuk tampilan estimasi di dropdown admin, BUKAN lagi ambang saldo (ambang kelayakan riil sejak migrasi 030 adalah FLAT, lihat mitra_wallet_threshold())
};

// Hasil RPC mitra_tier_info() — migrasi 024, GANTI TOTAL migrasi 030, GANTI
// TOTAL LAGI migrasi 034 (22 September 2026, Program Loyalty Tier FINAL):
// tier SEKARANG dari JUMLAH JOB SELESAI BULAN KALENDER BERJALAN (bukan lagi
// total order seumur hidup) + status aktif + 0 pelanggaran + aktif sosmed --
// RATING DIHAPUS TOTAL dari syarat tier (next_tier_rating_needed & rating
// dibuang dari sini, completed_orders lifetime diganti
// monthly_completed_orders). 4 tier sekarang: New/Reguler/Commit/Pro
// (menggantikan Baru/Reguler/Terpercaya).
export type MitraTierInfo = {
  tier_name: "New" | "Reguler" | "Commit" | "Pro";
  fast_fee_percent: number; // 0.13 | 0.12 | 0.11 | 0.10
  pro_fee_percent: number; // 0.10 | 0.09 | 0.08 | 0.07
  monthly_completed_orders: number; // job selesai bulan kalender berjalan (reset tiap tanggal 1)
  status: "training" | "ahli"; // syarat dasar tier Reguler+ ('ahli') vs New ('training')
  violation_count: number;
  sosmed_active: boolean;
  next_tier_name: string | null; // null kalau sudah di tier tertinggi (Pro)
  next_tier_jobs_needed: number | null; // job lagi bulan ini yang dibutuhkan utk tier berikutnya
};

// ============================================================================
// Bagian 7.2/8.2/8.4 (migrasi 025_order_messages_trust_safety.sql)
// ============================================================================

export type OrderMessageSender = "mitra" | "admin" | "customer" | "system";

// BARU (migrasi 026_order_messages_location.sql) -- Chat Pesanan sekarang
// bisa kirim titik lokasi ("📍 Bagikan Lokasi"), bukan cuma teks. Lihat
// lib/location.ts untuk helper terkait (getBrowserLocation, googleMapsUrl).
export type OrderMessageType = "text" | "location";

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
  message_type: OrderMessageType; // BARU — migrasi 026, default 'text' untuk data lama
  location_lat: number | null; // BARU — migrasi 026, diisi kalau message_type = 'location'
  location_lng: number | null; // BARU — migrasi 026, diisi kalau message_type = 'location'
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
