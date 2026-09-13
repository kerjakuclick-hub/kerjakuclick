// FILE BARU: app/api/admin/google-drive/oauth-callback/route.ts
//
// Langkah 2 (terakhir) dari setup SEKALI SAJA: Google redirect ke sini
// membawa `code`, ditukar jadi REFRESH TOKEN, lalu ditampilkan di halaman
// (BUKAN disimpan otomatis -- tidak ada tempat aman untuk menyimpannya
// selain env var Vercel). Admin salin nilainya, tempel sebagai
// GOOGLE_DRIVE_REFRESH_TOKEN di Vercel, lalu redeploy. Setelah itu halaman
// ini tidak perlu dibuka lagi.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForRefreshToken } from "@/lib/googleDrive";

function htmlPage(body: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;max-width:640px;margin:0 auto;line-height:1.5;">${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return htmlPage(`<h2>Otorisasi dibatalkan</h2><p>Google mengembalikan error: ${errorParam}</p>`);
  }
  if (!code) {
    return htmlPage(
      `<h2>Kode otorisasi tidak ditemukan</h2><p>Coba ulangi dari <code>/api/admin/google-drive/oauth-start</code></p>`
    );
  }

  try {
    const refreshToken = await exchangeCodeForRefreshToken(code);
    return htmlPage(`
      <h2>✅ Berhasil</h2>
      <p>Salin nilai di bawah ini, tempel sebagai <b>GOOGLE_DRIVE_REFRESH_TOKEN</b> di Vercel
      (Project Settings → Environment Variables), lalu redeploy. Setelah itu halaman ini tidak
      perlu dibuka lagi — rahasiakan nilai ini, jangan dibagikan ke siapa pun.</p>
      <textarea readonly style="width:100%;height:90px;font-family:monospace;font-size:13px;padding:8px;box-sizing:border-box;">${refreshToken}</textarea>
    `);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menukar kode otorisasi.";
    return htmlPage(`<h2>Gagal</h2><p>${message}</p>`);
  }
}
