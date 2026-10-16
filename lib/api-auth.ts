import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTokenFromCookies, verifyToken, type TokenPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRole, type Role } from "@/lib/roles";
import { users } from "@/models/schema";

/** Constant-time string comparison for shared secrets. */
export function secretsMatch(provided: string | null | undefined, expected?: string) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Returns the signed-in user if their role is in `allowed`, or a 401/403
 * response to return as-is. The role is read from the database, not the
 * token, so a role change or deleted account takes effect immediately.
 */
async function requireRole(
  request: NextRequest | Request,
  allowed: readonly Role[]
): Promise<TokenPayload | NextResponse> {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized - No token provided" },
      { status: 401 }
    );
  }
  const decoded = await verifyToken(token);
  if (!decoded) {
    return NextResponse.json(
      { message: "Unauthorized - Invalid or expired session" },
      { status: 401 }
    );
  }

  const [user] = await db
    .select({ role: users.role, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, decoded.userId));
  if (!user || !isRole(user.role)) {
    return NextResponse.json(
      { message: "Unauthorized - Account not found" },
      { status: 401 }
    );
  }
  if (!allowed.includes(user.role)) {
    return NextResponse.json(
      {
        message:
          allowed.length === 1 && allowed[0] === "admin"
            ? "Forbidden - Admin access required"
            : "Forbidden",
      },
      { status: 403 }
    );
  }
  return { ...decoded, ...user };
}

/** Any signed-in admin or staff member (view, add, edit). */
export function requireStaff(request: NextRequest | Request) {
  return requireRole(request, ["admin", "staff"]);
}

/** Admins only (deleting records, managing user accounts). */
export function requireAdmin(request: NextRequest | Request) {
  return requireRole(request, ["admin"]);
}
