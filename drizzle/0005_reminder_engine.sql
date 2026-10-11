CREATE TYPE "public"."call_kind" AS ENUM('automatic', 'manual', 'test');--> statement-breakpoint
CREATE TYPE "public"."call_provider" AS ENUM('vapi', 'arkesel');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('queued', 'ringing', 'in-progress', 'ended', 'failed');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('none', 'assigned', 'visited', 'returned');--> statement-breakpoint
CREATE TYPE "public"."call_language" AS ENUM('twi', 'english');--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text,
	"pregnant_woman_id" text,
	"patient_name" text,
	"phone_number" text,
	"provider" "call_provider" NOT NULL,
	"kind" "call_kind" NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"provider_call_id" text,
	"status" "call_status" DEFAULT 'queued' NOT NULL,
	"ended_reason" text,
	"answered" boolean,
	"language" "call_language",
	"duration_seconds" double precision,
	"cost" double precision,
	"summary" text,
	"reason_for_missing" text,
	"reason_category" text,
	"danger_signs" jsonb,
	"wants_to_reschedule" boolean,
	"preferred_return_date" text,
	"transcript" text,
	"recording_url" text,
	"outcome_processed_at" timestamp with time zone,
	"danger_alert_sent_at" timestamp with time zone,
	"error" text,
	"initiated_by" jsonb,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_logs_provider_call_id_unique" UNIQUE("provider_call_id")
);
--> statement-breakpoint
CREATE TABLE "scheduler_locks" (
	"name" text PRIMARY KEY NOT NULL,
	"locked_until" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_result" jsonb
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "day_before_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "same_day_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "missed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "next_call_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "relative_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "escalated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "follow_up_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "auto_scheduled_from_id" text;--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD COLUMN "preferred_language" "call_language";--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD COLUMN "delivery_readiness_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD COLUMN "follow_up_status" "follow_up_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD COLUMN "follow_up_assignee_id" text;--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD COLUMN "follow_up_note" text;--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD COLUMN "follow_up_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_pregnant_woman_id_pregnant_women_id_fk" FOREIGN KEY ("pregnant_woman_id") REFERENCES "public"."pregnant_women"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_logs_appointment_id_index" ON "call_logs" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "call_logs_pregnant_woman_id_index" ON "call_logs" USING btree ("pregnant_woman_id");--> statement-breakpoint
CREATE INDEX "call_logs_created_at_index" ON "call_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "call_logs_status_outcome_processed_at_index" ON "call_logs" USING btree ("status","outcome_processed_at");--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD CONSTRAINT "pregnant_women_follow_up_assignee_id_users_id_fk" FOREIGN KEY ("follow_up_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_status_next_call_at_index" ON "appointments" USING btree ("status","next_call_at");