// GANTI ISI app/api/customer/riwayat/route.ts Anda dengan file ini.
//
// PERBAIKAN (sebelumnya): orders.customer_phone diisi mentah dari teks
// pesan WA (bisa ada spasi/"+"/strip di dalamnya), sedangkan
// customers.phone sudah dinormalisasi bersih. Exact-match .in() gampang
// gagal kalau ada 1 karakter beda. Solusinya: cocokkan berdasar DIGIT SAJA
// (buang semua karakter non-angka dari kedua sisi), lalu bandingkan bagian
// "nomor lokal"-nya (buang awalan 0/62) -- supaya "0812...", "62812...",
// "+62 812...", "62-812-..." semua dianggap nomor yang sama.
//
// Perubahan BARU (18 September 2026) -- fitur "Tambah Waktu Kerja" &
// "Otomatisasi Invoice Pembayaran" (migrasi
// 027_order_extra_time_and_invoice_notify.sql):
//   1. Kolom extra_time_minutes & extra_time_price ditambahkan ke .select()
//      supaya halaman Riwayat (app/riwayat/page.tsx) bisa: (a) tahu kapan
//      harus menampilkan tombol "Tambah Waktu" (extra_time_minutes === 0),
//      (b) menampilkan info tambahan waktu yang sudah diajukan.
//   2. Query tambahan ke tabel `invoices` (purpose='pembayaran',
//      recipient_type='klien') untuk order-order yang dikembalikan --
//      supaya klien bisa lihat & unduh invoice pembayarannya langsung dari
//      halaman Riwayat, tanpa perlu menunggu dikirim mitra/WA/chat.
//      Diambil TERPISAH (bukan join SQL) karena Supabase JS client di sini
//      tidak pakai foreign key relationship eksplisit antara orders &
//      invoices -- 2 query kecil lebih sederhana & aman daripada
//      menambah definisi relasi baru.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COOKIE_NAME, getCustomerFromToken } from "@/lib/customerAuth";

/** Buang semua karakter selain digit. */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Buang awalan "62" atau "0" dari digit bersih, sisakan "nomor lokal"
 *  (mis. "6285178686678" -> "85178686678", "085178686678" -> "85178686678").
 *  Ini yang dipakai sebagai kunci pembanding, supaya format awalan beda
 *  tidak masalah. */
function localSuffix(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith("62")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customer = await getCustomerFromToken(token);

  if (!customer) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const targetSuffix = localSuffix(customer.phone);

  // Ambil kandidat lewat ilike (broad filter, masih pakai index/pencarian
  // teks biasa di database) berdasar 8 digit terakhir -- bagian ini nyaris
  // pasti sama persis di semua format penulisan nomor yang sama, jadi aman
  // dipakai sebagai penyaring awal supaya tidak perlu fetch seluruh tabel.
  const last8 = targetSuffix.slice(-8);

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, service_type, total_price, address, scheduled_date, preferred_time, mitra_gender_preference, status, created_at, customer_name, customer_phone, extra_time_minutes, extra_time_price, invoice_notified_at"
    )
    .ilike("customer_phone", `%${last8}%`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Saring presisi di JavaScript: cocokkan nomor lokal (digit bersih,
  // tanpa awalan 0/62) -- ini yang menangani kasus spasi/"+"/strip/dsb
  // yang lolos dari query ilike di atas.
  const orders = (data ?? []).filter(
    (o) => localSuffix(o.customer_phone) === targetSuffix
  );

  // Ambil invoice pembayaran (kalau ada) untuk semua order milik klien ini
  // -- best-effort, kegagalan di sini TIDAK menggagalkan tampilnya riwayat
  // itu sendiri (invoice cuma info tambahan).
  let invoiceByOrderId: Record<number, { file_url: string; created_at: string }> = {};
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length > 0) {
    const { data: invoices, error: invoiceError } = await admin
      .from("invoices")
      .select("order_id, file_url, created_at")
      .in("order_id", orderIds)
      .eq("purpose", "pembayaran")
      .eq("recipient_type", "klien")
      .order("created_at", { ascending: false });

    if (!invoiceError && invoices) {
      for (const inv of invoices) {
        // Order pertama yang ketemu (hasil sudah diurutkan terbaru dulu)
        // yang dipakai -- kalau suatu saat ada regenerate invoice untuk
        // order yang sama, yang ditampilkan selalu versi terbaru.
        if (!invoiceByOrderId[inv.order_id]) {
          invoiceByOrderId[inv.order_id] = { file_url: inv.file_url, created_at: inv.created_at };
        }
      }
    } else if (invoiceError) {
      console.error("Gagal ambil data invoice pembayaran untuk riwayat:", invoiceError);
    }
  }

  const ordersWithInvoice = orders.map((o) => ({
    ...o,
    invoice: invoiceByOrderId[o.id] ?? null,
  }));

  return NextResponse.json({ orders: ordersWithInvoice });
}
