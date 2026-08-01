// GANTI ISI app/mitra/page.tsx Anda dengan file ini.
//
// Perubahan: teks peringatan saldo tidak lagi menyebut angka tetap Rp50.000;
// menambah fetch dari `earnings` (model baru) di samping `transactions`
// (model lama) — dikirim keduanya ke TaskList supaya riwayat pekerjaan lama
// & baru sama-sama bisa ditampilkan dengan benar.

import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/mitra/TaskList";
import { formatRupiah, services } from "@/lib/services";

export const dynamic = "force-dynamic";

const MIN_TARIF = Math.min(...services.map((s) => s.price));
const SALDO_WARNING_THRESHOLD = Math.round(MIN_TARIF * 0.2);

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

  const { data: earnings } = await supabase
    .from("earnings")
    .select("*")
    .eq("mitra_id", user!.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Halo, {profile?.name ?? "Mitra"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">Ringkasan dompet dan tugas Anda hari ini.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Saldo Deposito</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {formatRupiah(profile?.wallet_balance ?? 0)}
          </p>
          {(profile?.wallet_balance ?? 0) < SALDO_WARNING_THRESHOLD && (
            <p className="mt-1 text-xs text-red-600">
              Saldo di bawah {formatRupiah(SALDO_WARNING_THRESHOLD)} — Anda mungkin tidak muncul di
              penugasan untuk sebagian pesanan (ambang bervariasi, 20% dari nilai layanan).
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
          <TaskList
            initialOrders={orders ?? []}
            mitraId={user!.id}
            transactions={transactions ?? []}
            earnings={earnings ?? []}
          />
        </div>
      </div>
    </div>
  );
}
