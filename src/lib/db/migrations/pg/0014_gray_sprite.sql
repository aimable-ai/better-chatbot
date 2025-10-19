CREATE TABLE "space_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "space_invite_token_unique" UNIQUE("token"),
	CONSTRAINT "space_invite_space_id_email_unique" UNIQUE("space_id","email")
);
--> statement-breakpoint
CREATE TABLE "space_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "space_member_space_id_user_id_unique" UNIQUE("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "space_invite" ADD CONSTRAINT "space_invite_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "space_invite_space_id_idx" ON "space_invite" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "space_invite_email_idx" ON "space_invite" USING btree ("email");--> statement-breakpoint
CREATE INDEX "space_member_space_id_idx" ON "space_member" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "space_member_user_id_idx" ON "space_member" USING btree ("user_id");