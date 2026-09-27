-- "Allow all operations on documents" granted every role, including the
-- public anon key, full read/write/delete on documents, which overrode the
-- RLS enabled in 003. The app never reads this table from the browser; the
-- only writer is assembly_pipeline.py, a server-side script that should use
-- the service role key (which bypasses RLS).
DROP POLICY IF EXISTS "Allow all operations on documents" ON public.documents;
