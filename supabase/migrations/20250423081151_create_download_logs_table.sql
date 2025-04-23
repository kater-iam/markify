-- 4. DOWNLOAD_LOGS TABLE
CREATE TABLE public.download_logs (
  log_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  client_ip inet NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for download_logs
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: only admin
CREATE POLICY download_logs_select ON public.download_logs
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'admin');

-- INSERT: admin and general (own only)
CREATE POLICY download_logs_insert ON public.download_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'admin'
    OR profile_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- UPDATE: only admin
CREATE POLICY download_logs_update ON public.download_logs
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'admin')
  WITH CHECK (auth.role() = 'admin');

-- DELETE: only admin
CREATE POLICY download_logs_delete ON public.download_logs
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'admin');

-- Indexes for foreign keys
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_images_profile_id ON public.images(profile_id);
CREATE INDEX idx_logs_profile_id ON public.download_logs(profile_id);
CREATE INDEX idx_logs_image_id ON public.download_logs(image_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (トリガーは既に作成されているものを除く)
-- trg_profiles_updated_at はすでに存在するため作成しない
CREATE TRIGGER trg_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_download_logs_updated_at
  BEFORE UPDATE ON public.download_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
