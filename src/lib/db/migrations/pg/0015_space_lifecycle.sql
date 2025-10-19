-- Add workspace lifecycle fields

ALTER TABLE "space" ADD COLUMN "status" varchar NOT NULL DEFAULT 'active';
ALTER TABLE "space" ADD COLUMN "archived_at" timestamp;
ALTER TABLE "space" ADD COLUMN "archived_by" uuid REFERENCES "user"("id");
ALTER TABLE "space" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "space" ADD COLUMN "deleted_by" uuid REFERENCES "user"("id");

-- Add constraints for status enum
ALTER TABLE "space" ADD CONSTRAINT "space_status_check" CHECK ("status" IN ('active', 'archived', 'deleted'));

-- Create indexes for performance
CREATE INDEX "space_status_idx" ON "space" ("status");
CREATE INDEX "space_archived_at_idx" ON "space" ("archived_at");

