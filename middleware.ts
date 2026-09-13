import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Subdomain khusus dashboard admin — supaya sesi login admin & mitra
// tidak saling menimpa (browser memisahkan cookie per-hostname).
const ADMIN_HOST = "admin.kerjaku.click";

export async function middleware(request: NextRequest) {
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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/).*)"],
};
