import { SMS_PURPOSES } from "@/lib/reminders/template-format";
import type { smsTemplates } from "@/models/schema";

const TEMPLATE_TYPES = ["appointment_reminder", "missed_appointment", "general"] as const;
const LANGUAGES = ["english", "twi"] as const;

/** Validates SMS template fields for create (partial = false) and update. */
export function validateTemplateInput(body: any, partial: boolean) {
  const errors: string[] = [];
  const values: Partial<typeof smsTemplates.$inferInsert> = {};

  for (const key of ["name", "message"] as const) {
    if (body[key] !== undefined || !partial) {
      const value = typeof body[key] === "string" ? body[key].trim() : "";
      if (!value) errors.push(`${key} is required`);
      else values[key] = value;
    }
  }
  if (body.type !== undefined) {
    if (!TEMPLATE_TYPES.includes(body.type)) errors.push(`type must be one of: ${TEMPLATE_TYPES.join(", ")}`);
    else values.type = body.type;
  }
  if (body.purpose !== undefined) {
    if (body.purpose !== null && body.purpose !== "" && !SMS_PURPOSES.includes(body.purpose)) {
      errors.push(`purpose must be one of: ${SMS_PURPOSES.join(", ")}`);
    } else values.purpose = body.purpose || null;
  }
  if (body.language !== undefined) {
    if (!LANGUAGES.includes(body.language)) errors.push("language must be english or twi");
    else values.language = body.language;
  }
  if (body.isActive !== undefined) values.isActive = Boolean(body.isActive);
  if (values.message && values.message.length > 459) {
    errors.push("message must be at most 459 characters (3 SMS)");
  }
  return { values, errors };
}
