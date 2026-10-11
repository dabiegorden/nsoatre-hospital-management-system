import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessRisk, type RiskLevel } from "@/lib/risk";

export interface Defaulter {
  patientId: string;
  fullName: string;
  phoneNumber: string;
  residentialAddress: string;
  folderNumber: string;
  expectedDeliveryDate: Date;
  consecutiveMisses: number;
  totalMisses: number;
  lastMissedAt: Date | null;
  unreachable: boolean;
  nextAppointmentAt: Date | null;
  riskLevel: RiskLevel;
  riskReasons: string[];
  followUpStatus: "none" | "assigned" | "visited" | "returned";
  followUpAssigneeId: string | null;
  followUpAssigneeName: string | null;
  followUpNote: string | null;
  followUpUpdatedAt: Date | null;
}

/**
 * Patients in an active pregnancy who have missed their last two (or more)
 * visits in a row, or missed their last visit and could not be reached by the
 * automatic calls. The streak is computed in SQL, so only defaulters are loaded.
 */
export async function findDefaulters(): Promise<Defaulter[]> {
  const { rows } = await db.execute(sql`
    with past as (
      select a.patient_id, a.status, a.escalated_at, a.appointment_date_time,
             row_number() over (partition by a.patient_id order by a.appointment_date_time desc) as rn
      from appointments a
      join pregnant_women p on p.id = a.patient_id
      where p.expected_delivery_date > now() - interval '14 days'
        and a.status in ('missed', 'completed')
        and a.appointment_date_time < now()
    ),
    streak as (
      select patient_id,
             coalesce(min(rn) filter (where status = 'completed') - 1, count(*))::int as consecutive,
             bool_or(rn = 1 and status = 'missed' and escalated_at is not null) as unreachable,
             max(appointment_date_time) filter (where rn = 1) as last_at
      from past
      group by patient_id
    )
    select p.*, s.consecutive, s.unreachable, s.last_at,
           (select count(*)::int from appointments m
             where m.patient_id = p.id and m.status = 'missed') as total_misses,
           (select min(n.appointment_date_time) from appointments n
             where n.patient_id = p.id and n.status = 'scheduled'
               and n.appointment_date_time > now()) as next_at,
           u.name as assignee_name
    from streak s
    join pregnant_women p on p.id = s.patient_id
    left join users u on u.id = p.follow_up_assignee_id
    where s.consecutive >= 2 or (s.consecutive >= 1 and s.unreachable)`);

  const riskOrder: Record<RiskLevel, number> = { high: 0, moderate: 1, low: 2 };

  return (rows as any[])
    .map((p): Defaulter => {
      const risk = assessRisk({
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
        missedAppointments: p.total_misses,
      });
      return {
        patientId: p.id,
        fullName: p.full_name,
        phoneNumber: p.phone_number,
        residentialAddress: p.residential_address,
        folderNumber: p.folder_number,
        expectedDeliveryDate: new Date(p.expected_delivery_date),
        consecutiveMisses: p.consecutive,
        totalMisses: p.total_misses,
        lastMissedAt: p.last_at ? new Date(p.last_at) : null,
        unreachable: Boolean(p.unreachable),
        nextAppointmentAt: p.next_at ? new Date(p.next_at) : null,
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        followUpStatus: p.follow_up_status,
        followUpAssigneeId: p.follow_up_assignee_id,
        followUpAssigneeName: p.assignee_name ?? null,
        followUpNote: p.follow_up_note,
        followUpUpdatedAt: p.follow_up_updated_at ? new Date(p.follow_up_updated_at) : null,
      };
    })
    .sort(
      (a, b) =>
        riskOrder[a.riskLevel] - riskOrder[b.riskLevel] ||
        b.consecutiveMisses - a.consecutiveMisses
    );
}
