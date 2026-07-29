import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const body = await req.json();
  const { orderId, mitra_id, status } = body as {
    orderId: number;
    mitra_id?: string | null;
    status?: string;
  };

  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {};
  if (mitra_id !== undefined) updateFields.mitra_id = mitra_id;
  if (status !== undefined) updateFields.status = status;

  // Pakai client bersesi admin (bukan service role) supaya RLS
  // "orders_admin_all" tetap yang menjadi penjaga akses sebenarnya.
  const { data: order, error } = await supabase
    .from("orders")
    .update(updateFields)
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order });
}
