-- Add space_id to agent and backfill to Personal space per user
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "space_id" uuid;

-- Create Personal spaces for users missing one, and membership as owner
WITH distinct_users AS (
  SELECT DISTINCT a.user_id FROM agent a
), created_spaces AS (
  INSERT INTO space (id, name, status, created_at, updated_at)
  SELECT gen_random_uuid(), 'Personal', 'active', NOW(), NOW()
  FROM distinct_users u
  WHERE NOT EXISTS (
    SELECT 1 FROM space_member sm
    JOIN space s ON s.id = sm.space_id
    WHERE sm.user_id = u.user_id AND s.status <> 'deleted'
  )
  RETURNING id
)
INSERT INTO space_member (id, space_id, user_id, role, created_at)
SELECT gen_random_uuid(), s.id, u.user_id, 'owner', NOW()
FROM (
  SELECT u.user_id, COALESCE(
    (
      SELECT sm.space_id FROM space_member sm
      JOIN space s2 ON s2.id = sm.space_id
      WHERE sm.user_id = u.user_id AND s2.status <> 'deleted'
      ORDER BY s2.created_at ASC LIMIT 1
    ),
    (
      SELECT id FROM created_spaces LIMIT 1
    )
  ) AS space_id
  FROM distinct_users u
) x
JOIN space s ON s.id = x.space_id
LEFT JOIN space_member sm ON sm.space_id = s.id AND sm.user_id = x.user_id
WHERE sm.id IS NULL;

-- Backfill agent.space_id to user's first active space (or newly created Personal)
UPDATE agent a SET space_id = (
  SELECT sm.space_id FROM space_member sm
  JOIN space s ON s.id = sm.space_id
  WHERE sm.user_id = a.user_id AND s.status <> 'deleted'
  ORDER BY s.created_at ASC
  LIMIT 1
)
WHERE a.space_id IS NULL;

-- Make column NOT NULL and add FK + index
ALTER TABLE "agent" ALTER COLUMN "space_id" SET NOT NULL;
ALTER TABLE "agent"
  ADD CONSTRAINT agent_space_id_space_id_fk
  FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade;
CREATE INDEX IF NOT EXISTS agent_space_id_idx ON agent (space_id);
CREATE INDEX IF NOT EXISTS agent_space_user_idx ON agent (space_id, user_id);

-- Default visibility to public at DB level (if not already)
ALTER TABLE "agent" ALTER COLUMN "visibility" SET DEFAULT 'public';

