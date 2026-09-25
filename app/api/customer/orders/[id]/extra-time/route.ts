// FILE BARU: app/api/customer/orders/[id]/extra-time/route.ts
//
// Fitur "Tambah Waktu Kerja" -- diangkat dari DOK BISNIS SEPT 2026.pdf
// (dokumen sebelum revisi pasca-audit fraud, belum pernah diimplementasikan
// sebelum ini), disesuaikan ke arsitektur yang sudah ada supaya konsisten
// dengan semangat anti-fraud dari revisi sebelumnya:
//
//   - DIAJUKAN KLIEN SENDIRI dari dashboardnya (bukan mitra melapor sendiri)
//     -- sesuai bagian "SISTEM DIBUTUHKAN > DASHBOARD PELANGGAN" di dokumen
//     asli: "Edit pesanan / tombol tambah waktu pilihan 30 menit dan 60
//     menit". Mitra TIDAK bisa menambahkan biaya tambahan sepihak lewat
//     endpoint ini -- persis pola yang ditemukan disalahgunakan di audit
//     fraud sebelumnya (mitra menambah tagihan tanpa sepengetahuan klien).
//   - Tarif dihitung dari RUMUS TETAP (lib/services.ts getExtraTimePrice()),
//     BUKAN nominal bebas -- tidak bisa dimanipulasi manual oleh siapa pun.
//   - Maksimal SATU KALI per pesanan (30 ATAU 60 menit, tidak bisa
//     diakumulasi) -- kalau klien perlu lebih dari itu, dokumen mewajibkan
//     repeat order baru dengan request mitra yang sama, bukan menambah lagi
//     di pesanan ini.
//   - Hanya berlaku untuk order yang sudah punya mitra & belum selesai
//     (status assigned/working) -- tidak ada gunanya menambah waktu untuk
//     order yang belum ditugaskan atau yang sudah selesai.
//
// PERUBAHAN BESAR (20 September 2026) -- migrasi "Upgrade Fee Tier Produk"
// (dokumen "UPDATE WEBSITE KERJAKU.CLICK"): tabel rate flat EXTRA_TIME_RATES
// lama DIHAPUS TOTAL, diganti rumus yang TERGANTUNG TIER MITRA yang sedang
// mengerjakan order ini -- makanya endpoint ini perlu ambil tier mitra ybs
// dulu lewat RPC mitra_tier_info() sebelum menghitung harga.
//
// PERUBAHAN FINAL (22 September 2026) -- dokumen "Logika Hitung Harga Tambah
// Waktu" (final): rumus getExtraTimePrice() DIHITUNG ULANG TOTAL (lebih
// sederhana, lihat lib/services.ts), DAN durasi tambah waktu SEKARANG FIXED
// per label produk -- Fast HANYA +30 menit, PRO HANYA +60 menit (BUKAN LAGI
// bebas pilih 30/60 utk semua produk). `minutes` dari body request TETAP
// divalidasi di sini (bukan dihitung otomatis dari label) supaya kalau ada
// bug di client (ExtraTimeButton.tsx mengirim durasi yang salah utk label
// produk ybs), error-nya jelas ketahuan di sini, bukan diam-diam dipaksa
// benar.
//
// REVISI (25 September 2026, konfirmasi Anda): durasi TIDAK LAGI fixed per
// label -- Fast & PRO sama-sama bisa +30 ATAU +60 menit (60 menit = 2x harga
// 30 menit). Fee Platform di dalam harga tambah waktu sekarang disimpan di
// kolom BARU orders.extra_time_fee (migrasi 038) dan dipotong PENUH dari
// saldo deposit mitra saat order selesai. Rumus: lib/services.ts
// getExtraTimeBreakdown().
//
// Begitu berhasil: total_price pesanan bertambah, DAN sebuah pesan sistem
// otomatis masuk ke Chat Pesanan (order_messages) supaya mitra langsung
// tahu real-time tanpa perlu refresh -- pola sender_type='system' yang sama
// dipakai fitur lain di tabel ini (migrasi 025).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";
import {
  getExtraTimeBreakdown,
  formatRupiah,
  findServiceByLabel,
  type MitraLoyaltyTier,
} from "@/lib/services";
import { sendFonnteMessage, buildExtraTimeAddedMessage } from "@/lib/whatsapp";

/** Sama persis dengan app/api/customer/riwayat/route.ts & .../messages/
 *  route.ts -- SENGAJA diduplikasi, lihat catatan di file-file itu. */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}
function localSuffix(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("62")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "ID pesanan tidak valid." }, { status: 400 });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);
  if (!customer) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const { minutes } = (await req.json()) as { minutes?: number };
  if (minutes !== 30 && minutes !== 60) {
    return NextResponse.json({ error: "Pilih tambah waktu 30 atau 60 menit." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (localSuffix(order.customer_phone) !== localSuffix(customer.phone)) {
    return NextResponse.json({ error: "Pesanan ini bukan milik Anda." }, { status: 403 });
  }
  if (order.status !== "assigned" && order.status !== "working") {
    return NextResponse.json(
      { error: "Tambah waktu hanya bisa diajukan selama pesanan berjalan (sudah ada mitra, belum selesai)." },
      { status: 400 }
    );
  }
  if (order.extra_time_minutes && order.extra_time_minutes > 0) {
    return NextResponse.json(
      {
        error:
          "Pesanan ini sudah pernah ditambah waktu. Untuk tambahan lagi, silakan buat pesanan baru (repeat order) dan minta mitra yang sama.",
      },
      { status: 400 }
    );
  }

  if (!order.mitra_id) {
    return NextResponse.json(
      { error: "Pesanan ini belum punya mitra yang ditugaskan." },
      { status: 400 }
    );
  }

  // Sejak 25 September 2026: Fast & PRO sama-sama boleh 30 ATAU 60 menit
  // (sudah divalidasi di atas), cukup pastikan layanannya dikenali.
  const variant = findServiceByLabel(order.service_type);
  if (!variant) {
    return NextResponse.json(
      { error: "Tambah waktu tidak berlaku untuk jenis layanan ini." },
      { status: 400 }
    );
  }

  // Tier loyalty mitra ybs menentukan Fee Platform dalam rumus tambah waktu
  // (lihat catatan di atas + getExtraTimePrice() di lib/services.ts).
  const { data: tierInfoRows, error: tierError } = await admin.rpc("mitra_tier_info", {
    p_mitra_id: order.mitra_id,
  });
  if (tierError) {
    return NextResponse.json(
      { error: tierError.message ?? "Gagal mengambil data tier mitra." },
      { status: 500 }
    );
  }
  const tierName = (tierInfoRows?.[0]?.tier_name as MitraLoyaltyTier | undefined) ?? "New";

  const breakdown = getExtraTimeBreakdown(tierName, order.service_type, minutes as 30 | 60);
  if (breakdown === null) {
    return NextResponse.json(
      { error: "Tambah waktu tidak berlaku untuk jenis layanan ini." },
      { status: 400 }
    );
  }
  const extraPrice = breakdown.price;
  const newTotalPrice = order.total_price + extraPrice;

  const { data: updatedOrder, error: updateError } = await admin
    .from("orders")
    .update({
      total_price: newTotalPrice,
      extra_time_minutes: minutes,
      extra_time_price: extraPrice,
      // BARU (migrasi 038): fee penuh di dalam harga tambah waktu, dipotong
      // dari deposit mitra saat order selesai.
      extra_time_fee: breakdown.fee,
      extra_time_requested_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Pesan sistem ke Chat Pesanan -- best-effort, TIDAK menggagalkan
  // permintaan tambah waktu kalau gagal tercatat (mis. tabel order_messages
  // sempat bermasalah); yang penting total_price & kolom audit sudah benar.
  try {
    await admin.from("order_messages").insert({
      order_id: orderId,
      sender_type: "system",
      sender_id: null,
      sender_name: "Sistem",
      body: `⏱️ ${customer.name} menambah waktu kerja +${minutes} menit (${formatRupiah(
        extraPrice
      )}). Total pesanan sekarang ${formatRupiah(newTotalPrice)}.`,
    });
  } catch (chatError) {
    console.error("Gagal kirim pesan sistem tambah waktu ke chat:", chatError);
  }

  // Notifikasi WA ke klien (konfirmasi) -- best-effort juga, tidak
  // menggagalkan permintaan kalau Fonnte gagal kirim.
  try {
    const message = buildExtraTimeAddedMessage({
      minutes,
      extraPrice,
      newTotalPrice,
      serviceType: order.service_type,
    });
    await sendFonnteMessage(order.customer_phone, message);
  } catch (waError) {
    console.error("Gagal kirim notifikasi WA tambah waktu:", waError);
  }

  return NextResponse.json({ order: updatedOrder });
}
