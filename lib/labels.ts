/**
 * Single source of truth for call-outcome categories and their display
 * labels (used by the Vapi extraction schema, the UI and reports).
 */

export const DANGER_SIGNS = [
  "vaginal_bleeding",
  "severe_headache",
  "blurred_vision",
  "swelling_face_hands",
  "convulsions",
  "severe_abdominal_pain",
  "fever",
  "reduced_fetal_movement",
  "water_broke",
  "difficulty_breathing",
] as const;

export type DangerSign = (typeof DANGER_SIGNS)[number];

export const DANGER_SIGN_LABELS: Record<DangerSign, string> = {
  vaginal_bleeding: "Vaginal bleeding",
  severe_headache: "Severe headache",
  blurred_vision: "Blurred vision",
  swelling_face_hands: "Swelling of face/hands",
  convulsions: "Convulsions/fits",
  severe_abdominal_pain: "Severe abdominal pain",
  fever: "Fever",
  reduced_fetal_movement: "Reduced fetal movement",
  water_broke: "Water broke/leaking",
  difficulty_breathing: "Difficulty breathing",
};

export const REASON_CATEGORIES = [
  "transport_or_distance",
  "cost",
  "forgot",
  "illness",
  "work_or_family",
  "felt_well",
  "travelled",
  "other",
  "unknown",
] as const;

export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

export const REASON_LABELS: Record<ReasonCategory, string> = {
  transport_or_distance: "Transport / distance",
  cost: "Cost",
  forgot: "Forgot",
  illness: "Illness",
  work_or_family: "Work / family duties",
  felt_well: "Felt well, saw no need",
  travelled: "Travelled",
  other: "Other",
  unknown: "Not stated",
};

export function dangerLabel(sign: string) {
  return DANGER_SIGN_LABELS[sign as DangerSign] ?? sign;
}

export function reasonLabel(category: string) {
  return REASON_LABELS[category as ReasonCategory] ?? category;
}
