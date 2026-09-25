// GANTI ISI app/api/admin/mitra/topup/route.ts Anda dengan file ini.
//
// Perubahan dari versi asli: update wallet_balance sebelumnya langsung
// lewat .update(), tanpa jejak audit. Sekarang dipanggil lewat RPC
// topup_wallet() (migrasi 008) supaya SETIAP top up otomatis tercatat di
// wallet_transactions (AC9) — update saldo & pencatatan audit selalu satu
// paket, tidak mungkin salah satu tertinggal.
//
// BARU (25 September 2026): setelah saldo berhasil diisi, mitra otomatis
// dapat WA "Saldo Masuk" (nominal, saldo baru, sudah/belum di atas ambang
// minimum). Best-effort -- kalau WA gagal terkirim, top up TETAP berhasil;
// status kirimnya dikembalikan di field `waNotify` untuk admin.

import { ensureBusinessParams } from "@/lib/businessParams";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendFonnteMessage, buildTopupSuccessMessage } from "@/lib/whatsapp";
import { getWalletMinBalance } from "@/lib/services";

export async function POST(req: NextRequest) {
  // Parameter Bisnis (harga, katalog, fee -- migrasi 040), cache 60 detik.
  await ensureBusinessParams();

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { mitraId, amount } = await req.json();
  if (!mitraId || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Data top up tidak valid." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: newBalance, error: rpcError } = await admin.rpc("topup_wallet", {
    p_mitra_id: mitraId,
    p_amount: Number(amount),
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const { data: updated, error: fetchError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", mitraId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let waNotify: { ok: boolean; error?: string } = { ok: false, error: "Nomor mitra kosong." };
  if (updated?.phone) {
    const result = await sendFonnteMessage(
      updated.phone,
      buildTopupSuccessMessage({
        mitraName: updated.name ?? "Mitra",
        amount: Number(amount),
        newBalance: Number(newBalance ?? updated.wallet_balance ?? 0),
        minBalance: getWalletMinBalance(),
      })
    );
    waNotify = result.ok ? { ok: true } : { ok: false, error: result.error };
    if (!result.ok) console.error("Gagal kirim WA saldo masuk ke mitra:", result.error);
  }

  return NextResponse.json({ profile: updated, newBalance, waNotify });
}
