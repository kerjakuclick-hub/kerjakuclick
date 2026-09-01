// FILE BARU: app/api/admin/orders/mark-mitra-id-sent/route.ts
//
// Dipanggil saat admin menekan tombol "Tandai Terkirim" setelah benar-benar
// mengirim ID Card mitra secara manual via WhatsApp -- pola sama persis
// dengan app/api/admin/invoices/mark-sent/route.ts.

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

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: updated, error } = await admin
    .from("orders")
    .update({ mitra_id_card_sent_at: new Date().toISOString(), mitra_id_card_sent_by: user.id })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: updated });
}
