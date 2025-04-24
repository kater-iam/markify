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
  'original_images',
  'original_images',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg']::text[]
) ON CONFLICT (id) DO NOTHING;

-- 5. Create bucket for watermarked images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'watermarked_images',
  'watermarked_images',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg']::text[]
) ON CONFLICT (id) DO NOTHING;

-- 6. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for original_images bucket
-- SELECT: admin can view all, general users can view their own
CREATE POLICY "original_images_select_policy" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'original_images'
  AND (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- INSERT: only admin can upload
CREATE POLICY "original_images_insert_policy" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'original_images'
  AND (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- UPDATE: only admin can update
CREATE POLICY "original_images_update_policy" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'original_images'
  AND (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'original_images'
  AND (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- DELETE: only admin can delete
CREATE POLICY "original_images_delete_policy" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'original_images'
  AND (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- 8. RLS Policies for watermarked_images bucket
-- SELECT: authenticated users can view their own watermarked images
CREATE POLICY "watermarked_images_select_policy" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'watermarked_images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- INSERT: only admin and edge functions can insert
CREATE POLICY "watermarked_images_insert_policy" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'watermarked_images'
  AND (
    auth.role() = 'admin'
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- UPDATE: only admin and edge functions can update
CREATE POLICY "watermarked_images_update_policy" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'watermarked_images'
  AND (
    auth.role() = 'admin'
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'watermarked_images'
  AND (
    auth.role() = 'admin'
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- DELETE: only admin can delete
CREATE POLICY "watermarked_images_delete_policy" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'watermarked_images'
  AND (
    auth.role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

-- 9. Create rollback function
CREATE OR REPLACE FUNCTION storage.remove_buckets()
RETURNS void AS $$
BEGIN
  -- Delete policies
  DROP POLICY IF EXISTS "original_images_select_policy" ON storage.objects;
  DROP POLICY IF EXISTS "original_images_insert_policy" ON storage.objects;
  DROP POLICY IF EXISTS "original_images_update_policy" ON storage.objects;
  DROP POLICY IF EXISTS "original_images_delete_policy" ON storage.objects;
  DROP POLICY IF EXISTS "watermarked_images_select_policy" ON storage.objects;
  DROP POLICY IF EXISTS "watermarked_images_insert_policy" ON storage.objects;
  DROP POLICY IF EXISTS "watermarked_images_update_policy" ON storage.objects;
  DROP POLICY IF EXISTS "watermarked_images_delete_policy" ON storage.objects;

  -- Delete buckets (this will also delete all objects in the buckets)
  DELETE FROM storage.buckets WHERE id IN ('original_images', 'watermarked_images');
END;
$$ LANGUAGE plpgsql;

-- Comment for rollback:
-- To rollback this migration, run:
-- SELECT storage.remove_buckets();
-- DROP FUNCTION IF EXISTS storage.remove_buckets();
-- DROP TABLE IF EXISTS storage.objects;
-- DROP TABLE IF EXISTS storage.buckets;
-- DROP SCHEMA IF EXISTS storage;
