// FILE BARU: app/api/admin/invoices/mark-sent/route.ts
//
// Dipanggil saat admin menekan tombol "Tandai Terkirim" setelah benar-benar
// mengirim file invoice secara manual via WhatsApp Bisnis.

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

  const { invoiceId } = await req.json();
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: updated, error } = await admin
    .from("invoices")
    .update({ sent_at: new Date().toISOString(), sent_by: user.id })
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: updated });
}
