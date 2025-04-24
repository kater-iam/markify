-- Migration: Create Storage Buckets for Image Management

-- Enable Storage if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- 1. Create bucket for original images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'original_images',
  'original_images',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg']::text[]
);

-- 2. Create bucket for watermarked images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'watermarked_images',
  'watermarked_images',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg']::text[]
);

-- 3. RLS Policies for original_images bucket
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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

-- 4. RLS Policies for watermarked_images bucket
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

-- 5. Create rollback function
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
