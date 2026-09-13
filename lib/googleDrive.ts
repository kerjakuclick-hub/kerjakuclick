// FILE BARU: lib/googleDrive.ts
//
// Integrasi Google Drive TANPA paket googleapis -- cukup pakai fetch biasa
// ke REST API Google (pola sama seperti lib/whatsapp.ts untuk Fonnte),
// supaya tidak perlu `npm install` paket baru.
//
// Dipakai untuk fitur "Arsip Invoice Pembayaran ke Google Drive": setiap
// invoice pembayaran yang terbit (mitra klik "Selesaikan Tugas") otomatis
// disalin ke SATU folder Drive khusus, supaya admin punya arsip terpusat
// untuk audit -- terpisah dari file yang mitra kirim sendiri ke klien,
// jadi tidak bisa diam-diam diganti/dipalsukan mitra.
//
// Env vars yang dibutuhkan (lihat "Panduan Setup Arsip Google Drive"):
//   GOOGLE_DRIVE_CLIENT_ID      -- dari OAuth Client ID di Google Cloud Console
//   GOOGLE_DRIVE_CLIENT_SECRET  -- idem
//   GOOGLE_DRIVE_REDIRECT_URI   -- harus PERSIS sama dengan yang didaftarkan di Google Cloud Console
//   GOOGLE_DRIVE_REFRESH_TOKEN  -- didapat SEKALI lewat alur oauth-start -> oauth-callback
//   GOOGLE_DRIVE_FOLDER_ID      -- ID folder tujuan di Drive (dari URL folder-nya)

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
// Scope "drive.file" SENGAJA dipilih (bukan scope "drive" penuh) -- aplikasi
// cuma bisa akses file yang dia sendiri buat lewat API ini, tidak bisa
// membaca seluruh isi Drive akun Anda.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum diset di environment variables.`);
  return value;
}

/** Bangun URL consent screen Google -- dibuka admin SEKALI saat setup awal
 * lewat app/api/admin/google-drive/oauth-start/route.ts. */
export function buildGoogleAuthUrl(): string {
  const clientId = requireEnv("GOOGLE_DRIVE_CLIENT_ID");
  const redirectUri = requireEnv("GOOGLE_DRIVE_REDIRECT_URI");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Tukar authorization code (dari redirect Google) jadi refresh token --
 * HANYA dipanggil sekali saat setup awal lewat
 * app/api/admin/google-drive/oauth-callback/route.ts. */
export async function exchangeCodeForRefreshToken(code: string): Promise<string> {
  const clientId = requireEnv("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_DRIVE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_DRIVE_REDIRECT_URI");

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok || !data.refresh_token) {
    throw new Error(
      `Gagal tukar authorization code: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }
  return data.refresh_token as string;
}

/** Tukar refresh token (env var, permanen) jadi access token sementara
 * (berlaku ~1 jam) -- dipanggil setiap kali mau upload file baru. */
async function getAccessToken(): Promise<string> {
  const clientId = requireEnv("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_DRIVE_CLIENT_SECRET");
  const refreshToken = requireEnv("GOOGLE_DRIVE_REFRESH_TOKEN");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Gagal ambil access token Google Drive: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }
  return data.access_token as string;
}

/**
 * Upload satu file PDF ke folder Drive khusus (GOOGLE_DRIVE_FOLDER_ID) --
 * dipakai sebagai ARSIP AUDIT invoice pembayaran, terpisah dari Supabase
 * Storage yang tetap jadi sumber utama link "Unduh Invoice" di dashboard
 * mitra.
 *
 * TIDAK melempar exception ke pemanggil kalau env var belum lengkap/gagal --
 * mengembalikan { ok: false, error } supaya invoice tetap dianggap berhasil
 * terbit walau arsip Drive-nya gagal (mis. saat setup awal belum selesai).
 */
export async function archiveInvoiceToDrive(
  fileName: string,
  buffer: Buffer
): Promise<{ ok: true; fileId: string; webViewLink: string | null } | { ok: false; error: string }> {
  try {
    const folderId = requireEnv("GOOGLE_DRIVE_FOLDER_ID");
    const accessToken = await getAccessToken();

    const boundary = `kerjakuclick-${Date.now()}`;
    const metadata = { name: fileName, parents: [folderId] };

    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
          metadata
        )}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch(`${UPLOAD_ENDPOINT}&fields=id,webViewLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      return { ok: false, error: data.error?.message ?? JSON.stringify(data) };
    }

    return { ok: true, fileId: data.id, webViewLink: data.webViewLink ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
