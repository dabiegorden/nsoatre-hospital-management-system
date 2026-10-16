import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-utils";
import { toE164 } from "@/lib/phone";
import { isRole } from "@/lib/roles";
import { users } from "@/models/schema";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// GET all users (admins only)
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const formattedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phoneNumber: users.phoneNumber,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create a staff or admin account (admins only); they can log in with it
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = (await request.json()) as Record<string, unknown>;
    const str = (key: string) =>
      typeof body[key] === "string" ? (body[key] as string).trim() : "";
    const name = str("name");
    const email = str("email").toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const rawPhone = str("phoneNumber");
    const role = body.role ?? "staff";

    if (!email || !password || !name || !rawPhone) {
      return NextResponse.json(
        { error: "Name, email, phone number and password are required" },
        { status: 400 }
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email" },
        { status: 400 }
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }
    const phoneNumber = toE164(rawPhone);
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }
    if (!isRole(role)) {
      return NextResponse.json(
        { error: "Role must be admin or staff" },
        { status: 400 }
      );
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const [user] = await db
      .insert(users)
      .values({
        email,
        password: await hashPassword(password),
        name,
        phoneNumber,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phoneNumber: users.phoneNumber,
        role: users.role,
        createdAt: users.createdAt,
      });

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);

    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
