-- Give each contributor a secret session token. Previously the contributor's
-- primary key doubled as their credential, and that id is visible to
-- organizers and in generated output, so anyone who saw it could act as them.
ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS session_token text;

-- Existing sessions get a fresh token; old browser sessions that stored the
-- contributor id must start again from the invite link.
UPDATE contributors
  SET session_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  WHERE session_token IS NULL;

ALTER TABLE contributors
  ALTER COLUMN session_token SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  ALTER COLUMN session_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contributors_session_token_key ON contributors (session_token);
