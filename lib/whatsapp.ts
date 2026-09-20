// GANTI ISI lib/whatsapp.ts Anda dengan file ini.
//
// Perubahan: tambah phoneLookupVariants() untuk fitur "Riwayat Pesanan
// Saya" (app/api/riwayat/route.ts) -- dipakai mencocokkan nomor HP yang
// diketik pelanggan ke format yang mungkin tersimpan di kolom
// orders.customer_phone (bisa "0812..." atau "62812..." tergantung cara
// webhook Fonnte menyimpannya). Fungsi & tipe yang sudah ada TIDAK diubah.
//
// Perubahan BARU (18 September 2026) -- Bagian 7.2 "Komunikasi Ter-mediasi"
// & 8.2 "Pendekatan Hybrid WA + In-App" (Dokumen Bisnis Revisi Pasca-Audit
// Fraud): temuan audit menunjukkan mitra memakai nomor WA klien yang
// diterima lewat notifikasi otomatis untuk menawarkan kerja di luar
// platform pada pesanan berikutnya. buildMitraAssignedMessage() SEKARANG
// TIDAK LAGI mencantumkan nomor WA klien -- koordinasi teknis (jadwal,
// perubahan, pertanyaan) diarahkan ke Chat Pesanan in-app (tabel
// order_messages, migrasi 025) yang tercatat & bisa dipantau admin. WA/
// Fonnte tetap dipakai, tapi HANYA untuk notifikasi transaksional otomatis
// -- bukan lagi jalur pertukaran kontak mentah. buildOrderApprovedMessage()
// ke klien juga ditambah pointer yang sama, supaya kedua sisi diarahkan ke
// kanal yang sama.
//
// Perubahan BARU (18 September 2026) -- fitur "Tombol Chat Melayang"
// (components/FloatingChatLauncher.tsx): teks pointer di
// buildOrderApprovedMessage() diperbarui, sekarang menyebut ikon chat
// melayang yang otomatis muncul di semua halaman publik (bukan cuma
// menyuruh klien buka halaman Riwayat Pesanan secara manual).
//
// Perubahan BARU (18 September 2026) -- fitur "Tambah Waktu Kerja" (diangkat
// dari DOK BISNIS SEPT 2026.pdf) & otomatisasi kirim invoice pembayaran,
// migrasi 027_order_extra_time_and_invoice_notify.sql:
//   - buildExtraTimeAddedMessage(): konfirmasi WA ke klien begitu tambah
//     waktu berhasil diajukan (app/api/customer/orders/[id]/extra-time/
//     route.ts).
//   - buildPaymentInvoiceMessage(): notifikasi WA ke klien begitu mitra
//     menyelesaikan tugas & invoice pembayaran terbit
//     (app/api/mitra/orders/update/route.ts) -- MENGGANTIKAN alur lama
//     "mitra unduh PDF lalu kirim manual sendiri via WA pribadinya"; mitra
//     sekarang cukup memberi tahu secara lisan/chat bahwa invoice sudah bisa
//     dicek di dasbor klien atau WA yang dikirim sistem.
//
// Perubahan BARU (20 September 2026) -- Anda meminta nomor WA Operator
// PESANAN lama (+62 811-4550-4178) diganti & digabung jadi SATU nomor
// tunggal: +62 811-4110-9567 (device baru sudah didaftarkan & disambungkan
// ke WhatsApp Business di Fonnte). Nomor ini kebetulan PERSIS sama dengan
// nomor Keluhan/CS yang sebelumnya sengaja dipisah (lihat komentar lama di
// bawah) -- sesuai instruksi Anda "hanya menggunakan 1 nomor", KEDUA fungsi
// sekarang digabung ke satu nomor/device yang sama: pemesanan (parser
// #BARU), customer service/keluhan, pertanyaan daftar mitra (auto-reply FAQ
// di webhook), dan koordinasi top up saldo mitra (japri manual admin).
// CS_COMPLAINT_WA_NUMBER di bawah SENGAJA dibuat = OPERATOR_WA_NUMBER
// (bukan string literal terpisah) supaya cuma ada SATU sumber nomor di
// seluruh kode -- kalau nomornya ganti lagi nanti, cukup ubah nilai
// OPERATOR_WA_NUMBER di satu tempat ini saja.
//
// JANGAN LUPA (di luar kode, tidak bisa diubah lewat file ini):
//   1. Env var FONNTE_DEVICE_TOKEN di Vercel -- update ke token device BARU
//      dari dashboard Fonnte, lalu redeploy (token lama akan gagal kirim
//      pesan begitu device lama dilepas/diganti).
//   2. Di dashboard Fonnte, pastikan Webhook URL device BARU diarahkan ke
//      https://kerjaku.click/api/webhook/fonnte?secret=<FONNTE_WEBHOOK_SECRET>
//      (nilai secret yang SAMA seperti sebelumnya), supaya pesan #BARU yang
//      masuk ke nomor baru tetap otomatis tercatat jadi order.

import { getServiceMaterials } from "./services";

// Nomor WA TUNGGAL kerjaku.click -- +62 811-4110-9567. Nomor ini yang
// tersambung ke Fonnte (webhook parsing #BARU) -- lihat catatan "Perubahan
// BARU (20 September 2026)" di atas kalau perlu diganti lagi nanti.
export const OPERATOR_WA_NUMBER = "6281141109567";

// Nomor WA KELUHAN/CS PELANGGAN -- SEKARANG SENGAJA sama dengan
// OPERATOR_WA_NUMBER di atas (digabung per keputusan Anda, 20 September
// 2026). Tetap diekspor sebagai nama terpisah supaya kode pemanggil
// (buildCsLink, Footer, dst) tetap jelas MAKSUDNYA "nomor untuk keluhan/CS",
// walau nilainya sekarang identik -- referensi ke OPERATOR_WA_NUMBER
// (bukan string literal baru) supaya tidak diam-diam tertinggal beda lagi
// kalau nomornya berubah di masa depan.
export const CS_COMPLAINT_WA_NUMBER = OPERATOR_WA_NUMBER;

// URL Chat Pesanan in-app -- dipakai di teks notifikasi WA supaya mitra &
// klien sama-sama diarahkan ke kanal yang sama alih-alih saling tukar
// nomor pribadi (Bagian 7.2/8.2). Mitra login dulu di /mitra, klien di
// /riwayat -- keduanya sudah minta login, jadi cukup arahkan ke halaman
// dasbor masing-masing (link dalam ke order tertentu tidak diperlukan
// karena keduanya langsung melihat daftar tugas/riwayat begitu login).
const MITRA_DASHBOARD_URL = "https://kerjaku.click/mitra";
const KLIEN_RIWAYAT_URL = "https://kerjaku.click/riwayat";

/** Link tombol "Chat CS" -- ke nomor KELUHAN (manual), bukan nomor pesanan. */
export function buildCsLink(text: string = "Halo, saya ingin bertanya/menyampaikan keluhan."): string {
  return `https://wa.me/${CS_COMPLAINT_WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export type OrderInput = {
  nama: string;
  noHp: string;
  alamat: string;
  jasa: string;
  tanggal: string;
  waktu: string;
  preferensi: string;
};

/**
 * Menghasilkan teks pesan sesuai format wajib parser (#BARU) di PRD.
 * Baris ini yang nantinya dipotong oleh fungsi Node.js berdasarkan
 * baris & tanda ":" lalu disimpan ke Supabase.
 */
export function buildOrderMessage({
  nama,
  noHp,
  alamat,
  jasa,
  tanggal,
  waktu,
  preferensi,
}: OrderInput): string {
  return [
    "#BARU",
    `Nama:${nama || "-"}`,
    `NoHP:${noHp || "-"}`,
    `Alamat:${alamat || "-"}`,
    `Jasa:${jasa || "-"}`,
    `Tanggal:${tanggal || "-"}`,
    `Waktu:${waktu || "-"}`,
    `Preferensi:${preferensi || "-"}`,
  ].join("\n");
}

export function buildWaLink(message: string, phone: string = OPERATOR_WA_NUMBER): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalisasi nomor HP lokal (mis. "0812xxxxxxx" hasil parsing #BARU dari
 * webhook Fonnte) ke format yang dipahami wa.me ("62812xxxxxxx").
 * Aman dipanggil berkali-kali -- nomor yang sudah "62..." dibiarkan apa
 * adanya.
 */
export function normalizePhoneToWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/** Bikin link wa.me ke NOMOR KLIEN (bukan operator), dengan teks siap kirim.
 *  CATATAN (Bagian 7.2): fungsi ini masih dipakai untuk kasus admin/CS perlu
 *  menghubungi klien langsung (bukan mitra) -- mis. konfirmasi keluhan.
 *  Tidak lagi dipakai untuk memberi nomor klien ke mitra. */
export function buildClientWaLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhoneToWa(phone)}?text=${encodeURIComponent(message)}`;
}

/**
 * Menghasilkan kemungkinan bentuk penyimpanan satu nomor HP ("0812...",
 * "62812...") supaya query .in("customer_phone", variants) tetap
 * ketemu order lama, terlepas dari apakah webhook Fonnte menyimpannya
 * dengan awalan "0" atau "62". Dipakai oleh
 * app/api/customer/riwayat/route.ts.
 */
export function phoneLookupVariants(rawPhone: string): string[] {
  const digits = rawPhone.replace(/\D/g, "");
  const variants = new Set<string>([digits]);

  if (digits.startsWith("62")) {
    variants.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith("0")) {
    variants.add(`62${digits.slice(1)}`);
  } else {
    // Diketik tanpa awalan 0/62 (mis. langsung "812...") -- coba dua-duanya.
    variants.add(`0${digits}`);
    variants.add(`62${digits}`);
  }

  return Array.from(variants);
}

// ============================================================================
// FILE BARU (fitur "Notifikasi Klien Otomatis + Invoice Pembayaran"):
// kirim pesan WA PROAKTIF (bukan balasan webhook) lewat Fonnte.
//
// Pola kirim sama persis dengan sendFonnteReply() di
// app/api/webhook/fonnte/route.ts, SENGAJA diduplikasi di sini (bukan
// di-import-silang) supaya webhook yang sudah teruji tidak ikut berubah
// risikonya kalau fungsi ini nanti diubah lagi.
// ============================================================================

/**
 * Kirim pesan WA teks lewat Fonnte ke nomor manapun (klien, bukan cuma
 * balasan ke pengirim webhook). Dipakai untuk notifikasi otomatis "pesanan
 * disetujui" saat admin menugaskan mitra
 * (app/api/admin/orders/assign/route.ts & retry-notify/route.ts).
 *
 * TIDAK melempar exception -- selalu mengembalikan { ok, error? } supaya
 * pemanggil (mis. proses penugasan mitra) tetap dianggap berhasil walau
 * notifikasi WA gagal terkirim; kegagalan cukup dicatat untuk ditampilkan
 * ke admin.
 */
export async function sendFonnteMessage(
  target: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.FONNTE_DEVICE_TOKEN;
  if (!token) {
    return { ok: false, error: "FONNTE_DEVICE_TOKEN belum diset di environment variables." };
  }

  try {
    const body = new URLSearchParams();
    body.append("target", normalizePhoneToWa(target));
    body.append("message", message);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: token,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Fonnte HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export type OrderApprovedInput = {
  service_type: string;
  address: string;
  scheduled_date: string | null;
  preferred_time: string | null;
  total_price: number;
};

export type MitraApprovedInput = {
  name: string;
  status: "training" | "ahli" | null;
  skill_category: string[] | null;
  rating: number | null;
};

/**
 * Bangun teks notifikasi "pesanan disetujui" ke klien: detail pesanan +
 * profil singkat mitra ("ID Card sederhana", teks -- bukan gambar/PDF
 * terlampir) + info pembayaran. Dikirim otomatis lewat sendFonnteMessage()
 * begitu admin menugaskan mitra -- menggantikan alur lama (ID Card gambar +
 * invoice PDF yang harus di-unduh & dikirim manual satu per satu oleh admin).
 *
 * BARU (Bagian 7.2/8.2): ditambah pointer ke Chat Pesanan in-app supaya
 * klien juga tahu kanal resmi untuk koordinasi jadwal, bukan menunggu
 * mitra menghubungi dari nomor pribadi.
 *
 * BARU (18 September 2026) -- fitur "Standar Kualitas Bahan Baku": kalau
 * jasanya termasuk 4 varian yang punya bahan baku terstandar (lihat
 * lib/services.ts SERVICE_MATERIALS -- Kispray/Vixal/Super Pel), pesan ini
 * sekarang menyebutkan mereknya secara singkat (1 baris, tidak menambah
 * panjang pesan secara berarti) supaya klien tahu sejak konfirmasi bahwa
 * bahan yang dipakai mitra sudah teruji & sesuai standar kerjaku.click.
 */
export function buildOrderApprovedMessage(
  order: OrderApprovedInput,
  mitra: MitraApprovedInput
): string {
  const jadwal =
    order.scheduled_date && order.preferred_time
      ? `${order.scheduled_date}, jam ${order.preferred_time}`
      : "sesuai jadwal yang Anda pilih";
  const statusLabel = mitra.status === "ahli" ? "Mitra Ahli" : "Mitra Training";
  const keahlian = (mitra.skill_category ?? []).join(" · ") || "-";
  const ratingText = mitra.rating ? `⭐ ${mitra.rating.toFixed(1)}` : "Mitra baru";
  const materials = getServiceMaterials(order.service_type);
  const materialLine =
    materials && materials.length > 0
      ? `🧴 *Bahan Terstandar*: ${materials.map((m) => m.merek).join(" & ")} (sudah diuji & sesuai standar kerjaku.click)\n\n`
      : "";

  return (
    `Pesanan Anda sudah *disetujui* ✅ Mitra kami sudah ditugaskan.\n\n` +
    `📋 *Detail Pesanan*\n` +
    `Jasa: ${order.service_type}\n` +
    `Alamat: ${order.address}\n` +
    `Jadwal: ${jadwal}\n` +
    `Tarif: Rp${order.total_price.toLocaleString("id-ID")}\n\n` +
    `🧑‍🔧 *Mitra Bertugas*\n` +
    `Nama: ${mitra.name}\n` +
    `Status: ${statusLabel} (${ratingText})\n` +
    `Keahlian: ${keahlian}\n\n` +
    `💳 *Pembayaran*\n` +
    `Tunai atau transfer langsung ke mitra saat pekerjaan selesai (bukan ke rekening kerjaku.click).\n\n` +
    materialLine +
    `💬 Ada pertanyaan atau perlu ubah jadwal? Klik ikon chat 💬 yang muncul di pojok kanan bawah setiap halaman kerjaku.click (atau buka halaman *Riwayat Pesanan*, ${KLIEN_RIWAYAT_URL}) -- lebih cepat & tercatat rapi dibanding WA pribadi.\n\n` +
    `Terima kasih telah menggunakan Kerjaku.click 🤍`
  );
}

// ============================================================================
// FILE BARU (fitur "Notifikasi Mitra Otomatis"): begitu admin menugaskan
// mitra ke sebuah pesanan, mitra langsung dapat WA berisi detail tugas --
// tidak perlu buka dasbor dulu buat tahu ada tugas baru.
// Dikirim dari app/api/admin/orders/assign/route.ts & retry-notify/route.ts,
// pola sama dengan notifikasi ke klien (buildOrderApprovedMessage di atas).
//
// DIUBAH (Bagian 7.2, 18 September 2026): pesan ini DULU mencantumkan nomor
// WA klien mentah -- temuan audit fraud menunjukkan ini jadi jalur utama
// mitra menyimpan kontak klien untuk menawarkan kerja di luar platform pada
// pesanan berikutnya. Nomor klien TIDAK LAGI dicantumkan di sini; mitra
// diarahkan ke Chat Pesanan in-app (order_messages, migrasi 025) yang
// tercatat dan bisa dipantau admin untuk koordinasi jadwal/pertanyaan.
// ============================================================================

export type MitraAssignedInput = {
  service_type: string;
  address: string;
  scheduled_date: string | null;
  preferred_time: string | null;
  customer_name: string;
  /** Tidak lagi dicantumkan di teks pesan (lihat catatan Bagian 7.2 di atas)
   *  -- field dibiarkan ada di tipe ini supaya pemanggil yang sudah ada
   *  (app/api/admin/orders/assign/route.ts) tidak perlu diubah bentuk
   *  datanya, hanya isi pesannya yang berubah. */
  customer_phone: string;
};

/**
 * Bangun teks notifikasi "tugas baru" ke MITRA yang baru ditugaskan: detail
 * pesanan + nama klien (TANPA nomor WA, Bagian 7.2) + pointer ke Chat
 * Pesanan in-app untuk koordinasi jadwal.
 */
export function buildMitraAssignedMessage(order: MitraAssignedInput): string {
  const jadwal =
    order.scheduled_date && order.preferred_time
      ? `${order.scheduled_date}, jam ${order.preferred_time}`
      : "sesuai jadwal yang dipilih klien";

  return (
    `🔔 *Tugas Baru Untuk Anda*\n\n` +
    `Anda ditugaskan mengerjakan pesanan berikut:\n\n` +
    `📋 *Detail Pesanan*\n` +
    `Jasa: ${order.service_type}\n` +
    `Alamat: ${order.address}\n` +
    `Jadwal: ${jadwal}\n\n` +
    `👤 *Klien*: ${order.customer_name}\n\n` +
    `💬 Koordinasi jadwal, pertanyaan, atau perubahan sekarang lewat *Chat Pesanan* di Dasbor Mitra Anda (${MITRA_DASHBOARD_URL}) -- bukan lewat WA pribadi. Semua riwayat komunikasi tercatat di sana untuk keamanan & transparansi kedua belah pihak. Detail lengkap & invoice tugas juga ada di dasbor. Semangat bekerja! 💪`
  );
}

// ============================================================================
// FILE BARU (fitur "Tambah Waktu Kerja", diangkat dari DOK BISNIS SEPT
// 2026.pdf): konfirmasi WA ke klien begitu permintaan tambah waktu berhasil
// diproses. Dikirim dari app/api/customer/orders/[id]/extra-time/route.ts,
// SETELAH update database berhasil -- best-effort, kegagalan kirim WA tidak
// membatalkan tambah waktu yang sudah tercatat.
// ============================================================================

export type ExtraTimeAddedInput = {
  minutes: 30 | 60;
  extraPrice: number;
  newTotalPrice: number;
  serviceType: string;
};

export function buildExtraTimeAddedMessage(input: ExtraTimeAddedInput): string {
  return (
    `⏱️ *Tambah Waktu Kerja Berhasil Diajukan*\n\n` +
    `Jasa: ${input.serviceType}\n` +
    `Tambahan: +${input.minutes} menit (Rp${input.extraPrice.toLocaleString("id-ID")})\n` +
    `Total pesanan sekarang: *Rp${input.newTotalPrice.toLocaleString("id-ID")}*\n\n` +
    `Mitra kami sudah diberi tahu otomatis lewat Chat Pesanan. Catatan: tambah waktu hanya bisa diajukan sekali per pesanan (maks. 1 jam) -- kalau perlu lebih, silakan buat pesanan baru dan minta mitra yang sama.\n\n` +
    `Terima kasih telah menggunakan Kerjaku.click 🤍`
  );
}

// ============================================================================
// FILE BARU (fitur "Otomatisasi Invoice Pembayaran"): notifikasi WA ke klien
// begitu mitra menyelesaikan tugas & invoice pembayaran terbit. Dikirim dari
// app/api/mitra/orders/update/route.ts. MENGGANTIKAN alur lama "mitra unduh
// PDF lalu kirim manual sendiri via WA pribadinya" -- mitra sekarang cukup
// memberi tahu secara lisan/Chat Pesanan bahwa pekerjaan sudah selesai,
// sistem yang mengirim invoicenya (di sini + Chat Pesanan + Dasbor Klien).
// ============================================================================

export type PaymentInvoiceInput = {
  service_type: string;
  total_price: number;
  extra_time_minutes: number;
  extra_time_price: number;
};

export function buildPaymentInvoiceMessage(order: PaymentInvoiceInput, invoiceUrl: string): string {
  const extraLine =
    order.extra_time_minutes > 0
      ? `Termasuk tambah waktu +${order.extra_time_minutes} menit: Rp${order.extra_time_price.toLocaleString("id-ID")}\n`
      : "";

  return (
    `✅ *Pekerjaan Selesai* — Terima kasih sudah menggunakan Kerjaku.click!\n\n` +
    `📋 Jasa: ${order.service_type}\n` +
    extraLine +
    `💰 Total Tagihan: *Rp${order.total_price.toLocaleString("id-ID")}*\n\n` +
    `🧾 Invoice pembayaran: ${invoiceUrl}\n` +
    `(Juga bisa dilihat & diunduh kapan saja di halaman *Riwayat Pesanan* Anda: ${KLIEN_RIWAYAT_URL})\n\n` +
    `💳 Pembayaran tunai atau transfer langsung ke mitra kami sesuai kesepakatan di lokasi (bukan ke rekening kerjaku.click).\n\n` +
    `Ada pertanyaan seputar invoice ini? Chat lewat ikon 💬 di kerjaku.click.`
  );
}
