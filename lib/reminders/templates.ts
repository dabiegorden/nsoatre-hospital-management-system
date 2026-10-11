import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fillTemplate, type SmsPurpose, type TemplateVars } from "@/lib/reminders/template-format";
import { pregnantWomen, smsTemplates } from "@/models/schema";

/** The patient's preferred language, used to choose an SMS template. */
export async function patientLanguage(patientId: string | null | undefined) {
  if (!patientId) return null;
  const [row] = await db
    .select({ language: pregnantWomen.preferredLanguage })
    .from(pregnantWomen)
    .where(eq(pregnantWomen.id, patientId));
  return row?.language ?? null;
}

/**
 * Returns the SMS text for a reminder: the active staff-written template for
 * this purpose in the patient's language (e.g. Twi) when one exists, then an
 * English template, then the built-in English text.
 */
export async function composeSms(
  purpose: SmsPurpose,
  language: "twi" | "english" | null,
  vars: TemplateVars,
  builtIn: string
): Promise<string> {
  const languages = language === "twi" ? (["twi", "english"] as const) : (["english"] as const);
  for (const lang of languages) {
    const [template] = await db
      .select({ message: smsTemplates.message })
      .from(smsTemplates)
      .where(
        and(
          eq(smsTemplates.purpose, purpose),
          eq(smsTemplates.language, lang),
          eq(smsTemplates.isActive, true)
        )
      )
      .orderBy(desc(smsTemplates.updatedAt))
      .limit(1);
    if (template) return fillTemplate(template.message, vars);
  }
  return builtIn;
}
