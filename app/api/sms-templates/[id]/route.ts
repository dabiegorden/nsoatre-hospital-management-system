import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { describeDbError, toApi } from "@/lib/db-utils";
import { validateTemplateInput } from "@/lib/reminders/template-input";
import { smsTemplates } from "@/models/schema";

// PATCH - Update a template (text, purpose, language, active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const { values, errors } = validateTemplateInput(await request.json(), true);
    if (errors.length) {
      return NextResponse.json({ message: errors[0], errors }, { status: 400 });
    }
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    const [template] = await db
      .update(smsTemplates)
      .set(values)
      .where(eq(smsTemplates.id, id))
      .returning();
    if (!template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: toApi(template) });
  } catch (error) {
    console.error("Update SMS template error:", error);
    const dbError = describeDbError(error);
    if (dbError) return NextResponse.json({ message: dbError.message }, { status: 400 });
    return NextResponse.json({ message: "Failed to update template" }, { status: 500 });
  }
}

// DELETE - Remove a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [deleted] = await db
    .delete(smsTemplates)
    .where(eq(smsTemplates.id, id))
    .returning({ id: smsTemplates.id });
  if (!deleted) {
    return NextResponse.json({ message: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: "Template deleted" });
}
