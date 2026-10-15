import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/models/schema";
import PasswordResetEmail from "@/components/emails/password-reset-email";
import { errorMessage } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    if (!user) {
      return NextResponse.json({ message: "Email not found" }, { status: 404 });
    }

    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const formattedToken = resetToken.toUpperCase().substring(0, 20);

    // Save reset token and expiry to database (expires in 15 minutes)
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await db
      .update(users)
      .set({ resetCode: formattedToken, resetCodeExpiry: resetExpiry })
      .where(eq(users.id, user.id));

    const response = await resend.emails.send({
      from: "support@jssolutionshub.com",
      to: email,
      subject: "Reset Your Password",
      react: PasswordResetEmail({
        userName: user.name,
        resetToken: formattedToken,
      }),
    });

    if (response.error) {
      console.error("Resend error:", response.error);
      return NextResponse.json(
        { message: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Reset token sent to email",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to send reset code" },
      { status: 500 }
    );
  }
}
