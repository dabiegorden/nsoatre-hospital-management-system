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
import { nutritionStatusEnum, sexEnum } from "./enums";
import { users } from "./users";

/** Child Welfare Clinic, Link to Care and nutrition records. */
export const publicHealthRecords = pgTable(
  "public_health_records",
  {
    id: id(),

    // Child Welfare Clinic
    registrationNumber: text()
      .notNull()
      .unique("public_health_records_registration_number_unique"),
    childName: text().notNull(),
    motherName: text().notNull(),
    vaccinationGiven: text().notNull(),
    lastDateOfVisit: ts().notNull(),
    followUpDate: ts().notNull(),

    // Link to Care
    name: text().notNull(),
    diagnosis: text().notNull(),
    dateOfDischarge: ts().notNull(),
    phoneNumber: text().notNull(),
    chpZone: text().notNull(),
    recordDate: ts().notNull(),
    feedback: text(),

    // Additional Tracking
    homeVisit: boolean().notNull().default(false),
    physicalExamination: boolean().notNull().default(false),
    referralNote: boolean().notNull().default(false),
    bloodPressure: text(),

    // Nutrition
    age: doublePrecision(),
    sex: sexEnum(),
    weight: doublePrecision(),
    height: doublePrecision(),
    muac: doublePrecision(), // Mid-Upper Arm Circumference
    wh: doublePrecision(), // Weight/Height ratio
    nutritionStatus: nutritionStatusEnum(),
    nutritionRecommendation: text(),
    address: text(),
    remarks: text(),
    dmHptStatus: text(),

    // Metadata
    recordedById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.childName),
    index().on(t.recordDate),
    index().on(t.createdAt),
    index().on(t.recordedById),
    check("public_health_records_age_check", sql`${t.age} BETWEEN 0 AND 18`),
    check(
      "public_health_records_weight_check",
      sql`${t.weight} BETWEEN 1 AND 100`
    ),
    check(
      "public_health_records_height_check",
      sql`${t.height} BETWEEN 30 AND 200`
    ),
    check("public_health_records_muac_check", sql`${t.muac} BETWEEN 5 AND 50`),
    check("public_health_records_wh_check", sql`${t.wh} BETWEEN 0 AND 200`),
  ]
);

export type PublicHealthRecord = typeof publicHealthRecords.$inferSelect;
export type NewPublicHealthRecord = typeof publicHealthRecords.$inferInsert;
