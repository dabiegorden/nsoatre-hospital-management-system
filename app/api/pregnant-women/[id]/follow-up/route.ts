import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";
import { pregnantWomen, users } from "@/models/schema";

const STATUSES = ["none", "assigned", "visited", "returned"] as const;
const LANGUAGES = ["twi", "english"] as const;

/**
 * PATCH { followUpStatus?, followUpAssigneeId?, followUpNote?, preferredLanguage? }
 * Updates defaulter follow-up and the call language without archiving a
 * clinical snapshot (unlike PUT on the record).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireStaff(request);
  if (caller instanceof NextResponse) return caller;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const updates: Partial<typeof pregnantWomen.$inferInsert> = {};

  if (body.followUpStatus !== undefined) {
    if (!STATUSES.includes(body.followUpStatus)) {
      return NextResponse.json(
        { message: `followUpStatus must be one of: ${STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updates.followUpStatus = body.followUpStatus;
  }

  if (body.followUpAssigneeId !== undefined) {
    if (body.followUpAssigneeId) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, String(body.followUpAssigneeId)));
      if (!user) {
        return NextResponse.json({ message: "Assignee not found" }, { status: 400 });
      }
      updates.followUpAssigneeId = user.id;
      if (!updates.followUpStatus) updates.followUpStatus = "assigned";
    } else {
      updates.followUpAssigneeId = null;
    }
  }

  if (body.followUpNote !== undefined) {
    updates.followUpNote = String(body.followUpNote ?? "").trim() || null;
  }

  if (body.preferredLanguage !== undefined) {
    if (body.preferredLanguage !== null && !LANGUAGES.includes(body.preferredLanguage)) {
      return NextResponse.json(
        { message: "preferredLanguage must be twi, english or null" },
        { status: 400 }
      );
    }
    updates.preferredLanguage = body.preferredLanguage;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }
  if (
    updates.followUpStatus !== undefined ||
    updates.followUpAssigneeId !== undefined ||
    updates.followUpNote !== undefined
  ) {
    updates.followUpUpdatedAt = new Date();
  }

  const [updated] = await db
    .update(pregnantWomen)
    .set(updates)
    .where(eq(pregnantWomen.id, id))
    .returning({
      id: pregnantWomen.id,
      followUpStatus: pregnantWomen.followUpStatus,
      followUpAssigneeId: pregnantWomen.followUpAssigneeId,
      followUpNote: pregnantWomen.followUpNote,
      preferredLanguage: pregnantWomen.preferredLanguage,
    });

  if (!updated) {
    return NextResponse.json({ message: "Pregnant woman record not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "Updated", data: { ...updated, _id: updated.id } });
}
