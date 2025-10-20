ALTER TABLE "agent" ALTER COLUMN "visibility" SET DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "workflow" ALTER COLUMN "visibility" SET DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "space_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow" ADD COLUMN "space_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;