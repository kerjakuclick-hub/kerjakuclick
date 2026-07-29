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

  const { data: current, error: fetchError } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", mitraId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ wallet_balance: current.wallet_balance + Number(amount) })
    .eq("id", mitraId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
