import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { findServiceByLabel } from "@/lib/services";
import { requestPinReset } from "@/lib/customerAuth";

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

  if (!nama || !noHp || !alamat || !jasa) {
    return null;
  }

  return { nama, noHp, alamat, jasa, tanggal, waktu, preferensi };
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
// ========================================================================

const FAQ_PRICE_REPLY =
  `Berikut harga layanan kerjaku.click ya kak 🙏\n\n` +
  `🧺 Setrika Fast: Rp40.000 (20 pcs, ±1 jam)\n` +
  `🧺 Setrika PRO: Rp75.000 (40 pcs, ±2 jam)\n` +
  `🧹 Cleaning Fast: Rp55.000 (tipe 36/45, ±1,5 jam)\n` +
  `🧹 Cleaning PRO: Rp95.000 (tipe 50/80, ±3 jam)\n` +
  `🏍️ Cuci Motor: Rp35.000\n` +
  `🚗 Cuci Mobil: Rp75.000\n\n` +
  `Untuk pesan, langsung isi form di www.kerjaku.click ya 🤍`;

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

const FAQ_JOIN_MITRA_REPLY =
  `Mau gabung jadi Mitra kerjaku.click? Gampang, daftar langsung di www.kerjaku.click/daftar-mitra 🤍\n\n` +
  `Cocok buat ibu rumah tangga, mahasiswa akhir, guru, atau siapa saja yang mau penghasilan tambahan dengan jadwal fleksibel. Nanti tim kami hubungi untuk proses selanjutnya.`;

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
