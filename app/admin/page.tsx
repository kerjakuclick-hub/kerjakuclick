// GANTI ISI app/admin/page.tsx Anda dengan file ini.
//
// Perubahan: query `mitraOptions` yang lama (.gte("wallet_balance", 50000))
// DIHAPUS — ambang itu sekarang per-order (20% dari total_price masing-
// masing order, plus cocok gender & skill), jadi tidak bisa lagi satu daftar
// mitra global dipakai untuk semua baris. OrdersFeed sekarang mengambil
// daftar mitra eligible SENDIRI per baris lewat RPC eligible_mitra_for_order,
// saat dropdown penugasan dibuka (lihat components/admin/OrdersFeed.tsx).

import { createClient } from "@/lib/supabase/server";
import OrdersFeed from "@/components/admin/OrdersFeed";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Live Feed Pesanan</h1>
      <p className="mt-1 text-sm text-ink/60">
        Daftar ini otomatis diperbarui saat ada pesanan baru masuk lewat WhatsApp — tidak perlu
        refresh manual.
      </p>
      <div className="mt-6">
        <OrdersFeed initialOrders={orders ?? []} />
      </div>
    </div>
  );
}
