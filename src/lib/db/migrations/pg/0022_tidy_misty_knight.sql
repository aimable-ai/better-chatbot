-- Add space_id to archive and backfill to Personal space per user
ALTER TABLE "archive" ADD COLUMN "space_id" uuid;--> statement-breakpoint

-- Create Personal spaces for users missing one, and membership as owner
-- First, create Personal spaces for users who don't have any active space
INSERT INTO space (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'Personal', 'active', NOW(), NOW()
FROM (
  SELECT DISTINCT a.user_id 
  FROM archive a
  WHERE NOT EXISTS (
    SELECT 1 FROM space_member sm
    JOIN space s ON s.id = sm.space_id
    WHERE sm.user_id = a.user_id AND s.status <> 'deleted'
  )
) users_without_space;

-- Add space memberships for the newly created Personal spaces
INSERT INTO space_member (id, space_id, user_id, role, created_at)
SELECT gen_random_uuid(), s.id, a.user_id, 'owner', NOW()
FROM archive a
JOIN space s ON s.name = 'Personal' AND s.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM space_member sm
  WHERE sm.user_id = a.user_id AND sm.space_id = s.id
)
AND NOT EXISTS (
  SELECT 1 FROM space_member sm2
  JOIN space s2 ON s2.id = sm2.space_id
  WHERE sm2.user_id = a.user_id AND s2.status <> 'deleted'
);

-- Backfill archive.space_id to user's first active space (or newly created Personal)
UPDATE archive a SET space_id = (
  SELECT sm.space_id FROM space_member sm
  JOIN space s ON s.id = sm.space_id
  WHERE sm.user_id = a.user_id AND s.status <> 'deleted'
  ORDER BY s.created_at ASC
  LIMIT 1
)
WHERE a.space_id IS NULL;

-- Make column NOT NULL and add FK + index
ALTER TABLE "archive" ALTER COLUMN "space_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "archive" ADD CONSTRAINT "archive_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS archive_space_id_idx ON archive (space_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS archive_space_user_idx ON archive (space_id, user_id);