import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { email, resetToken, newPassword } = await request.json();

    // Validate required fields
    if (!email || !resetToken || !newPassword) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
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

    if (user.resetCode !== resetToken) {
      return NextResponse.json({ message: "Wrong code" }, { status: 401 });
    }

    // Check if reset code has expired
    if (!user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return NextResponse.json(
        { message: "Reset code has expired" },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and clear reset code
    await db
      .update(users)
      .set({ password: hashedPassword, resetCode: null, resetCodeExpiry: null })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Reset password error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to reset password" },
      { status: 500 }
    );
  }
}
