-- 本番環境では権限の問題で動かないのでコメントアウトして migration up を実行
-- Migration: Create Storage Buckets for Image Management

-- Enable Storage if not already enabled
DO $$
BEGIN
  -- ローカル環境ではストレージ拡張機能をスキップ
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'storage'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";
  END IF;
END $$;

-- 1. Create storage schema if not exists (for local development)
CREATE SCHEMA IF NOT EXISTS storage;

-- 2. Create buckets table if not exists (for local development)
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint DEFAULT null,
  allowed_mime_types text[] DEFAULT null,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create objects table if not exists (for local development)
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);

-- 4. Create bucket for original images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'original-images',
  'original-images',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg']::text[]
) ON CONFLICT (id) DO NOTHING;

-- 6. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for original_images bucket
-- SELECT: admin can view all, general users can view their own

CREATE POLICY "Admins can do anything on original-images" ON storage.objects
FOR ALL
TO authenticated
 USING (
    is_admin()
  )
  WITH CHECK (
    bucket_id = 'original-images'
    AND is_admin()
  );


-- 9. Create rollback function
CREATE OR REPLACE FUNCTION storage.remove_buckets()
RETURNS void AS $$
BEGIN
  -- Delete policies
  DROP POLICY IF EXISTS "Admins can do anything on original-images" ON storage.objects;


  -- Delete buckets (this will also delete all objects in the buckets)
  DELETE FROM storage.buckets WHERE id IN ('original-images');
END;
$$ LANGUAGE plpgsql;

-- Comment for rollback:
-- To rollback this migration, run:
-- SELECT storage.remove_buckets();
-- DROP FUNCTION IF EXISTS storage.remove_buckets();
-- DROP TABLE IF EXISTS storage.objects;
-- DROP TABLE IF EXISTS storage.buckets;
-- DROP SCHEMA IF EXISTS storage;
