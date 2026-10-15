import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { email, resetToken } = await request.json();

    // Validate required fields
    if (!email || !resetToken) {
      return NextResponse.json(
        { message: "Email and token are required" },
        { status: 400 }
      );
    }

    // Find user and verify token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.resetCode !== resetToken.toUpperCase().trim()) {
      console.log("[v0] Token mismatch:", {
        provided: resetToken.toUpperCase().trim(),
        stored: user.resetCode,
      });
      return NextResponse.json({ message: "Wrong code" }, { status: 401 });
    }

    // Check if reset code has expired
    if (!user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return NextResponse.json(
        { message: "Reset code has expired" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Token verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Verify token error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to verify token" },
      { status: 500 }
    );
  }
}
