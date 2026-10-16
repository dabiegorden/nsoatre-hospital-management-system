import { boolean, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt, type PersonSnapshot } from "./columns";
import { languageEnum, smsTemplateTypeEnum } from "./enums";

export const smsTemplates = pgTable("sms_templates", {
  id: id(),
  name: text().notNull().unique("sms_templates_name_unique"),
  message: text().notNull(),
  type: smsTemplateTypeEnum().notNull().default("general"),
  // Automatic reminders use the active template matching purpose + language
  // (see lib/reminders/templates.ts); built-in English text otherwise.
  purpose: text(),
  language: languageEnum().notNull().default("english"),
  isActive: boolean().notNull().default(true),
  createdBy: jsonb().$type<PersonSnapshot>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type NewSmsTemplate = typeof smsTemplates.$inferInsert;
