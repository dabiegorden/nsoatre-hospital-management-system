import { type NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { callLogs } from "@/models/schema";

// PATCH { vapiCallId } - Links a started browser test call to its log so its
// outcome is collected by the reminder tick. { failed: "reason" } closes it.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const { vapiCallId, failed } = await request.json().catch(() => ({}));

  const where = and(
    eq(callLogs.id, id),
    eq(callLogs.kind, "test"),
    isNull(callLogs.providerCallId)
  );

  const [updated] = vapiCallId
    ? await db
        .update(callLogs)
        .set({ providerCallId: String(vapiCallId), status: "in-progress" })
        .where(where)
        .returning({ id: callLogs.id })
    : await db
        .update(callLogs)
        .set({
          status: "failed",
          error: String(failed || "Browser call did not start"),
          outcomeProcessedAt: new Date(),
          endedAt: new Date(),
        })
        .where(where)
        .returning({ id: callLogs.id });

  if (!updated) {
    return NextResponse.json({ message: "Test call not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "Test call updated" });
}
