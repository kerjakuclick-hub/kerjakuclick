import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  assigned: ["working"],
  working: ["completed"],
};

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
  if (profile?.role !== "mitra") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { orderId, status } = await req.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("status, mitra_id")
    .eq("id", orderId)
    .single();

  if (fetchError || !currentOrder) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  if (currentOrder.mitra_id !== user.id) {
    return NextResponse.json({ error: "Ini bukan tugas Anda." }, { status: 403 });
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentOrder.status] ?? [];
  if (!allowedNext.includes(status)) {
    return NextResponse.json(
      { error: `Tidak bisa mengubah status dari ${currentOrder.status} ke ${status}.` },
      { status: 400 }
    );
  }

  // Pakai client bersesi mitra sendiri (bukan service role) supaya RLS
  // "orders_mitra_update_own" tetap jadi penjaga akses yang sesungguhnya.
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order });
}
