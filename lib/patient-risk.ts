import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessRisk, type RiskAssessment } from "@/lib/risk";
import { appointments, pregnantWomen, type PregnantWoman } from "@/models/schema";

export async function countMissedAppointments(patientId: string) {
  return db.$count(
    appointments,
    and(eq(appointments.patientId, patientId), eq(appointments.status, "missed"))
  );
}

/** Loads a patient and assesses her risk, including her missed-visit history. */
export async function getPatientRisk(
  patientId: string | null | undefined
): Promise<{ patient: PregnantWoman | null; risk: RiskAssessment }> {
  if (!patientId) return { patient: null, risk: assessRisk({}) };
  const [patient] = await db
    .select()
    .from(pregnantWomen)
    .where(eq(pregnantWomen.id, patientId));
  if (!patient) return { patient: null, risk: assessRisk({}) };
  const missedAppointments = await countMissedAppointments(patientId);
  return { patient, risk: assessRisk({ ...patient, missedAppointments }) };
}
