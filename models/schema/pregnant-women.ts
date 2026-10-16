import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./columns";
import {
  bloodGroupEnum,
  followUpStatusEnum,
  g6pdStatusEnum,
  hivRetestEnum,
  languageEnum,
  maritalStatusEnum,
  rhFactorEnum,
  testResultEnum,
} from "./enums";
import { users } from "./users";

export const pregnantWomen = pgTable(
  "pregnant_women",
  {
    id: id(),

    // Personal Information
    fullName: text().notNull(),
    residentialAddress: text().notNull(),
    phoneNumber: text().notNull().unique("pregnant_women_phone_number_unique"),
    age: doublePrecision().notNull(),
    folderNumber: text()
      .notNull()
      .unique("pregnant_women_folder_number_unique"),
    maritalStatus: maritalStatusEnum().notNull(),
    location: text().notNull().default(""),
    urineProtein: text().notNull().default(""),
    hb: text().notNull().default(""),
    rbs: text().notNull().default(""),
    sfh: text().notNull().default(""),

    // Medical Measurements
    parity: text().notNull(),
    bloodPressure: text().notNull(),
    height: doublePrecision().notNull(),
    weight: doublePrecision().notNull(),
    gestationalAge: doublePrecision().notNull(),
    expectedDeliveryDate: ts().notNull(),

    // Supplements
    folicAcidSupplements: boolean().notNull().default(false),
    ironSupplements: boolean().notNull().default(false),

    // Test Results
    hbsAgResult: testResultEnum().notNull().default("pending"),
    g6pdStatus: g6pdStatusEnum().notNull().default("pending"),
    bloodGroup: bloodGroupEnum().notNull(),
    rhFactor: rhFactorEnum().notNull(),
    sicklingStatus: testResultEnum().notNull().default("pending"),

    // ITN Distribution
    itnDistributed: boolean().notNull().default(false),
    itnDistributionDate: ts(),

    // Syphilis
    syphilisScreeningStatus: testResultEnum().notNull().default("pending"),
    syphilisTreatment: boolean().notNull().default(false),

    // HIV
    knownHivPositiveBeforePregnancy: boolean().notNull().default(false),
    artTreatmentBeforePregnancy: boolean().notNull().default(false),
    hivStatusAtRegistration: testResultEnum().notNull().default("pending"),
    artTreatmentAfterRegistration: boolean().notNull().default(false),
    hivRetestAt34Weeks: hivRetestEnum().notNull().default("not_done"),
    artTreatmentAfterRetest: boolean().notNull().default(false),

    // TB
    tbScreeningCoughOver2Weeks: boolean().notNull().default(false),
    tbStatus: testResultEnum().notNull().default("pending"),
    tbTreatment: boolean().notNull().default(false),

    // Reminders: language chosen on a previous call skips the IVR menu
    preferredLanguage: languageEnum(),
    deliveryReadinessSentAt: ts(),

    // Defaulter follow-up by a community health nurse
    followUpStatus: followUpStatusEnum().notNull().default("none"),
    followUpAssigneeId: text().references(() => users.id, {
      onDelete: "set null",
    }),
    followUpNote: text(),
    followUpUpdatedAt: ts(),

    // Metadata
    registeredById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.expectedDeliveryDate),
    index().on(t.createdAt),
    index().on(t.registeredById),
    check("pregnant_women_age_check", sql`${t.age} BETWEEN 10 AND 60`),
    check("pregnant_women_height_check", sql`${t.height} BETWEEN 50 AND 250`),
    check("pregnant_women_weight_check", sql`${t.weight} BETWEEN 20 AND 300`),
    check(
      "pregnant_women_gestational_age_check",
      sql`${t.gestationalAge} BETWEEN 0 AND 42`
    ),
  ]
);

export type PregnantWoman = typeof pregnantWomen.$inferSelect;
export type NewPregnantWoman = typeof pregnantWomen.$inferInsert;
