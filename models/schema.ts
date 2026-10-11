import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// IDs are text primary keys holding random UUIDs.
const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const ts = () => timestamp({ withTimezone: true, mode: "date" });

const createdAt = () => ts().notNull().defaultNow();
const updatedAt = () =>
  ts()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "missed",
  "rescheduled",
  "cancelled",
]);

export const testResultEnum = pgEnum("test_result", [
  "positive",
  "negative",
  "pending",
]);

export const g6pdStatusEnum = pgEnum("g6pd_status", [
  "normal",
  "deficient",
  "pending",
]);

export const hivRetestEnum = pgEnum("hiv_retest_status", [
  "positive",
  "negative",
  "pending",
  "not_done",
]);

export const maritalStatusEnum = pgEnum("marital_status", [
  "single",
  "married",
  "divorced",
  "widowed",
]);

export const bloodGroupEnum = pgEnum("blood_group", ["A", "B", "AB", "O"]);

export const rhFactorEnum = pgEnum("rh_factor", ["positive", "negative"]);

export const sexEnum = pgEnum("sex", ["male", "female", "other"]);

export const nutritionStatusEnum = pgEnum("nutrition_status", [
  "normal",
  "moderate_underweight",
  "stunted",
  "severe_underweight",
  "severe_stunted",
]);

export const reminderTypeEnum = pgEnum("reminder_type", ["sms", "voice"]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "pending",
  "sent",
  "failed",
]);

export const smsTemplateTypeEnum = pgEnum("sms_template_type", [
  "appointment_reminder",
  "missed_appointment",
  "general",
]);

export type PersonSnapshot = { name?: string; email?: string };

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text().notNull().unique("users_email_unique"),
    password: text().notNull(),
    name: text().notNull(),
    phoneNumber: text(), // optional for accounts created outside the app; the API requires it
    role: userRoleEnum().notNull().default("user"),
    resetCode: text(),
    resetCodeExpiry: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.createdAt), index().on(t.role)]
);

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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.appointmentDateTime),
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


export const visitRecords = pgTable(
  "visit_records",
  {
    id: id(),
    pregnantWomanId: text()
      .notNull()
      .references(() => pregnantWomen.id, { onDelete: "cascade" }),
    gestationalAge: doublePrecision().notNull(),
    bloodPressure: text().notNull(),
    hb: text().notNull().default(""),
    sfh: text().notNull().default(""),
    rbs: text().notNull().default(""),
    weight: doublePrecision().notNull(),
    urineProtein: text().notNull().default(""),
    complaint: text().notNull().default(""),
    visitDate: ts().notNull().defaultNow(),
    recordedById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.pregnantWomanId, t.visitDate),
    index().on(t.visitDate),
    check(
      "visit_records_gestational_age_check",
      sql`${t.gestationalAge} BETWEEN 0 AND 42`
    ),
    check("visit_records_weight_check", sql`${t.weight} BETWEEN 20 AND 300`),
  ]
);

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

export const smsTemplates = pgTable("sms_templates", {
  id: id(),
  name: text().notNull().unique("sms_templates_name_unique"),
  message: text().notNull(),
  type: smsTemplateTypeEnum().notNull().default("general"),
  isActive: boolean().notNull().default(true),
  createdBy: jsonb().$type<PersonSnapshot>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Relations (used by db.query.* relational queries)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  pregnantWomen: many(pregnantWomen),
  appointments: many(appointments),
}));

export const pregnantWomenRelations = relations(
  pregnantWomen,
  ({ one, many }) => ({
    registeredBy: one(users, {
      fields: [pregnantWomen.registeredById],
      references: [users.id],
    }),
    appointments: many(appointments),
    visitRecords: many(visitRecords),
    pastRecords: many(pastRecords),
  })
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(pregnantWomen, {
    fields: [appointments.patientId],
    references: [pregnantWomen.id],
  }),
  createdBy: one(users, {
    fields: [appointments.createdById],
    references: [users.id],
  }),
}));

export const visitRecordsRelations = relations(visitRecords, ({ one }) => ({
  pregnantWoman: one(pregnantWomen, {
    fields: [visitRecords.pregnantWomanId],
    references: [pregnantWomen.id],
  }),
  recordedBy: one(users, {
    fields: [visitRecords.recordedById],
    references: [users.id],
  }),
}));

export const pastRecordsRelations = relations(pastRecords, ({ one }) => ({
  pregnantWoman: one(pregnantWomen, {
    fields: [pastRecords.pregnantWomanId],
    references: [pregnantWomen.id],
  }),
  recordedBy: one(users, {
    fields: [pastRecords.recordedById],
    references: [users.id],
  }),
}));

export const publicHealthRecordsRelations = relations(
  publicHealthRecords,
  ({ one }) => ({
    recordedBy: one(users, {
      fields: [publicHealthRecords.recordedById],
      references: [users.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type PregnantWoman = typeof pregnantWomen.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
