import { SMS_PURPOSES } from "@/lib/reminders/template-format";
import {
  languageEnum,
  smsTemplateTypeEnum,
  type NewSmsTemplate,
} from "@/models/schema";

const TEMPLATE_TYPES = smsTemplateTypeEnum.enumValues;
const LANGUAGES = languageEnum.enumValues;

/** True when `value` is one of `options` (narrows it to that union). */
const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

/** Validates SMS template fields for create (partial = false) and update. */
export function validateTemplateInput(
  body: Record<string, unknown>,
  partial: boolean
) {
  const errors: string[] = [];
  const values: Partial<NewSmsTemplate> = {};

  for (const key of ["name", "message"] as const) {
    const raw = body[key];
    if (raw !== undefined || !partial) {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) errors.push(`${key} is required`);
      else values[key] = value;
    }
  }
  if (body.type !== undefined) {
    if (!isOneOf(TEMPLATE_TYPES, body.type)) errors.push(`type must be one of: ${TEMPLATE_TYPES.join(", ")}`);
    else values.type = body.type;
  }
  if (body.purpose !== undefined) {
    if (body.purpose === null || body.purpose === "") values.purpose = null;
    else if (isOneOf(SMS_PURPOSES, body.purpose)) values.purpose = body.purpose;
    else errors.push(`purpose must be one of: ${SMS_PURPOSES.join(", ")}`);
  }
  if (body.language !== undefined) {
    if (!isOneOf(LANGUAGES, body.language)) errors.push("language must be english or twi");
    else values.language = body.language;
  }
  if (body.isActive !== undefined) values.isActive = Boolean(body.isActive);
  if (values.message && values.message.length > 459) {
    errors.push("message must be at most 459 characters (3 SMS)");
  }
  return { values, errors };
}
