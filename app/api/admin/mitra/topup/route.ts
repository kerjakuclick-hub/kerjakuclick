// GANTI ISI app/api/admin/mitra/topup/route.ts Anda dengan file ini.
//
// Perubahan dari versi asli: update wallet_balance sebelumnya langsung
// lewat .update(), tanpa jejak audit. Sekarang dipanggil lewat RPC
// topup_wallet() (migrasi 008) supaya SETIAP top up otomatis tercatat di
// wallet_transactions (AC9) — update saldo & pencatatan audit selalu satu
// paket, tidak mungkin salah satu tertinggal.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
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

  return NextResponse.json({ profile: updated, newBalance });
}
