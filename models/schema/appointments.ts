import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./columns";
import { appointmentStatusEnum } from "./enums";
import { pregnantWomen } from "./pregnant-women";
import { users } from "./users";

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    patientName: text().notNull(),
    patientPhoneNumber: text().notNull(),
    relativePhoneNumber: text(),
    appointmentLocation: text().notNull(),
    appointmentDate: ts().notNull(),
    appointmentTime: text().notNull(), // HH:mm
    appointmentDateTime: ts().notNull(), // date + time combined
    status: appointmentStatusEnum().notNull().default("scheduled"),
    notes: text(),
    createdById: text().references(() => users.id, { onDelete: "set null" }),
    patientId: text().references(() => pregnantWomen.id, {
      onDelete: "set null",
    }),
    reminderSent: boolean().notNull().default(false),
    callAttempts: integer().notNull().default(0),
    voiceCallAttempts: integer().notNull().default(0),
    missedNotificationSent: boolean().notNull().default(false),
    missedCheckProcessed: boolean().notNull().default(false),
    lastCallAttempt: ts(),

    // Automatic reminder pipeline (see lib/reminders/engine.ts). Each step
    // is claimed by setting its timestamp, so it runs at most once.
    dayBeforeReminderAt: ts(),
    sameDayReminderAt: ts(),
    missedAt: ts(),
    nextCallAt: ts(),
    relativeNotifiedAt: ts(),
    escalatedAt: ts(),
    followUpCompletedAt: ts(), // patient reached; stops the call chain
    autoScheduledFromId: text(), // set when created by the WHO ANC schedule

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.appointmentDateTime),
    index().on(t.status, t.nextCallAt),
    index().on(t.status),
    index().on(t.createdAt),
    index().on(t.patientPhoneNumber),
    index().on(t.patientId),
    index().on(t.missedNotificationSent),
    index().on(t.missedCheckProcessed, t.appointmentDateTime),
    check(
      "appointments_time_check",
      sql`${t.appointmentTime} ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'`
    ),
  ]
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
