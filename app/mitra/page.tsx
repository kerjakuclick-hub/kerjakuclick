// GANTI ISI app/mitra/page.tsx Anda dengan file ini.
//
// Perubahan dari versi sebelumnya:
// 1. Query profil ditambah kolom photo_url, skill_category, rating (buat
//    ID Card Digital) -- kolom lain yang sudah ada TIDAK diubah.
// 2. Section baru <DigitalIdCard /> ditambahkan setelah ringkasan
//    saldo/pendapatan, sebelum daftar Tugas Saya.
// 3. Fitur "Toggle Ketersediaan Mitra", migrasi 023: query profil
//    ditambah is_available, unavailable_reason, unavailable_since; section
//    baru <AvailabilityToggle /> ditambahkan di paling atas (sebelum
//    ringkasan saldo) supaya mitra langsung lihat & bisa ubah status
//    begitu buka dasbor.
//
// Perubahan BARU (18 September 2026) -- fitur "Skema Fee Berjenjang &
// Transparansi Biaya" (Bagian 6.1 & 6.2 Dokumen Bisnis Revisi Pasca-Audit
// Fraud), migrasi 024_tier_based_platform_fee.sql:
// 4. Panggil RPC mitra_tier_info() -- tier mitra ini sekarang DIHITUNG dari
//    data real (jumlah order selesai, rating, pelanggaran), bukan lagi flat
//    20% untuk semua mitra.
// 5. Kartu ringkasan ditambah dari 3 jadi 4 kolom: kartu baru "Tier Mitra"
//    menampilkan nama tier + persentase fee platform saat ini + progres
//    menuju tier berikutnya -- inilah bagian "transparansi" yang disetujui:
//    mitra langsung tahu berapa persen potongannya dan kenapa, tanpa perlu
//    tanya admin.
// 6. Peringatan saldo di kartu "Saldo Deposito" TIDAK lagi hardcode teks
//    "20% dari nilai layanan" -- sekarang memakai fee_percent tier mitra
//    yang bersangkutan (ambang riil sejak migrasi 024 memang bervariasi per
//    tier, lihat eligible_mitra_for_order() & app/api/admin/orders/assign).
// 7. tierInfo diteruskan ke <TaskList /> supaya breakdown biaya per order
//    (harga, potongan fee tier, tunai bersih) bisa ditampilkan di sana.
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2/8.2: profile.name
// diteruskan ke <TaskList /> sebagai prop `mitraName`, dipakai sebagai nama
// pengirim di Chat Pesanan in-app (order_messages, migrasi 025).

import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/mitra/TaskList";
import DigitalIdCard from "@/components/mitra/DigitalIdCard";
import AvailabilityToggle from "@/components/mitra/AvailabilityToggle";
import { formatRupiah, services } from "@/lib/services";
import type { MitraTierInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIN_TARIF = Math.min(...services.map((s) => s.price));

export default async function MitraDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, name, phone, wallet_balance, total_earnings, status, is_active, photo_url, skill_category, rating, is_available, unavailable_reason, unavailable_since"
    )
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

  // Invoice pembayaran -- terbit otomatis saat mitra klik "Selesaikan
  // Tugas". RLS "invoices_mitra_read_own" sudah membatasi ke invoice milik
  // order mitra ini sendiri, jadi cukup filter purpose di sini.
  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: invoices } =
    orderIds.length > 0
      ? await supabase
          .from("invoices")
          .select("*")
          .in("order_id", orderIds)
          .eq("purpose", "pembayaran")
      : { data: [] };

  // Tier & fee platform mitra ini (Bagian 6.1/6.2) -- dihitung server-side
  // dari data real lewat RPC, bukan nilai statis.
  const { data: tierInfoRows } = await supabase.rpc("mitra_tier_info", {
    p_mitra_id: user!.id,
  });
  const tierInfo: MitraTierInfo | null = tierInfoRows?.[0] ?? null;
  const feePercent = tierInfo?.fee_percent ?? 0.1; // fallback konservatif kalau RPC belum ter-deploy

  const saldoWarningThreshold = Math.round(MIN_TARIF * feePercent);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Halo, {profile?.name ?? "Mitra"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">Ringkasan dompet dan tugas Anda hari ini.</p>
      </div>

      {profile && (
        <AvailabilityToggle
          initialIsAvailable={profile.is_available ?? true}
          initialReason={profile.unavailable_reason ?? null}
          initialSince={profile.unavailable_since ?? null}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Saldo Deposito</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {formatRupiah(profile?.wallet_balance ?? 0)}
          </p>
          {(profile?.wallet_balance ?? 0) < saldoWarningThreshold && (
            <p className="mt-1 text-xs text-red-600">
              Saldo di bawah {formatRupiah(saldoWarningThreshold)} — Anda mungkin tidak muncul di
              penugasan untuk sebagian pesanan (ambang = fee tier Anda saat ini,{" "}
              {Math.round(feePercent * 100)}% dari nilai layanan).
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
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-xs uppercase text-ink/50">Tier Mitra &amp; Fee Platform</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">
            {tierInfo?.tier_name ?? "Baru"}{" "}
            <span className="text-sm font-normal text-ink/60">
              · {Math.round(feePercent * 100)}% fee
            </span>
          </p>
          <p className="mt-1 text-xs text-ink/50">
            {tierInfo?.completed_orders ?? 0} order selesai
            {tierInfo?.rating != null ? ` · rating ${tierInfo.rating}` : ""}
          </p>
          {tierInfo?.next_tier_name && (
            <p className="mt-1 text-xs text-bay-deep">
              Menuju {tierInfo.next_tier_name}: butuh{" "}
              {tierInfo.next_tier_orders_needed ?? 0} order lagi &amp; rating ≥{" "}
              {tierInfo.next_tier_rating_needed}, tanpa pelanggaran.
            </p>
          )}
        </div>
      </div>

      {profile && (
        <DigitalIdCard
          mitra={{
            id: profile.id,
            name: profile.name,
            photo_url: profile.photo_url,
            status: profile.status,
            skill_category: profile.skill_category,
            rating: profile.rating,
          }}
        />
      )}

      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Tugas Saya</h2>
        <p className="mt-1 text-sm text-ink/60">
          Daftar ini otomatis diperbarui saat admin menugaskan pesanan baru untuk Anda. Rincian
          biaya di bawah dihitung memakai fee tier Anda saat ini ({tierInfo?.tier_name ?? "Baru"},{" "}
          {Math.round(feePercent * 100)}%).
        </p>
        <div className="mt-4">
          <TaskList
            initialOrders={orders ?? []}
            mitraId={user!.id}
            mitraName={profile?.name ?? "Mitra"}
            transactions={transactions ?? []}
            earnings={earnings ?? []}
            invoices={invoices ?? []}
            feePercent={feePercent}
            tierName={tierInfo?.tier_name ?? "Baru"}
          />
        </div>
      </div>
    </div>
  );
}
