ALTER TABLE "space" ADD COLUMN "status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "space" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "space" ADD COLUMN "archived_by" uuid;--> statement-breakpoint
ALTER TABLE "space" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "space" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;