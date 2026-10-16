import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";
import { canManageUsers, isRole } from "./lib/roles";

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

    // Tokens from before the admin/staff roles (role "user") must log in again.
    if (!payload || !isRole(payload.role)) {
      console.log("[Proxy] Invalid token");
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("auth-token");
      return response;
    }

    // User management is admin-only; staff go back to the dashboard.
    if (path.startsWith("/dashboard/users") && !canManageUsers(payload.role)) {
      console.log("[Proxy] Staff cannot manage users, redirecting...");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    console.log(`[Proxy] ✅ Access granted for ${payload.role}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/", "/register"],
};
