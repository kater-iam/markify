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

-- INSERT: only admin
CREATE POLICY images_insert ON public.images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'admin');

-- UPDATE: only admin
CREATE POLICY images_update ON public.images
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'admin')
  WITH CHECK (auth.role() = 'admin');

-- DELETE: only admin
CREATE POLICY images_delete ON public.images
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'admin');
