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
//
// Perubahan BESAR (20 September 2026) -- dokumen struktur website versi
// baru, migrasi 030: skema fee sekarang 2 dimensi (tier mitra x label
// Fast/PRO produk), jadi RPC mitra_tier_info() sekarang balikan
// fast_fee_percent & pro_fee_percent terpisah (bukan satu fee_percent) --
// kartu "Tier Mitra & Fee Platform" menampilkan KEDUANYA sekaligus. Ambang
// peringatan saldo sekarang pakai MITRA_WALLET_MIN_BALANCE (FLAT, Rp8.250,
// dari lib/services.ts) menggantikan hitungan dinamis MIN_TARIF x feePercent
// lama. `feePercent` tunggal yang dulu diteruskan ke <TaskList /> DIHAPUS --
// TaskList sekarang menghitung sendiri persentase yang tepat PER ORDER (pakai
// getPlatformFeePercent(tierName, order.service_type)) karena setiap order
// bisa produk Fast atau PRO yang fee-nya beda. Teks "biaya teknologi tetap"
// (migrasi 028) dihapus dari copy -- komponen itu sudah tidak ada lagi.

import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/mitra/TaskList";
import DigitalIdCard from "@/components/mitra/DigitalIdCard";
import AvailabilityToggle from "@/components/mitra/AvailabilityToggle";
import { formatRupiah, MITRA_WALLET_MIN_BALANCE } from "@/lib/services";
import type { MitraTierInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const tierName = tierInfo?.tier_name ?? "Baru";

  const saldoWarningThreshold = MITRA_WALLET_MIN_BALANCE;

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
              Saldo di bawah {formatRupiah(saldoWarningThreshold)} — ini ambang minimum flat supaya
              Anda tetap muncul di penugasan mitra untuk pesanan apa pun. Silakan top up.
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
          <p className="mt-1 font-display text-xl font-semibold text-ink">{tierName}</p>
          <p className="mt-1 text-xs text-ink/60">
            {Math.round((tierInfo?.fast_fee_percent ?? 0.15) * 100)}% fee layanan Fast ·{" "}
            {Math.round((tierInfo?.pro_fee_percent ?? 0.13) * 100)}% fee layanan PRO
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
          biaya di bawah dihitung memakai fee tier Anda saat ini ({tierName}) -- persentasenya beda
          untuk pesanan layanan Fast ({Math.round((tierInfo?.fast_fee_percent ?? 0.15) * 100)}%) dan
          PRO ({Math.round((tierInfo?.pro_fee_percent ?? 0.13) * 100)}%), tergantung pesanan yang
          Anda kerjakan.
        </p>
        <div className="mt-4">
          <TaskList
            initialOrders={orders ?? []}
            mitraId={user!.id}
            mitraName={profile?.name ?? "Mitra"}
            transactions={transactions ?? []}
            earnings={earnings ?? []}
            invoices={invoices ?? []}
            tierName={tierName}
          />
        </div>
      </div>
    </div>
  );
}
