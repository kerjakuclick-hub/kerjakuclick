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
};

export type MitraSelfProfile = MitraProfile;
