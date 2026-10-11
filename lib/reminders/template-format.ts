/**
 * Placeholders staff can use in SMS templates. Pure helpers (no database),
 * shared by the engine, the templates page and unit tests.
 */

export const SMS_PURPOSES = [
  "dayBefore",
  "sameDay",
  "missedPatient",
  "relative",
  "deliveryReadiness",
] as const;

export type SmsPurpose = (typeof SMS_PURPOSES)[number];

export const SMS_PURPOSE_LABELS: Record<SmsPurpose, string> = {
  dayBefore: "Reminder — day before the visit",
  sameDay: "Reminder — morning of the visit",
  missedPatient: "Missed visit — to the patient",
  relative: "Patient unreachable — to her relative",
  deliveryReadiness: "Delivery readiness (≈ 36 weeks)",
};

export const SMS_PLACEHOLDERS = {
  "{name}": "Patient's first name",
  "{date}": "Appointment date and time",
  "{location}": "Appointment location",
  "{dueDate}": "Expected delivery date",
} as const;

export type TemplateVars = Partial<Record<"name" | "date" | "location" | "dueDate", string>>;

/** Replaces {name}, {date}, {location} and {dueDate}; unknown braces are kept. */
export function fillTemplate(template: string, vars: TemplateVars) {
  return template.replace(/\{(name|date|location|dueDate)\}/g, (match, key: keyof TemplateVars) =>
    vars[key] ?? match
  );
}
