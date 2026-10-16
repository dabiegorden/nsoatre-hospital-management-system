import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts } from "./columns";
import { g6pdStatusEnum, hivRetestEnum, testResultEnum } from "./enums";
import { pregnantWomen } from "./pregnant-women";
import { users } from "./users";

/** Snapshot of a patient's record, kept as history of earlier visits. */
export const pastRecords = pgTable(
  "past_records",
  {
    id: id(),
    pregnantWomanId: text()
      .notNull()
      .references(() => pregnantWomen.id, { onDelete: "cascade" }),
    bloodPressure: text().notNull(),
    height: doublePrecision().notNull(),
    weight: doublePrecision().notNull(),
    gestationalAge: doublePrecision().notNull(),
    folicAcidSupplements: boolean().notNull().default(false),
    ironSupplements: boolean().notNull().default(false),
    hbsAgResult: testResultEnum().notNull().default("pending"),
    g6pdStatus: g6pdStatusEnum().notNull().default("pending"),
    sicklingStatus: testResultEnum().notNull().default("pending"),
    itnDistributed: boolean().notNull().default(false),
    itnDistributionDate: ts(),
    syphilisScreeningStatus: testResultEnum().notNull().default("pending"),
    syphilisTreatment: boolean().notNull().default(false),
    knownHivPositiveBeforePregnancy: boolean().notNull().default(false),
    artTreatmentBeforePregnancy: boolean().notNull().default(false),
    hivStatusAtRegistration: testResultEnum().notNull().default("pending"),
    artTreatmentAfterRegistration: boolean().notNull().default(false),
    hivRetestAt34Weeks: hivRetestEnum().notNull().default("not_done"),
    artTreatmentAfterRetest: boolean().notNull().default(false),
    tbScreeningCoughOver2Weeks: boolean().notNull().default(false),
    tbStatus: testResultEnum().notNull().default("pending"),
    tbTreatment: boolean().notNull().default(false),
    visitNotes: text(),
    visitDate: ts().notNull(),
    recordedById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.pregnantWomanId, t.visitDate),
    index().on(t.visitDate),
    check("past_records_height_check", sql`${t.height} BETWEEN 50 AND 250`),
    check("past_records_weight_check", sql`${t.weight} BETWEEN 20 AND 300`),
    check(
      "past_records_gestational_age_check",
      sql`${t.gestationalAge} BETWEEN 0 AND 42`
    ),
  ]
);

export type PastRecord = typeof pastRecords.$inferSelect;
export type NewPastRecord = typeof pastRecords.$inferInsert;
