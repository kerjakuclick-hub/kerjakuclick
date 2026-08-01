// GANTI ISI app/admin/page.tsx Anda dengan file ini.
//
// Perubahan (revisi ke-2): sekarang juga mengambil data `invoices` dan
// mengirimkannya ke OrdersFeed, supaya admin bisa melihat & mengunduh file
// invoice yang sudah ter-generate, serta menandainya "Sudah Dikirim".
// Sebelumnya kolom ini kehapus saat penyesuaian ke struktur repo asli Anda.

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

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Live Feed Pesanan</h1>
      <p className="mt-1 text-sm text-ink/60">
        Daftar ini otomatis diperbarui saat ada pesanan baru masuk lewat WhatsApp — tidak perlu
        refresh manual.
      </p>
      <div className="mt-6">
        <OrdersFeed initialOrders={orders ?? []} initialInvoices={invoices ?? []} />
      </div>
    </div>
  );
}
