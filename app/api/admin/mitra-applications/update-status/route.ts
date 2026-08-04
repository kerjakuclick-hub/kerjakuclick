// FILE BARU: app/api/admin/mitra-applications/update-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUS = ["pending", "reviewed", "accepted", "rejected"];

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

  const { id, status, admin_notes } = await req.json();
  if (!id || !status || !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "id dan status (valid) wajib diisi." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: updated, error } = await admin
    .from("mitra_applications")
    .update({
      status,
      admin_notes: admin_notes ?? undefined,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: updated });
}
