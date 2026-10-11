CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'missed', 'rescheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."blood_group" AS ENUM('A', 'B', 'AB', 'O');--> statement-breakpoint
CREATE TYPE "public"."g6pd_status" AS ENUM('normal', 'deficient', 'pending');--> statement-breakpoint
CREATE TYPE "public"."hiv_retest_status" AS ENUM('positive', 'negative', 'pending', 'not_done');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('single', 'married', 'divorced', 'widowed');--> statement-breakpoint
CREATE TYPE "public"."nutrition_status" AS ENUM('normal', 'moderate_underweight', 'stunted', 'severe_underweight', 'severe_stunted');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('sms', 'voice');--> statement-breakpoint
CREATE TYPE "public"."rh_factor" AS ENUM('positive', 'negative');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."sms_template_type" AS ENUM('appointment_reminder', 'missed_appointment', 'general');--> statement-breakpoint
CREATE TYPE "public"."test_result" AS ENUM('positive', 'negative', 'pending');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"patient_phone_number" text NOT NULL,
	"relative_phone_number" text,
	"appointment_location" text NOT NULL,
	"appointment_date" timestamp with time zone NOT NULL,
	"appointment_time" text NOT NULL,
	"appointment_date_time" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by_id" text,
	"patient_id" text,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"call_attempts" integer DEFAULT 0 NOT NULL,
	"voice_call_attempts" integer DEFAULT 0 NOT NULL,
	"missed_notification_sent" boolean DEFAULT false NOT NULL,
	"missed_check_processed" boolean DEFAULT false NOT NULL,
	"last_call_attempt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_time_check" CHECK ("appointments"."appointment_time" ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
CREATE TABLE "past_records" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnant_woman_id" text NOT NULL,
	"blood_pressure" text NOT NULL,
	"height" double precision NOT NULL,
	"weight" double precision NOT NULL,
	"gestational_age" double precision NOT NULL,
	"folic_acid_supplements" boolean DEFAULT false NOT NULL,
	"iron_supplements" boolean DEFAULT false NOT NULL,
	"hbs_ag_result" "test_result" DEFAULT 'pending' NOT NULL,
	"g6pd_status" "g6pd_status" DEFAULT 'pending' NOT NULL,
	"sickling_status" "test_result" DEFAULT 'pending' NOT NULL,
	"itn_distributed" boolean DEFAULT false NOT NULL,
	"itn_distribution_date" timestamp with time zone,
	"syphilis_screening_status" "test_result" DEFAULT 'pending' NOT NULL,
	"syphilis_treatment" boolean DEFAULT false NOT NULL,
	"known_hiv_positive_before_pregnancy" boolean DEFAULT false NOT NULL,
	"art_treatment_before_pregnancy" boolean DEFAULT false NOT NULL,
	"hiv_status_at_registration" "test_result" DEFAULT 'pending' NOT NULL,
	"art_treatment_after_registration" boolean DEFAULT false NOT NULL,
	"hiv_retest_at34_weeks" "hiv_retest_status" DEFAULT 'not_done' NOT NULL,
	"art_treatment_after_retest" boolean DEFAULT false NOT NULL,
	"tb_screening_cough_over2_weeks" boolean DEFAULT false NOT NULL,
	"tb_status" "test_result" DEFAULT 'pending' NOT NULL,
	"tb_treatment" boolean DEFAULT false NOT NULL,
	"visit_notes" text,
	"visit_date" timestamp with time zone NOT NULL,
	"recorded_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "past_records_height_check" CHECK ("past_records"."height" BETWEEN 50 AND 250),
	CONSTRAINT "past_records_weight_check" CHECK ("past_records"."weight" BETWEEN 20 AND 300),
	CONSTRAINT "past_records_gestational_age_check" CHECK ("past_records"."gestational_age" BETWEEN 0 AND 42)
);
--> statement-breakpoint
CREATE TABLE "pregnant_women" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"residential_address" text NOT NULL,
	"phone_number" text NOT NULL,
	"age" double precision NOT NULL,
	"folder_number" text NOT NULL,
	"marital_status" "marital_status" NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"urine_protein" text DEFAULT '' NOT NULL,
	"hb" text DEFAULT '' NOT NULL,
	"rbs" text DEFAULT '' NOT NULL,
	"sfh" text DEFAULT '' NOT NULL,
	"parity" text NOT NULL,
	"blood_pressure" text NOT NULL,
	"height" double precision NOT NULL,
	"weight" double precision NOT NULL,
	"gestational_age" double precision NOT NULL,
	"expected_delivery_date" timestamp with time zone NOT NULL,
	"folic_acid_supplements" boolean DEFAULT false NOT NULL,
	"iron_supplements" boolean DEFAULT false NOT NULL,
	"hbs_ag_result" "test_result" DEFAULT 'pending' NOT NULL,
	"g6pd_status" "g6pd_status" DEFAULT 'pending' NOT NULL,
	"blood_group" "blood_group" NOT NULL,
	"rh_factor" "rh_factor" NOT NULL,
	"sickling_status" "test_result" DEFAULT 'pending' NOT NULL,
	"itn_distributed" boolean DEFAULT false NOT NULL,
	"itn_distribution_date" timestamp with time zone,
	"syphilis_screening_status" "test_result" DEFAULT 'pending' NOT NULL,
	"syphilis_treatment" boolean DEFAULT false NOT NULL,
	"known_hiv_positive_before_pregnancy" boolean DEFAULT false NOT NULL,
	"art_treatment_before_pregnancy" boolean DEFAULT false NOT NULL,
	"hiv_status_at_registration" "test_result" DEFAULT 'pending' NOT NULL,
	"art_treatment_after_registration" boolean DEFAULT false NOT NULL,
	"hiv_retest_at34_weeks" "hiv_retest_status" DEFAULT 'not_done' NOT NULL,
	"art_treatment_after_retest" boolean DEFAULT false NOT NULL,
	"tb_screening_cough_over2_weeks" boolean DEFAULT false NOT NULL,
	"tb_status" "test_result" DEFAULT 'pending' NOT NULL,
	"tb_treatment" boolean DEFAULT false NOT NULL,
	"registered_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pregnant_women_folderNumber_unique" UNIQUE("folder_number"),
	CONSTRAINT "pregnant_women_age_check" CHECK ("pregnant_women"."age" BETWEEN 10 AND 60),
	CONSTRAINT "pregnant_women_height_check" CHECK ("pregnant_women"."height" BETWEEN 50 AND 250),
	CONSTRAINT "pregnant_women_weight_check" CHECK ("pregnant_women"."weight" BETWEEN 20 AND 300),
	CONSTRAINT "pregnant_women_gestational_age_check" CHECK ("pregnant_women"."gestational_age" BETWEEN 0 AND 42)
);
--> statement-breakpoint
CREATE TABLE "public_health_records" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_number" text NOT NULL,
	"child_name" text NOT NULL,
	"mother_name" text NOT NULL,
	"vaccination_given" text NOT NULL,
	"last_date_of_visit" timestamp with time zone NOT NULL,
	"follow_up_date" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"diagnosis" text NOT NULL,
	"date_of_discharge" timestamp with time zone NOT NULL,
	"phone_number" text NOT NULL,
	"chp_zone" text NOT NULL,
	"record_date" timestamp with time zone NOT NULL,
	"feedback" text,
	"home_visit" boolean DEFAULT false NOT NULL,
	"physical_examination" boolean DEFAULT false NOT NULL,
	"referral_note" boolean DEFAULT false NOT NULL,
	"blood_pressure" text,
	"age" double precision,
	"sex" "sex",
	"weight" double precision,
	"height" double precision,
	"muac" double precision,
	"wh" double precision,
	"nutrition_status" "nutrition_status",
	"nutrition_recommendation" text,
	"address" text,
	"remarks" text,
	"dm_hpt_status" text,
	"recorded_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_health_records_registrationNumber_unique" UNIQUE("registration_number"),
	CONSTRAINT "public_health_records_age_check" CHECK ("public_health_records"."age" BETWEEN 0 AND 18),
	CONSTRAINT "public_health_records_weight_check" CHECK ("public_health_records"."weight" BETWEEN 1 AND 100),
	CONSTRAINT "public_health_records_height_check" CHECK ("public_health_records"."height" BETWEEN 30 AND 200),
	CONSTRAINT "public_health_records_muac_check" CHECK ("public_health_records"."muac" BETWEEN 5 AND 50),
	CONSTRAINT "public_health_records_wh_check" CHECK ("public_health_records"."wh" BETWEEN 0 AND 200)
);
--> statement-breakpoint
CREATE TABLE "reminder_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"patient_name" text,
	"patient_phone_number" text,
	"reminder_type" "reminder_type" NOT NULL,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"response" jsonb,
	"sent_by" jsonb,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"type" "sms_template_type" DEFAULT 'general' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"reset_code" text,
	"reset_code_expiry" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visit_records" (
	"id" text PRIMARY KEY NOT NULL,
	"pregnant_woman_id" text NOT NULL,
	"gestational_age" double precision NOT NULL,
	"blood_pressure" text NOT NULL,
	"hb" text DEFAULT '' NOT NULL,
	"sfh" text DEFAULT '' NOT NULL,
	"rbs" text DEFAULT '' NOT NULL,
	"weight" double precision NOT NULL,
	"urine_protein" text DEFAULT '' NOT NULL,
	"complaint" text DEFAULT '' NOT NULL,
	"visit_date" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_records_gestational_age_check" CHECK ("visit_records"."gestational_age" BETWEEN 0 AND 42),
	CONSTRAINT "visit_records_weight_check" CHECK ("visit_records"."weight" BETWEEN 20 AND 300)
);
--> statement-breakpoint
ALTER TABLE "demo_users" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_pregnant_women_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."pregnant_women"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_records" ADD CONSTRAINT "past_records_pregnant_woman_id_pregnant_women_id_fk" FOREIGN KEY ("pregnant_woman_id") REFERENCES "public"."pregnant_women"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "past_records" ADD CONSTRAINT "past_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregnant_women" ADD CONSTRAINT "pregnant_women_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_health_records" ADD CONSTRAINT "public_health_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_records" ADD CONSTRAINT "visit_records_pregnant_woman_id_pregnant_women_id_fk" FOREIGN KEY ("pregnant_woman_id") REFERENCES "public"."pregnant_women"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_records" ADD CONSTRAINT "visit_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_appointment_date_time_index" ON "appointments" USING btree ("appointment_date_time");--> statement-breakpoint
CREATE INDEX "appointments_status_index" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointments_created_at_index" ON "appointments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "appointments_patient_phone_number_index" ON "appointments" USING btree ("patient_phone_number");--> statement-breakpoint
CREATE INDEX "appointments_patient_id_index" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_missed_notification_sent_index" ON "appointments" USING btree ("missed_notification_sent");--> statement-breakpoint
CREATE INDEX "appointments_missed_check_processed_appointment_date_time_index" ON "appointments" USING btree ("missed_check_processed","appointment_date_time");--> statement-breakpoint
CREATE INDEX "past_records_pregnant_woman_id_visit_date_index" ON "past_records" USING btree ("pregnant_woman_id","visit_date");--> statement-breakpoint
CREATE INDEX "past_records_visit_date_index" ON "past_records" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "pregnant_women_phone_number_index" ON "pregnant_women" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "pregnant_women_expected_delivery_date_index" ON "pregnant_women" USING btree ("expected_delivery_date");--> statement-breakpoint
CREATE INDEX "pregnant_women_created_at_index" ON "pregnant_women" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pregnant_women_registered_by_id_index" ON "pregnant_women" USING btree ("registered_by_id");--> statement-breakpoint
CREATE INDEX "public_health_records_child_name_index" ON "public_health_records" USING btree ("child_name");--> statement-breakpoint
CREATE INDEX "public_health_records_record_date_index" ON "public_health_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "public_health_records_created_at_index" ON "public_health_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "public_health_records_recorded_by_id_index" ON "public_health_records" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX "reminder_logs_created_at_index" ON "reminder_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reminder_logs_reminder_type_status_index" ON "reminder_logs" USING btree ("reminder_type","status");--> statement-breakpoint
CREATE INDEX "reminder_logs_appointment_id_index" ON "reminder_logs" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "users_created_at_index" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_role_index" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "visit_records_pregnant_woman_id_visit_date_index" ON "visit_records" USING btree ("pregnant_woman_id","visit_date");--> statement-breakpoint
CREATE INDEX "visit_records_visit_date_index" ON "visit_records" USING btree ("visit_date");