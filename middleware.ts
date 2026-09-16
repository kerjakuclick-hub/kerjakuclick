import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Subdomain khusus dashboard admin — supaya sesi login admin & mitra
// tidak saling menimpa (browser memisahkan cookie per-hostname).
const ADMIN_HOST = "admin.kerjaku.click";

// ============================================================================
// MODE MAINTENANCE (SEMENTARA) — audit fraud mitra, September 2026
//
// Ditemukan pola mitra menerima order tambahan di luar sistem dengan cara
// sengaja tidak menekan "Mulai Kerja" supaya jam kerja tampak kosong,
// sementara sebenarnya sedang mengerjakan order lain yang di-deal langsung
// (di luar sistem, di luar harga resmi). Selama audit & perbaikan SOP +
// sistem anti-fraud berjalan, SELURUH akses ke website (termasuk dashboard
// admin & mitra, dan semua endpoint API) diblokir untuk semua orang —
// termasuk order yang statusnya sedang berjalan (assigned/working) ikut
// dibekukan, tidak bisa diupdate lewat aplikasi sampai maintenance selesai.
//
// Cara mengaktifkan/menonaktifkan: env var MAINTENANCE_MODE = "true" / "false"
// (di Vercel Project Settings -> Environment Variables, lalu redeploy, ATAU
// pakai Instant Rollback/redeploy setelah ubah env var).
//
// Cara admin tetap bisa masuk selama maintenance (untuk audit & kerja
// perbaikan): buka sekali di browser Anda:
//   https://kerjaku.click/?bypass=<MAINTENANCE_BYPASS_SECRET>
//   https://admin.kerjaku.click/?bypass=<MAINTENANCE_BYPASS_SECRET>
// (dua domain terpisah, jadi perlu dibuka SEKALI di masing-masing). Ini
// menyimpan cookie khusus di browser Anda yang melewati blokir maintenance.
// JANGAN bagikan link ini ke siapa pun di luar tim internal.
// ============================================================================

const MAINTENANCE_BYPASS_COOKIE = "kk_maintenance_bypass";

function handleMaintenanceMode(request: NextRequest): NextResponse | null {
  const isMaintenanceOn = process.env.MAINTENANCE_MODE === "true";
  if (!isMaintenanceOn) return null;

  const { pathname } = request.nextUrl;
  const bypassSecret = process.env.MAINTENANCE_BYPASS_SECRET;

  // 1) Aktivasi bypass: ?bypass=<secret> -> simpan cookie, lalu redirect ke
  //    URL bersih (supaya secret tidak nyangkut di address bar/history).
  const bypassParam = request.nextUrl.searchParams.get("bypass");
  if (bypassSecret && bypassParam && bypassParam === bypassSecret) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("bypass");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(MAINTENANCE_BYPASS_COOKIE, bypassSecret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
    });
    return res;
  }

  // 2) Sudah punya cookie bypass yang valid -> lewati blokir sepenuhnya.
  const cookieBypass = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value;
  if (bypassSecret && cookieBypass === bypassSecret) {
    return null;
  }

  // 3) Halaman /maintenance sendiri (dan asetnya) harus tetap bisa diakses,
  //    supaya pengunjung publik lihat pesannya, bukan malah error/looping.
  if (pathname === "/maintenance") {
    return null;
  }

  // 4) Pengecualian: webhook Fonnte (/api/webhook/fonnte) TIDAK diblokir di
  //    sini -- kalau ikut diblokir, pelanggan yang chat ke WA pesanan selama
  //    maintenance akan didiamkan total (kelihatan seperti nomor mati),
  //    padahal ini bukan endpoint publik yang bisa diakses langsung dari
  //    website (hanya dipanggil server Fonnte). Route handler-nya sendiri
  //    yang mengecek MAINTENANCE_MODE dan membalas "sedang maintenance"
  //    tanpa membuat order baru -- lihat app/api/webhook/fonnte/route.ts.
  if (pathname === "/api/webhook/fonnte") {
    return null;
  }

  // 5) API lainnya: jawab 503 JSON singkat -- mencegah order/aksi apa pun
  //    dibuat langsung lewat API walau UI sudah diblokir.
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      {
        error:
          "Layanan sedang dalam pemeliharaan sistem sementara. Silakan coba lagi nanti.",
      },
      { status: 503 }
    );
  }

  // 6) Semua halaman lain -> tampilkan halaman maintenance (rewrite, supaya
  //    URL di address bar pengunjung tidak berubah).
  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.search = "";
  return NextResponse.rewrite(maintenanceUrl);
}

export async function middleware(request: NextRequest) {
  const maintenanceResponse = handleMaintenanceMode(request);
  if (maintenanceResponse) return maintenanceResponse;

  const pathname = request.nextUrl.pathname;

  // Endpoint API menangani otentikasi & otorisasinya sendiri di masing-masing
  // route handler (lihat createClient + auth.getUser() + cek role di tiap
  // file di app/api/**) -- middleware tidak perlu ikut campur lagi di luar
  // cek maintenance di atas, supaya tidak dobel query auth untuk tiap
  // request API.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";
  const isAdminHost = host === ADMIN_HOST;

  // Kalau ada yang masih buka /admin lewat domain lama (www/apex),
  // arahkan ke subdomain admin yang baru supaya link/bookmark lama tetap jalan.
  if (!isAdminHost && request.nextUrl.pathname.startsWith("/admin")) {
    const redirectUrl = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `https://${ADMIN_HOST}`
    );
    return NextResponse.redirect(redirectUrl, 307);
  }

  // Di subdomain admin, "/" secara internal berarti "/admin" (halaman dashboard-nya).
  // Path lain (mis. /admin/mitra dari Link internal) dibiarkan apa adanya.
  const effectivePathname =
    isAdminHost && request.nextUrl.pathname === "/" ? "/admin" : request.nextUrl.pathname;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = effectivePathname.startsWith("/admin");
  const isMitraRoute = effectivePathname.startsWith("/mitra");

  if (isAdminRoute || isMitraRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", effectivePathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (isAdminRoute && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (isMitraRoute && profile?.role !== "mitra") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Baru setelah lolos pengecekan auth, lakukan rewrite internal "/" -> "/admin"
  // di subdomain admin (bukan redirect, jadi URL di address bar tetap bersih).
  if (isAdminHost && request.nextUrl.pathname === "/") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/admin";
    const rewriteResponse = NextResponse.rewrite(rewriteUrl);
    response.cookies.getAll().forEach((cookie) => rewriteResponse.cookies.set(cookie));
    return rewriteResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
