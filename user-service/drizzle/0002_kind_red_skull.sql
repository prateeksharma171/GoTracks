ALTER TABLE "users" ADD COLUMN "first_name" varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_code" varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";