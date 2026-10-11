ALTER TABLE "past_appointments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "past_appointments" CASCADE;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "appointment_location" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pregnant_women" ALTER COLUMN "folder_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pregnant_women" ALTER COLUMN "marital_status" SET NOT NULL;