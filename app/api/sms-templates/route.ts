import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { describeDbError, toApi } from "@/lib/db-utils";
import { smsTemplates } from "@/models/schema";

const TEMPLATE_TYPES = [
  "appointment_reminder",
  "missed_appointment",
  "general",
] as const;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const templates = await db
      .select()
      .from(smsTemplates)
      .where(eq(smsTemplates.isActive, true));

    return NextResponse.json({
      success: true,
      data: toApi(templates),
    });
  } catch (error: any) {
    console.error("[v0] Get SMS Templates Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name?.trim();
    const message = body.message?.trim();
    const type = body.type || "general";

    if (!name || !message) {
      return NextResponse.json(
        { message: "Name and message are required" },
        { status: 400 }
      );
    }

    if (!TEMPLATE_TYPES.includes(type)) {
      return NextResponse.json(
        { message: `type must be one of: ${TEMPLATE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const [template] = await db
      .insert(smsTemplates)
      .values({
        name,
        message,
        type,
        createdBy: {
          name: decoded.name,
          email: decoded.email,
        },
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: toApi(template),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[v0] Create SMS Template Error:", error);
    const dbError = describeDbError(error);
    if (dbError) {
      return NextResponse.json({ message: dbError.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: error.message || "Failed to create template" },
      { status: 500 }
    );
  }
}
