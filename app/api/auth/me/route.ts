import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Get user error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to get user" },
      { status: 500 }
    );
  }
}
