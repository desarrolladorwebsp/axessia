import { NextRequest, NextResponse } from "next/server";
import { portalLoginPath } from "@/lib/portal/login-redirect";

const CUSTOMER_SESSION_COOKIE = "axessia_customer_session";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (session) return NextResponse.next();

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return NextResponse.redirect(new URL(portalLoginPath(nextPath), request.url));
}

export const config = {
  matcher: ["/mi-cuenta", "/mi-cuenta/:path*"],
};
