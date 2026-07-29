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

  const { data: mitraOptions } = await supabase
    .from("profiles")
    .select("id, name, wallet_balance")
    .eq("role", "mitra")
    .eq("is_active", true)
    .gte("wallet_balance", 50000)
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Live Feed Pesanan</h1>
      <p className="mt-1 text-sm text-ink/60">
        Daftar ini otomatis diperbarui saat ada pesanan baru masuk lewat WhatsApp — tidak perlu
        refresh manual.
      </p>
      <div className="mt-6">
        <OrdersFeed initialOrders={orders ?? []} mitraOptions={mitraOptions ?? []} />
      </div>
    </div>
  );
}
