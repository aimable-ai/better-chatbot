-- Add isPersonal boolean field to space table
ALTER TABLE "space" ADD COLUMN IF NOT EXISTS "is_personal" BOOLEAN DEFAULT FALSE;

-- Update existing personal spaces to mark them as personal
UPDATE "space" SET "is_personal" = TRUE WHERE "name" = 'Personal';

-- Add index for efficient querying of personal spaces
CREATE INDEX IF NOT EXISTS "space_is_personal_idx" ON "space" ("is_personal");

-- Add comment for documentation
COMMENT ON COLUMN "space"."is_personal" IS 'Indicates if this is a personal space (private to owner, accessible only to invited auditors)';
