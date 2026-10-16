import { pgEnum } from "drizzle-orm/pg-core";

// Postgres enum types, each followed by the TypeScript union of its values.

/** admin: full access, manages users. staff: adds and edits records, cannot delete. */
export const userRoleEnum = pgEnum("user_role", ["admin", "staff"]);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "missed",
  "rescheduled",
  "cancelled",
]);
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];

export const testResultEnum = pgEnum("test_result", [
  "positive",
  "negative",
  "pending",
]);
export type TestResult = (typeof testResultEnum.enumValues)[number];

export const g6pdStatusEnum = pgEnum("g6pd_status", [
  "normal",
  "deficient",
  "pending",
]);
export type G6pdStatus = (typeof g6pdStatusEnum.enumValues)[number];

export const hivRetestEnum = pgEnum("hiv_retest_status", [
  "positive",
  "negative",
  "pending",
  "not_done",
]);
export type HivRetestStatus = (typeof hivRetestEnum.enumValues)[number];

export const maritalStatusEnum = pgEnum("marital_status", [
  "single",
  "married",
  "divorced",
  "widowed",
]);
export type MaritalStatus = (typeof maritalStatusEnum.enumValues)[number];

export const bloodGroupEnum = pgEnum("blood_group", ["A", "B", "AB", "O"]);
export type BloodGroup = (typeof bloodGroupEnum.enumValues)[number];

export const rhFactorEnum = pgEnum("rh_factor", ["positive", "negative"]);
export type RhFactor = (typeof rhFactorEnum.enumValues)[number];

export const sexEnum = pgEnum("sex", ["male", "female", "other"]);
export type Sex = (typeof sexEnum.enumValues)[number];

export const nutritionStatusEnum = pgEnum("nutrition_status", [
  "normal",
  "moderate_underweight",
  "stunted",
  "severe_underweight",
  "severe_stunted",
]);
export type NutritionStatus = (typeof nutritionStatusEnum.enumValues)[number];

export const reminderTypeEnum = pgEnum("reminder_type", ["sms", "voice"]);
export type ReminderType = (typeof reminderTypeEnum.enumValues)[number];

export const reminderStatusEnum = pgEnum("reminder_status", [
  "pending",
  "sent",
  "failed",
]);
export type ReminderStatus = (typeof reminderStatusEnum.enumValues)[number];

export const smsTemplateTypeEnum = pgEnum("sms_template_type", [
  "appointment_reminder",
  "missed_appointment",
  "general",
]);
export type SmsTemplateType = (typeof smsTemplateTypeEnum.enumValues)[number];

export const languageEnum = pgEnum("call_language", ["twi", "english"]);
export type CallLanguage = (typeof languageEnum.enumValues)[number];

export const followUpStatusEnum = pgEnum("follow_up_status", [
  "none",
  "assigned",
  "visited",
  "returned",
]);
export type FollowUpStatus = (typeof followUpStatusEnum.enumValues)[number];

export const callProviderEnum = pgEnum("call_provider", ["vapi", "arkesel"]);
export type CallProvider = (typeof callProviderEnum.enumValues)[number];

export const callKindEnum = pgEnum("call_kind", ["automatic", "manual", "test"]);
export type CallKind = (typeof callKindEnum.enumValues)[number];

export const callStatusEnum = pgEnum("call_status", [
  "queued",
  "ringing",
  "in-progress",
  "ended",
  "failed",
]);
export type CallStatus = (typeof callStatusEnum.enumValues)[number];
