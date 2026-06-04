import { NextResponse } from "next/server";

const ALLOWED_PATHS = new Set(["/waitlist"]);
const LAUNCH_MODE = process.env.LAUNCH_MODE;

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (LAUNCH_MODE !== "waitlist") {
    return NextResponse.next();
  }

  if (ALLOWED_PATHS.has(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const waitlistUrl = new URL("/waitlist", request.url);
  return NextResponse.redirect(waitlistUrl);
}

export const config = {
  matcher: "/:path*",
};
