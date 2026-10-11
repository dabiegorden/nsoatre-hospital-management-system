import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { twiAudioUrl, vapiServerConfig } from "@/lib/calls/place-call";
import { reminderConfig } from "@/lib/reminders/config";
import { isDryRun } from "@/lib/reminders/dry-run";
import { isVapiConfigured } from "@/lib/vapi/client";
import { schedulerLocks } from "@/models/schema";

// GET - Health of the automatic reminder system, for the dashboard.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const [lock] = await db
    .select()
    .from(schedulerLocks)
    .where(eq(schedulerLocks.name, "reminders"));

  const lastRunAt = lock?.lastRunAt ?? null;
  const healthy = lastRunAt ? Date.now() - lastRunAt.getTime() < 5 * 60_000 : false;

  return NextResponse.json({
    data: {
      schedulerEnabled:
        process.env.REMINDERS_ENABLED !== "false" &&
        (process.env.NODE_ENV === "production" || process.env.REMINDERS_IN_DEV === "true"),
      environment: process.env.NODE_ENV,
      dryRun: isDryRun(),
      healthy,
      lastRunAt,
      lastResult: lock?.lastResult ?? null,
      vapiConfigured: isVapiConfigured() && Boolean(process.env.VAPI_PHONE_NUMBER_ID),
      webhookConfigured: Boolean(vapiServerConfig()),
      twiAudioConfigured: Boolean(twiAudioUrl()),
      smsHours: reminderConfig.smsHours,
      callHours: reminderConfig.callHours,
      missedGraceMinutes: reminderConfig.missedGrace / 60_000,
    },
  });
}
