// FILE BARU: app/api/customer/logout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, destroySession } from "@/lib/customerAuth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
