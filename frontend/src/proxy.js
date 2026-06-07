import { NextResponse } from "next/server";

const ALLOWED_EXACT_PATHS = new Set(["/waitlist", "/favicon.ico"]);
const ALLOWED_PREFIXES = ["/_next", "/images", "/icons", "/fonts"];

export default function proxy(request) {
  if (process.env.WAITLIST_ONLY !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const isAllowedPath =
    ALLOWED_EXACT_PATHS.has(pathname) ||
    ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isAllowedPath) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/waitlist", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
