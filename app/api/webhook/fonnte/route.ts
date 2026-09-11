import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { findServiceByLabel } from "@/lib/services";

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

function buildOrderConfirmationMessage(
  parsed: ParsedOrder,
  serviceName: string
): string {
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
  const parsed = parseOrderMessage(rawMessage);

  // Bukan format order (#BARU) — abaikan tanpa error, biar Fonnte tidak retry terus.
  // Sengaja TIDAK dibalas otomatis di sini — obrolan non-order tetap ditangani
  // manual oleh admin lewat Inbox Fonnte, sesuai alur yang sudah berjalan.
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

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

    // Order berhasil tersimpan — kirim konfirmasi spesifik ke customer.
    // Tidak di-await secara blocking terhadap kegagalan: kalau kirim gagal,
    // order tetap tercatat dan admin bisa follow up manual dari dashboard.
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

// Fonnte / uptime checker kadang melakukan GET untuk cek endpoint hidup.
export async function GET() {
  return NextResponse.json({ ok: true, service: "kerjakuclick-fonnte-webhook" });
}
