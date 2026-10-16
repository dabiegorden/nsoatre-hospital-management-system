-- Roles are now admin and staff. Renaming the enum value in place keeps every
-- existing "user" account (they become staff) instead of recreating the type.
ALTER TYPE "public"."user_role" RENAME VALUE 'user' TO 'staff';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'staff'::"public"."user_role";
