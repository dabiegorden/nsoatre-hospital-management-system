import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-auth";
import { toE164 } from "@/lib/phone";
import { isRole } from "@/lib/roles";
import { db } from "@/lib/db";
import { users, type NewUser } from "@/models/schema";

/** True if some admin other than `userId` exists. */
async function hasOtherAdmin(userId: string) {
  const [other] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), ne(users.id, userId)))
    .limit(1);
  return Boolean(other);
}

// PATCH update user role and/or phone number (admins receive alert SMS on it)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Pick<Partial<NewUser>, "role" | "phoneNumber"> = {};

    if (body.role !== undefined) {
      if (!isRole(body.role)) {
        return NextResponse.json(
          { error: "Role must be admin or staff" },
          { status: 400 }
        );
      }
      if (body.role !== "admin") {
        // Never leave the hospital without an admin, or lock yourself out.
        if (id === admin.userId) {
          return NextResponse.json(
            { error: "You cannot remove your own admin access" },
            { status: 400 }
          );
        }
        if (!(await hasOtherAdmin(id))) {
          return NextResponse.json(
            { error: "There must be at least one admin" },
            { status: 400 }
          );
        }
      }
      updates.role = body.role;
    }

    if (body.phoneNumber !== undefined) {
      const raw = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
      const phone = raw ? toE164(raw) : null;
      if (raw && !phone) {
        return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
      }
      updates.phoneNumber = phone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phoneNumber: users.phoneNumber,
        role: users.role,
        createdAt: users.createdAt,
      });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("[v0] Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE user (admins only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    // Prevent deleting yourself
    if (id === admin.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Records this user created are kept; their reference is set to null.
    const [user] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[v0] Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
