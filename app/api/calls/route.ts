import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { getPagination, likePattern, toApi } from "@/lib/db-utils";
import { callLogs } from "@/models/schema";

// GET - Call history with outcomes (filters: search, appointmentId, patientId, danger=true)
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPagination(searchParams);
    const search = searchParams.get("search") || "";
    const appointmentId = searchParams.get("appointmentId");
    const patientId = searchParams.get("patientId");
    const dangerOnly = searchParams.get("danger") === "true";

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      const pattern = likePattern(search);
      conditions.push(
        or(ilike(callLogs.patientName, pattern), ilike(callLogs.phoneNumber, pattern))
      );
    }
    if (appointmentId) conditions.push(eq(callLogs.appointmentId, appointmentId));
    if (patientId) conditions.push(eq(callLogs.pregnantWomanId, patientId));
    if (dangerOnly) {
      conditions.push(
        and(isNotNull(callLogs.dangerSigns), sql`jsonb_array_length(${callLogs.dangerSigns}) > 0`)
      );
    }
    const where = and(...conditions);

    const [rows, total] = await Promise.all([
      db
        .select({
          id: callLogs.id,
          appointmentId: callLogs.appointmentId,
          pregnantWomanId: callLogs.pregnantWomanId,
          patientName: callLogs.patientName,
          phoneNumber: callLogs.phoneNumber,
          provider: callLogs.provider,
          kind: callLogs.kind,
          attempt: callLogs.attempt,
          status: callLogs.status,
          endedReason: callLogs.endedReason,
          answered: callLogs.answered,
          language: callLogs.language,
          durationSeconds: callLogs.durationSeconds,
          summary: callLogs.summary,
          reasonForMissing: callLogs.reasonForMissing,
          reasonCategory: callLogs.reasonCategory,
          dangerSigns: callLogs.dangerSigns,
          wantsToReschedule: callLogs.wantsToReschedule,
          preferredReturnDate: callLogs.preferredReturnDate,
          recordingUrl: callLogs.recordingUrl,
          transcript: callLogs.transcript,
          outcomeProcessedAt: callLogs.outcomeProcessedAt,
          dangerAlertSentAt: callLogs.dangerAlertSentAt,
          error: callLogs.error,
          initiatedBy: callLogs.initiatedBy,
          createdAt: callLogs.createdAt,
          endedAt: callLogs.endedAt,
        })
        .from(callLogs)
        .where(where)
        .orderBy(desc(callLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.$count(callLogs, where),
    ]);

    return NextResponse.json({
      data: toApi(rows),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
