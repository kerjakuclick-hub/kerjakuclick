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

function parseOrderMessage(raw: string) {
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

export async function POST(req: NextRequest) {
  let body: FonnteWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const rawMessage = body.message ?? "";
  const parsed = parseOrderMessage(rawMessage);

  // Bukan format order (#BARU) — abaikan tanpa error, biar Fonnte tidak retry terus.
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
