import { createClient } from "@/lib/supabase/server";
import MitraTable from "@/components/admin/MitraTable";

export const dynamic = "force-dynamic";

export default async function AdminMitraPage() {
  const supabase = createClient();

  const { data: mitraList } = await supabase
    .from("profiles")
    .select("id, name, phone, wallet_balance, total_earnings, status, is_active")
    .eq("role", "mitra")
    .order("name");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Kelola Mitra</h1>
      <p className="mt-1 text-sm text-ink/60">
        Mitra dengan saldo di bawah Rp50.000 tidak akan muncul di pilihan penugasan pada Live Feed.
      </p>
      <div className="mt-6">
        <MitraTable initialMitra={mitraList ?? []} />
      </div>
    </div>
  );
}
