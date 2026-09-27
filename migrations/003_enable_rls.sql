-- The browser ships the public anon key, so without RLS every table is
-- readable and writable straight through the Supabase REST API. All data
-- access goes through the Remember API with the service role, which bypasses
-- RLS, so enabling it with no policies denies direct anon/authenticated access.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'memorials', 'invite_links', 'contributors', 'questionnaire_responses',
    'contributor_stories', 'media_assets', 'voice_recordings', 'themes',
    'theme_quotes', 'theme_media_links', 'ai_jobs', 'ai_outputs', 'documents',
    'waitlist'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;
