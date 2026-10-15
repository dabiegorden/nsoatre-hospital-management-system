import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-utils";
import { users } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "admin-secret-key";
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, secretKey, role } = body;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const phoneNumber = body.phoneNumber?.trim();

    // Validate required fields
    if (!email || !password || !name || !phoneNumber) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    const userRole: "admin" | "user" = role === "admin" ? "admin" : "user";

    // Verify admin secret key if admin role is requested
    if (userRole === "admin") {
      if (!secretKey || secretKey !== ADMIN_SECRET_KEY) {
        return NextResponse.json(
          { message: "Invalid admin secret key" },
          { status: 401 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        phoneNumber,
        role: userRole,
      })
      .returning();

    // Generate token
    const token = await generateToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phoneNumber: newUser.phoneNumber ?? undefined,
      role: newUser.role,
    });

    // Set token as cookie
    const response = NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[v0] Register error:", error);
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: errorMessage(error) || "Registration failed" },
      { status: 500 }
    );
  }
}
