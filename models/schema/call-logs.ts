import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, type PersonSnapshot } from "./columns";
import {
  callKindEnum,
  callProviderEnum,
  callStatusEnum,
  languageEnum,
} from "./enums";
import { appointments } from "./appointments";
import { pregnantWomen } from "./pregnant-women";

// One row per reminder call (Vapi IVR call or Arkesel voice fallback), with
// the outcome extracted after the call.
export const callLogs = pgTable(
  "call_logs",
  {
    id: id(),
    appointmentId: text().references(() => appointments.id, {
      onDelete: "set null",
    }),
    pregnantWomanId: text().references(() => pregnantWomen.id, {
      onDelete: "set null",
    }),
    patientName: text(),
    phoneNumber: text(),
    provider: callProviderEnum().notNull(),
    kind: callKindEnum().notNull(),
    attempt: integer().notNull().default(1),
    providerCallId: text().unique("call_logs_provider_call_id_unique"),
    status: callStatusEnum().notNull().default("queued"),
    endedReason: text(),
    answered: boolean(),
    language: languageEnum(),
    durationSeconds: doublePrecision(),
    cost: doublePrecision(),
    summary: text(),
    reasonForMissing: text(),
    reasonCategory: text(),
    dangerSigns: jsonb().$type<string[]>(),
    wantsToReschedule: boolean(),
    preferredReturnDate: text(),
    transcript: text(),
    recordingUrl: text(),
    outcomeProcessedAt: ts(),
    dangerAlertSentAt: ts(),
    error: text(),
    initiatedBy: jsonb().$type<PersonSnapshot>(),
    startedAt: ts(),
    endedAt: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.appointmentId),
    index().on(t.pregnantWomanId),
    index().on(t.createdAt),
    index().on(t.status, t.outcomeProcessedAt),
  ]
);

export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;
