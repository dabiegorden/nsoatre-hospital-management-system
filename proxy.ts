import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

export default async function Proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const path = request.nextUrl.pathname;

  console.log(`[Proxy] Path: ${path}, Token found: ${!!token}`);

  // Protect all dashboard routes
  if (path.startsWith("/dashboard")) {
    if (!token) {
      console.log("[Proxy] No token, redirecting...");
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Await the async jose verifier
    const payload = await verifyToken(token);

    if (!payload) {
      console.log("[Proxy] Invalid token");
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("auth-token");
      return response;
    }

    if (payload.role !== "admin") {
      console.log("[Proxy] Not admin, redirecting...");
      return NextResponse.redirect(new URL("/", request.url));
    }

    console.log("[Proxy] ✅ Access granted for admin");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/", "/register"],
};
