// lib/types.ts — versi lengkap Fase 1.1 (gabungan file asli + field baru addendum).
// File ini SIAP MENIMPA lib/types.ts Anda yang sekarang — semua field lama
// tetap ada, hanya ditambah field baru yang ditandai komentar "BARU".

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
  min_wallet_required: number; // BARU — generated column, 20% dari total_price (migrasi 007)
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
  gender: "Pria" | "Wanita" | null; // BARU — migrasi 007
  skill_category: string | null; // BARU — migrasi 007
  photo_url: string | null; // BARU — migrasi 007
  rating: number | null; // BARU — migrasi 007
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
// BARU — model deposit Addendum Fase 1.1 (menggantikan model bagi hasil lama
// untuk order yang completed SETELAH migrasi 008)
// ============================================================================

export type Invoice = {
  id: number;
  order_id: number;
  invoice_number: string;
  recipient_type: "klien" | "mitra";
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

// Hasil RPC eligible_mitra_for_order (migrasi 008)
export type EligibleMitra = {
  mitra_id: string;
  name: string;
  wallet_balance: number;
  skill_category: string | null;
  status: "training" | "ahli" | null;
  gender: "Pria" | "Wanita" | null;
  rating: number | null;
};
