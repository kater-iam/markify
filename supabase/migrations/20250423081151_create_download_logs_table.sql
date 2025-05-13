-- 4. DOWNLOAD_LOGS TABLE
CREATE TABLE public.download_logs (
  log_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  client_ip inet NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for foreign keys
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_images_profile_id ON public.images(profile_id);
CREATE INDEX idx_logs_profile_id ON public.download_logs(profile_id);
CREATE INDEX idx_logs_image_id ON public.download_logs(image_id);


-- RLS for download_logs
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything" ON public.download_logs
FOR ALL
TO authenticated
 USING (
    is_admin()
  )
  WITH CHECK (
    is_admin()
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trg_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_download_logs_updated_at
  BEFORE UPDATE ON public.download_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Column-Level Privileges
-- 1. Grant insert to authenticated users
REVOKE ALL ON public.download_logs FROM authenticated;
GRANT INSERT ON public.download_logs TO authenticated;
