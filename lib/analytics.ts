import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { findDefaulters } from "@/lib/defaulters";
import { assessRisk } from "@/lib/risk";

export interface MonthlyAttendance {
  month: string; // YYYY-MM
  completed: number;
  missed: number;
  attendanceRate: number | null; // 0-100
}

export interface Analytics {
  range: { from: string; to: string };
  monthly: MonthlyAttendance[];
  totals: { completed: number; missed: number; attendanceRate: number | null };
  calls: {
    total: number;
    answered: number;
    twi: number;
    english: number;
    arkeselFallback: number;
    dangerAlerts: number;
    answerRate: number | null;
  };
  sms: { sent: number; failed: number };
  effectiveness: {
    reachedMissed: number;
    reachedReturned: number;
    unreachedMissed: number;
    unreachedReturned: number;
    reachedReturnRate: number | null;
    unreachedReturnRate: number | null;
  };
  reasons: { category: string; count: number }[];
  dangerSigns: { sign: string; count: number }[];
  risk: { low: number; moderate: number; high: number };
  defaulters: number;
}

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;

/** Attendance, reminder and call statistics between two dates. */
export async function getAnalytics(from: Date, to: Date): Promise<Analytics> {
  const [monthlyRows, callRow, smsRow, effectivenessRow, reasonRows, dangerRows, patients, defaulters] =
    await Promise.all([
      db.execute(sql`
        select to_char(date_trunc('month', appointment_date_time), 'YYYY-MM') as month,
               count(*) filter (where status = 'completed')::int as completed,
               count(*) filter (where status = 'missed')::int as missed
        from appointments
        where appointment_date_time >= ${from} and appointment_date_time < ${to}
        group by 1 order by 1`),
      db.execute(sql`
        select count(*)::int as total,
               count(*) filter (where answered)::int as answered,
               count(*) filter (where language = 'twi' and answered)::int as twi,
               count(*) filter (where language = 'english' and answered)::int as english,
               count(*) filter (where provider = 'arkesel')::int as arkesel,
               count(*) filter (where danger_alert_sent_at is not null)::int as danger
        from call_logs
        where kind <> 'test' and created_at >= ${from} and created_at < ${to}`),
      db.execute(sql`
        select count(*) filter (where status = 'sent')::int as sent,
               count(*) filter (where status = 'failed')::int as failed
        from reminder_logs
        where reminder_type = 'sms' and created_at >= ${from} and created_at < ${to}`),
      // Did patients come back within 21 days of a missed visit, by whether
      // the follow-up reached them?
      db.execute(sql`
        select (m.follow_up_completed_at is not null) as reached,
               count(*)::int as missed,
               count(*) filter (where exists (
                 select 1 from appointments c
                 where c.patient_id = m.patient_id and c.status = 'completed'
                   and c.appointment_date_time > m.appointment_date_time
                   and c.appointment_date_time <= m.appointment_date_time + interval '21 days'
               ))::int as returned
        from appointments m
        where m.status = 'missed' and m.patient_id is not null
          and m.appointment_date_time >= ${from} and m.appointment_date_time < ${to}
        group by 1`),
      db.execute(sql`
        select reason_category as category, count(*)::int as count
        from call_logs
        where reason_category is not null and kind <> 'test'
          and created_at >= ${from} and created_at < ${to}
        group by 1 order by 2 desc`),
      db.execute(sql`
        select sign, count(*)::int as count
        from call_logs, jsonb_array_elements_text(coalesce(danger_signs, '[]'::jsonb)) as sign
        where kind <> 'test' and created_at >= ${from} and created_at < ${to}
        group by 1 order by 2 desc`),
      db.execute(sql`
        select p.*, (select count(*)::int from appointments a
                     where a.patient_id = p.id and a.status = 'missed') as missed_count
        from pregnant_women p
        where p.expected_delivery_date > now() - interval '14 days'`),
      findDefaulters(),
    ]);

  const monthly: MonthlyAttendance[] = (monthlyRows.rows as any[]).map((r) => ({
    month: r.month,
    completed: r.completed,
    missed: r.missed,
    attendanceRate: pct(r.completed, r.completed + r.missed),
  }));
  const completed = monthly.reduce((n, m) => n + m.completed, 0);
  const missed = monthly.reduce((n, m) => n + m.missed, 0);

  const calls = (callRow.rows as any[])[0] ?? {};
  const sms = (smsRow.rows as any[])[0] ?? {};
  const eff = { reachedMissed: 0, reachedReturned: 0, unreachedMissed: 0, unreachedReturned: 0 };
  for (const r of effectivenessRow.rows as any[]) {
    if (r.reached) {
      eff.reachedMissed = r.missed;
      eff.reachedReturned = r.returned;
    } else {
      eff.unreachedMissed = r.missed;
      eff.unreachedReturned = r.returned;
    }
  }

  const risk = { low: 0, moderate: 0, high: 0 };
  for (const p of patients.rows as any[]) {
    const level = assessRisk({
      age: p.age,
      bloodPressure: p.blood_pressure,
      hb: p.hb,
      gestationalAge: p.gestational_age,
      expectedDeliveryDate: p.expected_delivery_date,
      hivStatusAtRegistration: p.hiv_status_at_registration,
      syphilisScreeningStatus: p.syphilis_screening_status,
      hbsAgResult: p.hbs_ag_result,
      sicklingStatus: p.sickling_status,
      tbStatus: p.tb_status,
      urineProtein: p.urine_protein,
      missedAppointments: p.missed_count,
    }).level;
    risk[level]++;
  }

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    monthly,
    totals: { completed, missed, attendanceRate: pct(completed, completed + missed) },
    calls: {
      total: calls.total ?? 0,
      answered: calls.answered ?? 0,
      twi: calls.twi ?? 0,
      english: calls.english ?? 0,
      arkeselFallback: calls.arkesel ?? 0,
      dangerAlerts: calls.danger ?? 0,
      answerRate: pct(calls.answered ?? 0, (calls.total ?? 0) - (calls.arkesel ?? 0)),
    },
    sms: { sent: sms.sent ?? 0, failed: sms.failed ?? 0 },
    effectiveness: {
      ...eff,
      reachedReturnRate: pct(eff.reachedReturned, eff.reachedMissed),
      unreachedReturnRate: pct(eff.unreachedReturned, eff.unreachedMissed),
    },
    reasons: reasonRows.rows as any[],
    dangerSigns: dangerRows.rows as any[],
    risk,
    defaulters: defaulters.length,
  };
}
