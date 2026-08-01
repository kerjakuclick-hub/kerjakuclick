// GANTI ISI app/api/admin/orders/assign/route.ts Anda dengan file ini.
//
// Perubahan dari versi asli:
//   1. Saat mitra_id diisi (penugasan baru), validasi dulu wallet_balance
//      mitra >= min_wallet_required (Bagian 1 & 3 addendum) — SEBELUM
//      update dijalankan. Kalau tidak mencukupi, ditolak dengan 400.
//   2. Setelah update sukses DAN memang sedang menugaskan mitra (bukan
//      sekadar ubah status lain), generate 2 invoice PDF (klien & mitra)
//      lewat generateInvoicesForOrder(), sesuai AC4 (siap dalam hitungan
//      detik, bukan menit).
//   3. Endpoint tetap memakai client bersesi admin (bukan service role)
//      untuk update orders — RLS "orders_admin_all" tetap jadi penjaga akses
//      utama, sama seperti versi asli Anda.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateInvoicesForOrder } from "@/lib/pdf/generate-invoice";

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
  const { orderId, mitra_id, status, estimasiWaktu } = body as {
    orderId: number;
    mitra_id?: string | null;
    status?: string;
    estimasiWaktu?: string;
  };

  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
  }

  const isAssigningMitra = mitra_id !== undefined && mitra_id !== null;

  // --- Validasi ambang saldo SEBELUM update, hanya saat memang menugaskan mitra ---
  if (isAssigningMitra) {
    const admin = getSupabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("min_wallet_required, total_price")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { data: mitra, error: mitraError } = await admin
      .from("profiles")
      .select("wallet_balance, is_active")
      .eq("id", mitra_id as string)
      .single();

    if (mitraError || !mitra) {
      return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    }

    if (!mitra.is_active) {
      return NextResponse.json({ error: "Mitra ini sedang nonaktif." }, { status: 400 });
    }

    if (mitra.wallet_balance < order.min_wallet_required) {
      return NextResponse.json(
        {
          error: `Saldo mitra (Rp${mitra.wallet_balance.toLocaleString("id-ID")}) di bawah ambang minimum Rp${order.min_wallet_required.toLocaleString("id-ID")} (20% dari nilai layanan).`,
        },
        { status: 400 }
      );
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (mitra_id !== undefined) updateFields.mitra_id = mitra_id;
  if (status !== undefined) updateFields.status = status;
  // Begitu mitra ditugaskan, status otomatis ikut jadi 'assigned' kalau
  // pemanggil tidak mengirim status secara eksplisit.
  if (isAssigningMitra && status === undefined) updateFields.status = "assigned";

  const { data: order, error } = await supabase
    .from("orders")
    .update(updateFields)
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Generate invoice PDF (AC4), hanya saat memang sedang menugaskan mitra ---
  let invoiceResult = null;
  if (isAssigningMitra && order) {
    try {
      const admin = getSupabaseAdmin();
      const { data: mitraProfile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", mitra_id as string)
        .single();

      if (mitraProfile) {
        invoiceResult = await generateInvoicesForOrder(
          order,
          mitraProfile,
          estimasiWaktu ?? "segera"
        );
      }
    } catch (invoiceError) {
      // Penugasan mitra TETAP dianggap berhasil walau invoice gagal
      // di-generate — admin bisa generate ulang manual. Jangan bikin
      // seluruh request gagal (500) hanya karena PDF gagal dibuat.
      console.error("Gagal generate invoice:", invoiceError);
    }
  }

  return NextResponse.json({ order, invoice: invoiceResult });
}
