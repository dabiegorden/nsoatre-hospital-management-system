import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, type PersonSnapshot } from "./columns";
import { reminderStatusEnum, reminderTypeEnum } from "./enums";

// appointmentId has no foreign key on purpose, so reminder logs survive
// when their appointment is deleted.
export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: id(),
    appointmentId: text().notNull(),
    patientName: text(),
    patientPhoneNumber: text(),
    reminderType: reminderTypeEnum().notNull(),
    status: reminderStatusEnum().notNull().default("pending"),
    message: text(),
    response: jsonb(),
    sentBy: jsonb().$type<PersonSnapshot>(),
    sentAt: ts(),
    error: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.createdAt),
    index().on(t.reminderType, t.status),
    index().on(t.appointmentId),
  ]
);

export type ReminderLog = typeof reminderLogs.$inferSelect;
export type NewReminderLog = typeof reminderLogs.$inferInsert;
