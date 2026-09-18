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
//   - Tarif TETAP per kategori layanan (lib/services.ts EXTRA_TIME_RATES),
//     BUKAN nominal bebas -- tidak bisa dimanipulasi manual oleh siapa pun.
//   - Maksimal SATU KALI per pesanan (30 ATAU 60 menit, tidak bisa
//     diakumulasi) -- kalau klien perlu lebih dari itu, dokumen mewajibkan
//     repeat order baru dengan request mitra yang sama, bukan menambah lagi
//     di pesanan ini.
//   - Hanya berlaku untuk order yang sudah punya mitra & belum selesai
//     (status assigned/working) -- tidak ada gunanya menambah waktu untuk
//     order yang belum ditugaskan atau yang sudah selesai.
//   - Hanya berlaku untuk 4 varian yang disebut eksplisit di dokumen
//     (Setrika Fast/PRO, Cleaning Fast/PRO) -- getExtraTimeOptions()
//     mengembalikan null untuk kategori lain (Cuci Kendaraan, Les Private).
//
// Begitu berhasil: total_price pesanan bertambah, DAN sebuah pesan sistem
// otomatis masuk ke Chat Pesanan (order_messages) supaya mitra langsung
// tahu real-time tanpa perlu refresh -- pola sender_type='system' yang sama
// dipakai fitur lain di tabel ini (migrasi 025).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";
import { getExtraTimeOptions, formatRupiah } from "@/lib/services";
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

  const rates = getExtraTimeOptions(order.service_type);
  if (!rates) {
    return NextResponse.json(
      { error: "Tambah waktu tidak berlaku untuk jenis layanan ini." },
      { status: 400 }
    );
  }

  const extraPrice = rates[minutes as 30 | 60];
  const newTotalPrice = order.total_price + extraPrice;

  const { data: updatedOrder, error: updateError } = await admin
    .from("orders")
    .update({
      total_price: newTotalPrice,
      extra_time_minutes: minutes,
      extra_time_price: extraPrice,
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
