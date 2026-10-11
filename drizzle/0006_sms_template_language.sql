ALTER TABLE "sms_templates" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "sms_templates" ADD COLUMN "language" "call_language" DEFAULT 'english' NOT NULL;