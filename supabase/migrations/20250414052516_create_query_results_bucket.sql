-- Create the storage bucket for query results
INSERT INTO storage.buckets (id, name, public)
VALUES ('query-results', 'query-results', true)
ON CONFLICT (id) DO NOTHING; -- Avoid error if bucket already exists

-- Allow authenticated users to upload/update files in the bucket
-- Note: RLS policies for storage objects are based on the `storage.objects` table.
-- We are allowing upsert, so we grant INSERT and UPDATE.
-- Ensure that the `authenticated` role exists in your Supabase project.
CREATE POLICY "Allow authenticated uploads to query-results" ON storage.objects
FOR INSERT TO authenticated -- Or specify a more specific role if needed
WITH CHECK (bucket_id = 'query-results');

CREATE POLICY "Allow authenticated updates to query-results" ON storage.objects
FOR UPDATE TO authenticated -- Or specify a more specific role if needed
USING (bucket_id = 'query-results');

-- Allow public read access to the bucket content
-- This is generally handled by setting the bucket to public,
-- but an explicit RLS policy can be added for clarity or if needed.
-- CREATE POLICY "Allow public reads from query-results" ON storage.objects
-- FOR SELECT TO anon, authenticated
-- USING (bucket_id = 'query-results');

-- Commenting on buckets directly is not standard SQL
-- COMMENT ON BUCKET "query-results" IS 'Stores CSV results generated from specific queries, intended for public access.';
