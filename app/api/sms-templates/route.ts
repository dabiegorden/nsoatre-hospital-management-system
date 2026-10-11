import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { describeDbError, toApi } from "@/lib/db-utils";
import { validateTemplateInput } from "@/lib/reminders/template-input";
import { smsTemplates } from "@/models/schema";

// GET - Active templates (?all=true lists inactive ones too, for admins)
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

    const all = request.nextUrl.searchParams.get("all") === "true" && decoded.role === "admin";
    const templates = await db
      .select()
      .from(smsTemplates)
      .where(all ? undefined : eq(smsTemplates.isActive, true))
      .orderBy(desc(smsTemplates.updatedAt));

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

// POST - Create a template (admins)
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json();
    const { values, errors } = validateTemplateInput(body, false);
    if (errors.length) {
      return NextResponse.json({ message: errors[0], errors }, { status: 400 });
    }

    const [template] = await db
      .insert(smsTemplates)
      .values({
        ...(values as typeof smsTemplates.$inferInsert),
        type: values.type ?? "general",
        createdBy: { name: admin.name, email: admin.email },
      })
      .returning();

    return NextResponse.json({ success: true, data: toApi(template) }, { status: 201 });
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
