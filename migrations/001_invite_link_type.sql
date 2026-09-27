-- Separate viewer share links from contributor invite links. Both live in
-- invite_links, so without a type a share token could be used to contribute
-- and an invite token could be used to read the generated memorial.
ALTER TABLE invite_links
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'contribute';

ALTER TABLE invite_links
  DROP CONSTRAINT IF EXISTS invite_links_link_type_check;
ALTER TABLE invite_links
  ADD CONSTRAINT invite_links_link_type_check CHECK (link_type IN ('contribute', 'share'));

-- Existing share links were created by POST /memorials/:id/share with a
-- 12-byte (24 hex character) token; invite links use an 8-byte token.
UPDATE invite_links SET link_type = 'share' WHERE length(token) = 24;
