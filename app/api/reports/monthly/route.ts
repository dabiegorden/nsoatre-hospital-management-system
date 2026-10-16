import { type NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";
import { getAnalytics } from "@/lib/analytics";
import { dangerLabel } from "@/lib/labels";
import { errorMessage } from "@/lib/utils";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const row = (...cells: unknown[]) => cells.map(csvCell).join(",");
const pct = (v: number | null) => (v === null ? "n/a" : `${v}%`);

/** One appointment row of the report query below. */
type ReportRow = {
  appointment_date_time: string | Date;
  patient_name: string;
  patient_phone_number: string;
  status: string;
  appointment_location: string;
  folder_number: string | null;
  calls: number;
  reached: boolean;
  language: string | null;
  reason: string | null;
  danger: string | null;
};

// GET ?month=YYYY-MM - Monthly ANC attendance & reminder report as CSV
export async function GET(request: NextRequest) {
  const caller = await requireStaff(request);
  if (caller instanceof NextResponse) return caller;

  const month = request.nextUrl.searchParams.get("month") ?? "";
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    return NextResponse.json({ message: "month must be YYYY-MM" }, { status: 400 });
  }
  const from = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const to = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));

  try {
    const [stats, appointmentRows] = await Promise.all([
      getAnalytics(from, to),
      db.execute<ReportRow>(sql`
        select a.appointment_date_time, a.patient_name, a.patient_phone_number, a.status,
               a.appointment_location, p.folder_number,
               (select count(*)::int from call_logs c where c.appointment_id = a.id and c.kind <> 'test') as calls,
               a.follow_up_completed_at is not null as reached,
               (select c.language from call_logs c where c.appointment_id = a.id and c.answered
                order by c.created_at desc limit 1) as language,
               (select c.reason_for_missing from call_logs c where c.appointment_id = a.id
                and c.reason_for_missing is not null order by c.created_at desc limit 1) as reason,
               (select string_agg(distinct s, ';') from call_logs c,
                 jsonb_array_elements_text(coalesce(c.danger_signs, '[]'::jsonb)) s
                where c.appointment_id = a.id) as danger
        from appointments a
        left join pregnant_women p on p.id = a.patient_id
        where a.appointment_date_time >= ${from} and a.appointment_date_time < ${to}
        order by a.appointment_date_time`),
    ]);

    const lines = [
      row(`Nsoatre Government Hospital - Antenatal Care Monthly Report (${month})`),
      row("Generated", new Date().toISOString(), "By", caller.name),
      "",
      row("Indicator", "Value"),
      row("Visits attended", stats.totals.completed),
      row("Visits missed", stats.totals.missed),
      row("Attendance rate", pct(stats.totals.attendanceRate)),
      row("Reminder SMS sent", stats.sms.sent),
      row("Reminder SMS failed", stats.sms.failed),
      row("Follow-up calls placed", stats.calls.total),
      row("Calls answered", stats.calls.answered),
      row("Answered in Twi", stats.calls.twi),
      row("Answered in English", stats.calls.english),
      row("Twi voice messages (fallback)", stats.calls.arkeselFallback),
      row("Danger-sign alerts", stats.calls.dangerAlerts),
      row("Return rate when patient reached", pct(stats.effectiveness.reachedReturnRate)),
      row("Return rate when not reached", pct(stats.effectiveness.unreachedReturnRate)),
      row("Current defaulters", stats.defaulters),
      row("Active pregnancies - high risk", stats.risk.high),
      row("Active pregnancies - moderate risk", stats.risk.moderate),
      row("Active pregnancies - low risk", stats.risk.low),
      "",
      row(
        "Date",
        "Time",
        "Patient",
        "Folder No.",
        "Phone",
        "Location",
        "Status",
        "Follow-up calls",
        "Reached",
        "Language",
        "Danger signs",
        "Reason for missing"
      ),
      ...appointmentRows.rows.map((a) => {
        const when = new Date(a.appointment_date_time);
        return row(
          when.toISOString().slice(0, 10),
          when.toISOString().slice(11, 16),
          a.patient_name,
          a.folder_number,
          a.patient_phone_number,
          a.appointment_location,
          a.status,
          a.calls,
          a.status === "missed" ? (a.reached ? "Yes" : "No") : "",
          a.language ?? "",
          (a.danger ?? "")
            .split(";")
            .filter(Boolean)
            .map(dangerLabel)
            .join("; "),
          a.reason ?? ""
        );
      }),
    ];

    // UTF-8 BOM so Excel shows non-ASCII characters correctly.
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="anc-report-${month}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error generating monthly report:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
