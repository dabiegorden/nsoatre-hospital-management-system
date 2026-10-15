/**
 * Rule-based antenatal risk score from data the clinic already records.
 * Based on common WHO / Ghana Health Service ANC warning thresholds; it
 * flags patients for closer follow-up and does not replace clinical judgement.
 */

export type RiskLevel = "low" | "moderate" | "high";

export interface RiskInput {
  age?: number | null;
  bloodPressure?: string | null;
  hb?: string | null;
  gestationalAge?: number | null;
  expectedDeliveryDate?: string | Date | null;
  hivStatusAtRegistration?: string | null;
  syphilisScreeningStatus?: string | null;
  hbsAgResult?: string | null;
  sicklingStatus?: string | null;
  tbStatus?: string | null;
  urineProtein?: string | null;
  /** Number of missed appointments for this pregnancy. */
  missedAppointments?: number;
}

/** The `pregnant_women` columns used for risk, as raw SQL (`select p.*`) returns them. */
export type PregnantWomanRiskRow = {
  age: number | null;
  blood_pressure: string | null;
  hb: string | null;
  gestational_age: number | null;
  expected_delivery_date: string | Date | null;
  hiv_status_at_registration: string | null;
  syphilis_screening_status: string | null;
  hbs_ag_result: string | null;
  sickling_status: string | null;
  tb_status: string | null;
  urine_protein: string | null;
};

export function riskInputFromRow(
  row: PregnantWomanRiskRow,
  missedAppointments: number
): RiskInput {
  return {
    age: row.age,
    bloodPressure: row.blood_pressure,
    hb: row.hb,
    gestationalAge: row.gestational_age,
    expectedDeliveryDate: row.expected_delivery_date,
    hivStatusAtRegistration: row.hiv_status_at_registration,
    syphilisScreeningStatus: row.syphilis_screening_status,
    hbsAgResult: row.hbs_ag_result,
    sicklingStatus: row.sickling_status,
    tbStatus: row.tb_status,
    urineProtein: row.urine_protein,
    missedAppointments,
  };
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

function parseBloodPressure(bp?: string | null) {
  const match = /(\d{2,3})\s*\/\s*(\d{2,3})/.exec(bp ?? "");
  return match
    ? { systolic: Number(match[1]), diastolic: Number(match[2]) }
    : null;
}

function parseNumber(value?: string | null) {
  const match = /\d+(\.\d+)?/.exec(value ?? "");
  return match ? Number(match[0]) : null;
}

/** Current gestational age in weeks, derived from the due date when available. */
export function currentGestationalWeeks(
  edd?: string | Date | null,
  fallbackWeeks?: number | null,
  now = new Date()
): number | null {
  if (edd) {
    const due = new Date(edd);
    if (!Number.isNaN(due.getTime())) {
      const weeksToDue = (due.getTime() - now.getTime()) / (7 * 86_400_000);
      return Math.max(0, Math.round((40 - weeksToDue) * 10) / 10);
    }
  }
  return fallbackWeeks ?? null;
}

export function assessRisk(input: RiskInput, now = new Date()): RiskAssessment {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const bp = parseBloodPressure(input.bloodPressure);
  if (bp) {
    if (bp.systolic >= 160 || bp.diastolic >= 110) add(5, "Severe hypertension");
    else if (bp.systolic >= 140 || bp.diastolic >= 90) add(4, "High blood pressure (≥ 140/90)");
  }

  const hb = parseNumber(input.hb);
  if (hb !== null && hb > 0) {
    if (hb < 7) add(5, "Severe anaemia (Hb < 7)");
    else if (hb < 11) add(2, "Anaemia (Hb < 11)");
  }

  if (input.age != null) {
    if (input.age < 18) add(2, "Adolescent pregnancy (< 18)");
    else if (input.age > 35) add(2, "Advanced maternal age (> 35)");
  }

  const protein = (input.urineProtein ?? "").toLowerCase();
  if (/\+|positive|trace/.test(protein) && bp && (bp.systolic >= 140 || bp.diastolic >= 90)) {
    add(3, "Proteinuria with high BP (pre-eclampsia risk)");
  }

  if (input.hivStatusAtRegistration === "positive") add(2, "HIV positive");
  if (input.syphilisScreeningStatus === "positive") add(2, "Syphilis positive");
  if (input.hbsAgResult === "positive") add(1, "Hepatitis B positive");
  if (input.sicklingStatus === "positive") add(1, "Sickling positive");
  if (input.tbStatus === "positive") add(2, "TB positive");

  const weeks = currentGestationalWeeks(
    input.expectedDeliveryDate,
    input.gestationalAge,
    now
  );
  if (weeks !== null && weeks >= 41) add(3, "Past due date (≥ 41 weeks)");

  const missed = input.missedAppointments ?? 0;
  if (missed >= 2) add(2, `${missed} missed appointments`);
  else if (missed === 1) add(1, "1 missed appointment");

  const level: RiskLevel = score >= 4 ? "high" : score >= 2 ? "moderate" : "low";
  return { level, score, reasons };
}
