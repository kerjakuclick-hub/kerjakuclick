import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/mitra/TaskList";
import { formatRupiah } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function MitraDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, wallet_balance, total_earnings, status, is_active")
    .eq("id", user!.id)
    .single();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("mitra_id", user!.id)
    .order("created_at", { ascending: false });

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("mitra_id", user!.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Halo, {profile?.name ?? "Mitra"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">Ringkasan e-wallet dan tugas Anda hari ini.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Saldo Deposito</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {formatRupiah(profile?.wallet_balance ?? 0)}
          </p>
          {(profile?.wallet_balance ?? 0) < 50000 && (
            <p className="mt-1 text-xs text-red-600">
              Saldo di bawah Rp50.000 — Anda tidak akan muncul di penugasan baru.
            </p>
          )}
        </div>
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Total Pendapatan</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {formatRupiah(profile?.total_earnings ?? 0)}
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Status Keahlian</p>
          <p className="mt-1 font-display text-xl font-semibold capitalize text-ink">
            {profile?.status ?? "training"}
          </p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Tugas Saya</h2>
        <p className="mt-1 text-sm text-ink/60">
          Daftar ini otomatis diperbarui saat admin menugaskan pesanan baru untuk Anda.
        </p>
        <div className="mt-4">
          <TaskList initialOrders={orders ?? []} mitraId={user!.id} transactions={transactions ?? []} />
        </div>
      </div>
    </div>
  );
}
