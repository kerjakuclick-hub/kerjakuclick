import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { findServiceByLabel, services, formatRupiah } from "@/lib/services";
import { requestPinReset } from "@/lib/customerAuth";
import {
  buildMitraRegistrationReply,
  buildMitraRegistrationClosedReply,
  buildTopupInstructionsReply,
  buildTopupReceivedReply,
  buildTopupUnknownSenderReply,
  extractTopupAmount,
  phoneLookupVariants,
} from "@/lib/whatsapp";

// ========================================================================
// BARU (25 September 2026) -- menu Salam WA Bisnis (0811-4110-9567):
//   1 Konfirmasi pesanan  -> sudah otomatis lewat alur order web (#BARU)
//   2 Keluhan pelanggan   -> FAQ otomatis; keluhan berat ditangani manual
//   3 Daftar mitra        -> balasan otomatis link pendaftaran (DI SINI)
//   4 Top up saldo        -> instruksi / konfirmasi otomatis (DI SINI);
//                            notifikasi "saldo masuk" dikirim dari
//                            app/api/admin/mitra/topup/route.ts
// ========================================================================

/** Normalisasi pesan pendek: huruf kecil, tanpa tanda baca/emoji di ujung. */
function normalizeShort(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

// Calon mitra: "daftar", "daftar mitra", angka menu "3", atau tanya
// lowongan/jadi mitra (materi iklan lowongan mengarahkan ke nomor ini).
// SENGAJA tidak menangkap kata "mitra" sendirian -- klien yang menulis
// "mitra saya belum datang" itu keluhan, bukan calon mitra.
const MITRA_REGISTRATION_PATTERN =
  /\b(lowongan|loker|lamar|melamar|lamaran|rekrut|rekrutmen)\b|\b(jadi|gabung|daftar|syarat|cara)\b.{0,20}\bmitra\b|\bmitra\b.{0,15}\b(jadi|gabung|daftar)\b/i;

function isMitraRegistrationRequest(raw: string): boolean {
  const short = normalizeShort(raw);
  if (short === "3" || short === "daftar" || short === "daftar mitra") return true;
  return MITRA_REGISTRATION_PATTERN.test(raw);
}

// Top up: pesan berisi "topup"/"top up"/"isi saldo"/"tambah saldo"
// (biasanya caption foto bukti transfer), atau angka menu "4".
const TOPUP_PATTERN = /\btop\s*-?\s*up\b|\b(isi|tambah)\s+saldo\b/i;

function isTopupMenu(raw: string): boolean {
  return normalizeShort(raw) === "4";
}

function isTopupRequest(raw: string): boolean {
  return TOPUP_PATTERN.test(raw);
}

/** Cari profil MITRA dari nomor pengirim WA (format 62.../0...). */
async function findMitraBySender(sender: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, wallet_balance, role")
    .in("phone", phoneLookupVariants(sender))
    .eq("role", "mitra")
    .limit(1);
  return data?.[0] ?? null;
}

/** Balas pesan top up: konfirmasi kalau pengirim mitra terdaftar. */
async function handleTopup(sender: string, raw: string) {
  const mitra = await findMitraBySender(sender);
  if (!mitra) {
    await sendFonnteReply(sender, buildTopupUnknownSenderReply());
    return "unknown_sender";
  }
  await sendFonnteReply(
    sender,
    buildTopupReceivedReply({
      mitraName: mitra.name,
      currentBalance: Number(mitra.wallet_balance ?? 0),
      amount: extractTopupAmount(raw),
    })
  );
  return "received";
}

// Bentuk payload webhook Fonnte untuk pesan masuk (lihat docs.fonnte.com).
// Field yang relevan buat kita: sender, message, name, device.
type FonnteWebhookBody = {
  device?: string;
  sender?: string;
  message?: string;
  name?: string;
  [key: string]: unknown;
};

type ParsedOrder = {
  nama: string;
  noHp: string;
  alamat: string;
  jasa: string;
  tanggal?: string;
  waktu?: string;
  preferensi?: string;
  // BARU -- migrasi 037 (revisi Formulir Pesanan, 23 September 2026): cuma
  // ada di pesan WA untuk order Les Private (lihat lib/whatsapp.ts
  // buildOrderMessage) -- undefined untuk Setrika/Bersihkan Rumah.
  tingkatPendidikan?: string;
};

function parseOrderMessage(raw: string): ParsedOrder | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0 || lines[0].toUpperCase() !== "#BARU") {
    return null;
  }

  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    fields[key] = value;
  }

  const nama = fields["nama"];
  const noHp = fields["nohp"];
  const alamat = fields["alamat"];
  const jasa = fields["jasa"];
  const tanggal = fields["tanggal"];
  const waktu = fields["waktu"];
  const preferensi = fields["preferensi"];
  const tingkatPendidikan = fields["tingkatpendidikan"];

  if (!nama || !noHp || !alamat || !jasa) {
    return null;
  }

  return { nama, noHp, alamat, jasa, tanggal, waktu, preferensi, tingkatPendidikan };
}

// Deteksi permintaan reset PIN: kombinasi kata "reset"/"lupa" + "pin"/"sandi"/"password".
const RESET_PIN_PATTERN = /\b(reset|lupa|ganti)\b.{0,15}\b(pin|sandi|password)\b/i;

function isResetPinRequest(raw: string): boolean {
  return RESET_PIN_PATTERN.test(raw);
}

// ========================================================================
// FAQ auto-reply — HANYA untuk pertanyaan faktual yang jawabannya tetap
// (harga, jam operasional, cara pesan, cara jadi mitra). SENGAJA TIDAK
// dipakai untuk keluhan/komplain — itu tetap harus dijawab manual oleh
// admin, bukan auto-reply, supaya tidak terasa dingin/tidak peduli.
//
// Urutan array ini penting: dicek dari atas ke bawah, yang pertama cocok
// yang dipakai. "Mitra" dicek paling awal supaya tidak ketimpa pattern lain
// yang lebih umum (mis. "cara jadi mitra" jangan sampai kena pattern harga).
//
// PERBAIKAN BESAR (20 September 2026) -- migrasi "3 Pilar Layanan": teks
// balasan harga ini SEMPAT ketinggalan beberapa kali update harga
// sebelumnya (masih Rp40rb/Rp75rb/Rp55rb/Rp95rb, padahal lib/services.ts
// sudah Rp55rb/Rp85rb/Rp65rb/Rp100rb sejak 18 September) -- angka di bawah
// disamakan lagi PERSIS dengan lib/services.ts. Baris Cuci Motor/Cuci Mobil
// DIHAPUS (layanan ini dihapus total dari sistem), diganti baris Les
// Private (sekarang jasa yang bisa dipesan langsung).
//
// PERBAIKAN PERMANEN (22 September 2026) -- harga NAIK LAGI (dokumen final
// "Logika Hitung Harga Jual Paket") dan teks ini KETINGGALAN LAGI untuk
// ketiga kalinya sebelum sempat dites -- pola yang sama persis dengan
// peringatan di paragraf atas. Daripada menulis ulang angka manual (yang
// terbukti berulang kali lupa disinkron), FAQ_PRICE_REPLY SEKARANG DIHITUNG
// OTOMATIS dari `services` di lib/services.ts -- kalau harga/durasi berubah
// lagi di sana, balasan WA ini OTOMATIS ikut berubah, TIDAK PERLU diedit
// manual di sini lagi.
// ========================================================================

function faqPriceLine(emoji: string, label: string, serviceId: string): string {
  const variant = services.find((s) => s.id === serviceId);
  if (!variant) return ""; // aman kalau id-nya suatu saat dihapus/berubah
  return `${emoji} ${label}: ${formatRupiah(variant.price)} (${variant.unit}, ±${variant.duration})\n`;
}

const FAQ_PRICE_REPLY =
  `Berikut harga layanan kerjaku.click ya kak 🙏\n\n` +
  faqPriceLine("🧺", "Setrika Fast", "setrika-fast") +
  faqPriceLine("🧺", "Setrika PRO", "setrika-pro") +
  faqPriceLine("🧹", "Cleaning Fast", "cleaning-fast") +
  faqPriceLine("🧹", "Cleaning PRO", "cleaning-pro") +
  // Les Private: harga/durasi SAMA utk ke-7 mata pelajaran (lihat
  // lesPrivateVariants di lib/services.ts) -- cukup ambil 1 (Mengaji)
  // sebagai representasi, tidak perlu daftar semua mata pelajaran di sini.
  faqPriceLine("📚", "Les Private Fast", "les-mengaji-fast") +
  faqPriceLine("📚", "Les Private PRO", "les-mengaji-pro") +
  `\nUntuk pesan, langsung isi form di www.kerjaku.click ya 🤍`;

const FAQ_HOURS_REPLY =
  `Jam operasional kerjaku.click: *07.00–20.00 WITA*, setiap hari 🙏\n\n` +
  `Di luar jam itu, pesanan tetap otomatis tercatat sistem kami — nanti diproses begitu tim kami online lagi.`;

const FAQ_HOW_TO_ORDER_REPLY =
  `Cara pesan gampang banget kak:\n\n` +
  `1️⃣ Buka www.kerjaku.click\n` +
  `2️⃣ Pilih jasa & isi form (nama, alamat, jadwal)\n` +
  `3️⃣ Klik "Pesan Sekarang" — otomatis kebuka WhatsApp dengan pesan siap kirim\n` +
  `4️⃣ Tinggal kirim, sistem kami langsung proses & kasih konfirmasi\n\n` +
  `Coba langsung di www.kerjaku.click ya 🤍`;

// 25 Sep 2026: disamakan dengan balasan "daftar" (lib/whatsapp.ts) --
// praktis tidak terpakai lagi karena Jalur 2c menangkap pertanyaan mitra
// lebih dulu, dibiarkan sebagai cadangan.
const FAQ_JOIN_MITRA_REPLY = buildMitraRegistrationReply();

const FAQ_PATTERNS: Array<{ test: RegExp; reply: string }> = [
  {
    // "jadi mitra", "gabung mitra", "daftar mitra", "cara jadi mitra", dst.
    test: /\b(jadi|gabung|daftar)\b.{0,15}\bmitra\b|\bmitra\b.{0,15}\b(jadi|gabung|daftar)\b/i,
    reply: FAQ_JOIN_MITRA_REPLY,
  },
  {
    // "harga", "tarif", "biaya" — dicek sebelum "cara pesan" supaya
    // "berapa harga buat pesan" tetap kena harga, bukan cara-pesan.
    test: /\b(harga|tarif|biaya)\b/i,
    reply: FAQ_PRICE_REPLY,
  },
  {
    // "jam operasional/buka/kerja/layanan", "kapan buka/online"
    test: /\bjam\b.{0,10}\b(operasional|buka|kerja|layanan)\b|\bkapan\b.{0,10}\b(buka|online)\b/i,
    reply: FAQ_HOURS_REPLY,
  },
  {
    // "cara pesan/order/booking", "gimana pesan/order"
    test: /\bcara\b.{0,10}\b(pesan|order|booking)\b|\bgimana\b.{0,10}\b(pesan|order)\b/i,
    reply: FAQ_HOW_TO_ORDER_REPLY,
  },
];

function matchFaq(raw: string): string | null {
  for (const { test, reply } of FAQ_PATTERNS) {
    if (test.test(raw)) return reply;
  }
  return null;
}

/**
 * Kirim balasan WA lewat Fonnte (https://docs.fonnte.com/kirim-pesan-api-dengan-javascript).
 * - Endpoint: https://api.fonnte.com/send
 * - Body: x-www-form-urlencoded, field "target" & "message"
 * - Header: Authorization diisi TOKEN LANGSUNG (bukan "Bearer <token>")
 *
 * `target` dipakai apa adanya dari `sender` webhook — sender Fonnte sudah
 * dalam format internasional lengkap (mis. "6285284415992"), jadi tidak
 * perlu parameter countryCode.
 *
 * Kegagalan kirim balasan TIDAK menggagalkan response webhook — order sudah
 * tersimpan duluan, jadi ini cuma di-log supaya tidak bikin Fonnte retry
 * webhook (yang bisa memicu order dobel kalau tidak hati-hati).
 */
async function sendFonnteReply(target: string, message: string) {
  const token = process.env.FONNTE_DEVICE_TOKEN;
  if (!token) {
    console.error("FONNTE_DEVICE_TOKEN belum diset di environment variables — balasan tidak terkirim.");
    return;
  }

  try {
    const body = new URLSearchParams();
    body.append("target", target);
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
      console.error("Gagal kirim balasan Fonnte:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Error saat kirim balasan Fonnte:", err);
  }
}

function buildOrderConfirmationMessage(parsed: ParsedOrder, serviceName: string): string {
  const jadwal =
    parsed.tanggal && parsed.waktu
      ? `tanggal ${parsed.tanggal}, jam ${parsed.waktu}`
      : "sesuai jadwal yang Anda pilih";

  return (
    `Pesanan Anda diterima ya kak ✅\n\n` +
    `Jasa: ${serviceName}\n` +
    `Untuk: ${parsed.nama}\n` +
    `Jadwal: ${jadwal}\n\n` +
    `Mitra akan segera ditugaskan sesuai jadwal ini. ` +
    `Kami kabari lagi di sini begitu mitra dikonfirmasi 🤍`
  );
}

function buildOtpMessage(otp: string): string {
  return (
    `Kode OTP reset PIN kamu: *${otp}*\n` +
    `Berlaku 10 menit, hanya bisa dipakai 1x.\n\n` +
    `Buka www.kerjaku.click/reset-pin, masukkan nomor WA ini + kode OTP di atas untuk membuat PIN baru.\n\n` +
    `⚠️ Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku dari kerjaku.click.`
  );
}

export async function POST(req: NextRequest) {
  // Verifikasi token rahasia di URL — tanpa ini, siapa pun di internet yang
  // tahu alamat endpoint ini bisa mengirim data order palsu langsung ke
  // database. Fonnte tidak menandatangani webhook-nya, jadi kita yang
  // menambahkan lapisan verifikasi sendiri lewat query param di URL.
  const expectedSecret = process.env.FONNTE_WEBHOOK_SECRET;
  const providedSecret = req.nextUrl.searchParams.get("secret");

  if (!expectedSecret) {
    console.error("FONNTE_WEBHOOK_SECRET belum diset di environment variables.");
    return NextResponse.json({ ok: false, reason: "server_misconfigured" }, { status: 500 });
  }
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: FonnteWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const rawMessage = body.message ?? "";
  const sender = body.sender ?? "";

  // --- Mode Maintenance (sementara, audit fraud mitra -- lihat middleware.ts) ---
  // Endpoint ini SENGAJA dikecualikan dari blokir 503 umum di middleware,
  // supaya pelanggan yang chat WA pesanan tidak didiamkan total (terlihat
  // seperti nomor mati). Tapi selama maintenance, TIDAK ada order baru yang
  // disimpan, TIDAK ada FAQ auto-reply, TIDAK ada reset PIN -- semua pesan
  // masuk cukup dibalas 1 pesan singkat pemberitahuan maintenance.
  if (process.env.MAINTENANCE_MODE === "true") {
    // BARU (25 Sep 2026): top up saldo mitra TETAP dilayani selama
    // maintenance (dasbor mitra & admin juga tetap buka), dan calon mitra
    // dapat info bahwa pendaftaran sedang ditutup sementara.
    if (sender && isTopupMenu(rawMessage)) {
      await sendFonnteReply(sender, buildTopupInstructionsReply());
      return NextResponse.json({ ok: true, maintenance: true, topup: "instructions" });
    }
    if (sender && isTopupRequest(rawMessage)) {
      const result = await handleTopup(sender, rawMessage);
      return NextResponse.json({ ok: true, maintenance: true, topup: result });
    }
    if (sender && isMitraRegistrationRequest(rawMessage)) {
      await sendFonnteReply(sender, buildMitraRegistrationClosedReply());
      return NextResponse.json({ ok: true, maintenance: true, mitra_registration: "closed" });
    }
    if (sender) {
      await sendFonnteReply(
        sender,
        "Mohon maaf kak 🙏 kerjaku.click sedang dalam pemeliharaan sistem sementara, jadi belum bisa menerima pesanan baru dulu. Silakan coba lagi dalam waktu dekat ya. Untuk pesanan yang sudah berjalan sebelumnya, mohon ditunggu — tim kami akan menghubungi langsung kalau ada info penting."
      );
    }
    return NextResponse.json({ ok: true, maintenance: true });
  }

  // --- Jalur 1: format order #BARU (logic asli, tidak diubah) ---
  const parsed = parseOrderMessage(rawMessage);
  if (parsed) {
    const matchedService = findServiceByLabel(parsed.jasa);

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("orders").insert({
        customer_name: parsed.nama,
        customer_phone: parsed.noHp,
        address: parsed.alamat,
        service_type: matchedService?.name ?? parsed.jasa,
        total_price: matchedService?.price ?? 0,
        scheduled_date: parsed.tanggal ?? null,
        preferred_time: parsed.waktu ?? null,
        mitra_gender_preference: parsed.preferensi ?? null,
        // BARU -- migrasi 037: cuma terisi untuk order Les Private, lihat
        // catatan ParsedOrder.tingkatPendidikan di atas.
        les_private_level: parsed.tingkatPendidikan ?? null,
        status: "unassigned",
      });

      if (error) {
        console.error("Gagal insert order:", error.message);
        return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
      }

      await sendFonnteReply(
        parsed.noHp,
        buildOrderConfirmationMessage(parsed, matchedService?.name ?? parsed.jasa)
      );

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
    }
  }

  // --- Jalur 2: permintaan reset PIN ---
  if (isResetPinRequest(rawMessage)) {
    try {
      const result = await requestPinReset(sender);

      if (!result.ok && result.reason === "not_found") {
        await sendFonnteReply(
          sender,
          "Nomor WA ini belum terdaftar sebagai pelanggan kerjaku.click. Kalau mau pesan, daftar dulu di www.kerjaku.click 🙏"
        );
        return NextResponse.json({ ok: true, reset_pin: "not_found" });
      }

      if (!result.ok && result.reason === "cooldown") {
        const minutes = Math.ceil(result.waitSeconds / 60);
        await sendFonnteReply(
          sender,
          `Kamu baru saja minta reset PIN. Cek WA untuk kode OTP sebelumnya, atau coba lagi dalam ${minutes} menit ya.`
        );
        return NextResponse.json({ ok: true, reset_pin: "cooldown" });
      }

      if (result.ok) {
        await sendFonnteReply(sender, buildOtpMessage(result.otp));
        return NextResponse.json({ ok: true, reset_pin: "sent" });
      }

      return NextResponse.json({ ok: true, reset_pin: "unknown" });
    } catch (err) {
      console.error("Reset PIN error:", err);
      return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
    }
  }

  // --- Jalur 2b (BARU 25 Sep 2026): menu "4" / top up saldo mitra ---
  // Dicek SEBELUM pendaftaran mitra & FAQ supaya "topup 50000" tidak
  // tertangkap pola lain.
  if (sender && isTopupMenu(rawMessage)) {
    await sendFonnteReply(sender, buildTopupInstructionsReply());
    return NextResponse.json({ ok: true, topup: "instructions" });
  }
  if (sender && isTopupRequest(rawMessage)) {
    try {
      const result = await handleTopup(sender, rawMessage);
      return NextResponse.json({ ok: true, topup: result });
    } catch (err) {
      console.error("Top up auto-reply error:", err);
      return NextResponse.json({ ok: true, topup: "error" });
    }
  }

  // --- Jalur 2c (BARU 25 Sep 2026): "daftar" / menu "3" / tanya jadi mitra ---
  if (sender && isMitraRegistrationRequest(rawMessage)) {
    await sendFonnteReply(sender, buildMitraRegistrationReply());
    return NextResponse.json({ ok: true, mitra_registration: "sent" });
  }

  // --- Jalur 3: FAQ (harga, jam operasional, cara pesan, cara jadi mitra) ---
  // Sengaja TIDAK menyentuh kata-kata yang terkesan komplain/masalah — kalau
  // pesan tidak cocok salah satu pattern FAQ di atas, jatuh ke Jalur 4
  // (diabaikan, ditangani manual admin) — termasuk semua keluhan.
  const faqReply = matchFaq(rawMessage);
  if (faqReply) {
    await sendFonnteReply(sender, faqReply);
    return NextResponse.json({ ok: true, faq: "sent" });
  }

  // --- Jalur 4: bukan order, bukan reset PIN, bukan FAQ — abaikan tanpa
  // error, biar Fonnte tidak retry terus. Ini termasuk keluhan/komplain:
  // SENGAJA tidak dibalas otomatis, tetap ditangani manual oleh admin
  // lewat Inbox Fonnte, karena komplain butuh respons manusiawi. ---
  return NextResponse.json({ ok: true, ignored: true });
}

// Fonnte / uptime checker kadang melakukan GET untuk cek endpoint hidup.
export async function GET() {
  return NextResponse.json({ ok: true, service: "kerjakuclick-fonnte-webhook" });
}
