-- 3. IMAGES TABLE
CREATE TABLE public.images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  original_filename text NOT NULL,
  name text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for images
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can view all images
CREATE POLICY images_select ON public.images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can do anything" ON public.images
FOR ALL
TO authenticated
 USING (
    is_admin()
  )
  WITH CHECK (
    is_admin()
  );