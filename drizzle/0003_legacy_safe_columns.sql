CREATE TABLE "past_appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"patient_phone_number" text NOT NULL,
	"relative_phone_number" text,
	"appointment_location" text,
	"appointment_date" timestamp with time zone NOT NULL,
	"appointment_time" text NOT NULL,
	"appointment_date_time" timestamp with time zone NOT NULL,
	"status" "appointment_status" NOT NULL,
	"notes" text,
	"created_by_id" text,
	"patient_id" text,
	"voice_call_attempts" integer DEFAULT 0 NOT NULL,
	"missed_notification_sent" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pregnant_women" DROP CONSTRAINT "pregnant_women_folderNumber_unique";--> statement-breakpoint
ALTER TABLE "public_health_records" DROP CONSTRAINT "public_health_records_registrationNumber_unique";--> statement-breakpoint
DROP INDEX "pregnant_women_phone_number_index";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "appointment_location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pregnant_women" ALTER COLUMN "folder_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pregnant_women" ALTER COLUMN "marital_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "past_appointments" ADD CONSTRAINT "past_appointments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_appointments" ADD CONSTRAINT "past_appointments_patient_id_pregnant_women_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."pregnant_women"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "past_appointments_patient_id_appointment_date_index" ON "past_appointments" USING btree ("patient_id","appointment_date");--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD CONSTRAINT "pregnant_women_phone_number_unique" UNIQUE("phone_number");--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD CONSTRAINT "pregnant_women_folder_number_unique" UNIQUE("folder_number");--> statement-breakpoint
ALTER TABLE "public_health_records" ADD CONSTRAINT "public_health_records_registration_number_unique" UNIQUE("registration_number");