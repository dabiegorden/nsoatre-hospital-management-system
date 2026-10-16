import { type NextRequest, NextResponse } from "next/server";
import { requireStaff, secretsMatch } from "@/lib/api-auth";
import { runReminderTick } from "@/lib/reminders/engine";
import { errorMessage } from "@/lib/utils";

/**
 * Runs one reminder pass now. Called by an external cron with
 * `Authorization: Bearer $CRON_SECRET`, or by signed-in staff from the dashboard.
 * The in-app scheduler normally makes this unnecessary.
 */
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secretsMatch(bearer, process.env.CRON_SECRET)) {
    const caller = await requireStaff(request);
    if (caller instanceof NextResponse) return caller;
  }

  try {
    const result = await runReminderTick();
    return NextResponse.json({ message: "Reminder tick completed", data: result });
  } catch (error) {
    console.error("[reminders] Manual tick failed:", error);
    return NextResponse.json(
      { message: "Reminder tick failed", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
