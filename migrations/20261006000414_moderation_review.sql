-- Add organizer moderation holds without changing row access or deleting source content.
ALTER TABLE public.contributors
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz;

ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz;

ALTER TABLE public.voice_recordings
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS is_blurry boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blur_reason text;
