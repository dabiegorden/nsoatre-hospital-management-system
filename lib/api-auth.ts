import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken, type TokenPayload } from "@/lib/auth";

/** Constant-time string comparison for shared secrets. */
export function secretsMatch(provided: string | null | undefined, expected?: string) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Returns the admin's token payload, or a 401/403 response to return as-is.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<TokenPayload | NextResponse> {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized - No token provided" },
      { status: 401 }
    );
  }
  const decoded = await verifyToken(token);
  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json(
      { message: "Unauthorized - Admin access required" },
      { status: 403 }
    );
  }
  return decoded;
}
