import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { requireStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getPagination, likePattern, toApi } from "@/lib/db-utils";
import { reminderLogs } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const decoded = await requireStaff(request);
    if (decoded instanceof NextResponse) return decoded;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const reminderType = searchParams.get("reminderType") || "";
    const status = searchParams.get("status") || "";
    const { page, limit, offset } = getPagination(searchParams);

    const conditions: (SQL | undefined)[] = [];

    if (search) {
      const pattern = likePattern(search);
      conditions.push(
        or(
          ilike(reminderLogs.patientPhoneNumber, pattern),
          sql`${reminderLogs.sentBy}->>'email' ilike ${pattern}`,
          sql`${reminderLogs.sentBy}->>'name' ilike ${pattern}`,
          ilike(reminderLogs.message, pattern)
        )
      );
    }

    if (reminderType === "sms" || reminderType === "voice") {
      conditions.push(eq(reminderLogs.reminderType, reminderType));
    }

    if (status === "pending" || status === "sent" || status === "failed") {
      conditions.push(eq(reminderLogs.status, status));
    }

    const where = and(...conditions);

    const [reminders, total] = await Promise.all([
      db
        .select()
        .from(reminderLogs)
        .where(where)
        .orderBy(desc(reminderLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.$count(reminderLogs, where),
    ]);

    return NextResponse.json({
      success: true,
      data: toApi(reminders),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[v0] Get Reminders Error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}
