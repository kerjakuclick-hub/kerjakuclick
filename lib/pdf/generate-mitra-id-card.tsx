// FILE BARU: lib/pdf/generate-mitra-id-card.tsx
//
// Generate gambar ID Card mitra (PNG) secara dinamis memakai next/og
// (ImageResponse / Satori) -- selalu dari data profiles terbaru, bukan
// gambar yang di-generate sekali lalu disimpan.
//
// Dipanggil dari app/api/admin/mitra/id-card/route.ts. Kartu ini dibuka
// admin lalu dilampirkan MANUAL saat kirim WA ke klien -- konsisten dengan
// alur invoice yang sudah ada (semi-manual, bukan otomatis via Fonnte).
//
// Catatan Satori: setiap elemen yang punya lebih dari satu anak WAJIB
// diberi display:"flex" secara eksplisit, kalau tidak akan error saat
// render. Font pakai default sans-serif bawaan Satori (cukup untuk kartu
// internal ini, tidak perlu load font custom).

import { ImageResponse } from "next/og";

export interface MitraIdCardData {
  name: string;
  photo_url: string | null;
  skill_category: string[] | null;
  status: string | null; // "training" | "ahli"
}

const STATUS_LABEL: Record<string, string> = {
  training: "Mitra Training",
  ahli: "Mitra Ahli",
};

export function generateMitraIdCardImage(mitra: MitraIdCardData) {
  const skills = (mitra.skill_category ?? []).join(" · ") || "Belum ada keahlian tercatat";
  const statusLabel = STATUS_LABEL[mitra.status ?? ""] ?? "Mitra";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#12202A",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px 36px 12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#F5B324" }}>
              kerjaku.click
            </span>
            <span style={{ fontSize: 13, color: "#ffffffaa" }}>PT. Kerjaku Bangun Negeri</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#1D6F8C",
              padding: "8px 16px",
              borderRadius: 999,
            }}
          >
            {/* Checkmark digambar sebagai SVG, bukan karakter unicode "✓" --
                font default Satori tidak selalu punya glyph itu dan malah
                tampil sebagai kotak kosong. */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 15, color: "#ffffff", fontWeight: 700 }}>
              Mitra Terverifikasi
            </span>
          </div>
        </div>

        {/* Body: foto + info */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            padding: "16px 36px 36px",
            gap: 32,
          }}
        >
          {mitra.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mitra.photo_url}
              width={170}
              height={170}
              style={{
                borderRadius: 24,
                objectFit: "cover",
                border: "4px solid #1D6F8C",
              }}
            />
          ) : (
            <div
              style={{
                width: 170,
                height: 170,
                borderRadius: 24,
                background: "#1D6F8C33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 60,
                color: "#1D6F8C",
                fontWeight: 700,
              }}
            >
              {mitra.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "#ffffff" }}>{mitra.name}</span>
            <span style={{ fontSize: 17, color: "#F5B324", fontWeight: 600 }}>{skills}</span>
            <span style={{ fontSize: 14, color: "#ffffffcc" }}>{statusLabel}</span>
            <span style={{ fontSize: 12, color: "#ffffff77", marginTop: 8 }}>
              ID Mitra Kerjaku.click · Identitas resmi petugas di lapangan
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 820,
      height: 420,
    }
  );
}
