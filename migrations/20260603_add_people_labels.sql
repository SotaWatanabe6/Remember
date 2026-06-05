-- Run in Supabase SQL editor
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS people_labels jsonb;
