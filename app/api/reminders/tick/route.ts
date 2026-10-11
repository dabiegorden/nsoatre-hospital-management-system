import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin, secretsMatch } from "@/lib/api-auth";
import { runReminderTick } from "@/lib/reminders/engine";

/**
 * Runs one reminder pass now. Called by an external cron with
 * `Authorization: Bearer $CRON_SECRET`, or by an admin from the dashboard.
 * The in-app scheduler normally makes this unnecessary.
 */
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secretsMatch(bearer, process.env.CRON_SECRET)) {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;
  }

  try {
    const result = await runReminderTick();
    return NextResponse.json({ message: "Reminder tick completed", data: result });
  } catch (error: any) {
    console.error("[reminders] Manual tick failed:", error);
    return NextResponse.json(
      { message: "Reminder tick failed", error: error.message },
      { status: 500 }
    );
  }
}
