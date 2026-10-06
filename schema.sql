CREATE TABLE memorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_name text NOT NULL,
  nickname text,
  biography text,
  related_people jsonb DEFAULT '[]'::jsonb,
  cover_photo_url text,
  date_of_birth date,
  date_of_passing date,
  status text DEFAULT 'collecting',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  use_count integer DEFAULT 0,
  link_type text NOT NULL DEFAULT 'contribute' CHECK (link_type IN ('contribute', 'share')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  invite_link_id uuid REFERENCES invite_links(id) ON DELETE SET NULL,
  name text,
  email text,
  relationship_type text,
  relationship_label text,
  is_anonymous boolean DEFAULT false,
  status text DEFAULT 'in_progress',
  questionnaire_done boolean DEFAULT false,
  photos_done boolean DEFAULT false,
  voice_done boolean DEFAULT false,
  submitted_at timestamptz,
  session_token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  is_flagged boolean DEFAULT false,
  flagged_reason text,
  moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  moderation_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES contributors(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  response_text text,
  response_audio_url text,
  order_index integer,
  reviewed_at timestamptz,
  approved_at timestamptz,
  is_flagged boolean DEFAULT false,
  flagged_reason text,
  moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  moderation_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE contributor_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES contributors(id) ON DELETE CASCADE,
  client_story_id text,
  title text,
  body text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (contributor_id, client_story_id)
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES contributors(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  storage_bucket text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size_bytes bigint,
  taken_at timestamptz,
  location_lat float,
  location_lng float,
  caption text,
  ai_analysis_status text DEFAULT 'pending',
  ai_labels jsonb,
  ai_emotion text,
  ai_scene text,
  ai_people_count integer,
  theme_ids jsonb,
  is_blurry boolean DEFAULT false,
  blur_reason text,
  is_flagged boolean DEFAULT false,
  flagged_reason text,
  moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  moderation_reviewed_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES contributors(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  storage_bucket text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size_bytes bigint,
  duration_seconds float,
  contributor_title text NOT NULL,
  transcription_status text DEFAULT 'pending',
  transcript_text text,
  transcript_segments jsonb,
  key_quote text,
  ai_category text,
  ai_tags jsonb,
  is_flagged boolean DEFAULT false,
  flagged_reason text,
  moderation_resolution text CHECK (moderation_resolution IN ('approved', 'excluded')),
  moderation_reviewed_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text,
  summary text,
  prominence_score float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE theme_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES contributors(id) ON DELETE SET NULL,
  quote_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE theme_media_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  media_asset_id uuid REFERENCES media_assets(id) ON DELETE CASCADE,
  match_score float,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  status text DEFAULT 'queued',
  progress integer DEFAULT 0,
  current_step text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  ai_job_id uuid REFERENCES ai_jobs(id) ON DELETE SET NULL,
  output_type text NOT NULL,
  output_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
  type_name text,
  content text,
  file_url text,
  mini_analysis text,
  question_set text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- All access goes through the API's service role; deny direct anon access.
ALTER TABLE memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_media_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
