-- Migration: Create and Configure public.profiles Table

-- 1. ENUM TYPE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
    CREATE TYPE profile_role AS ENUM ('admin', 'general');
  END IF;
END $$;

-- 2. Table Creation
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code varchar(20) NOT NULL UNIQUE,
  first_name varchar(50) NOT NULL,
  last_name varchar(50) NOT NULL,
  role profile_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Trigger Function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- 6.1 SELECT: admin can all, general can own
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'admin'
    OR id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- 6.2 INSERT: only admin
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'admin');

-- 6.3 UPDATE: row-level by role
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'admin'
    OR id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'admin'
    OR id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- 6.4 DELETE: only admin
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'admin');

-- 7. Column-Level Privileges
-- 7.1 Revoke update on code for general users
REVOKE UPDATE (code) ON public.profiles FROM authenticated;
-- 7.2 Grant update on allowed columns for general users
GRANT UPDATE (first_name, last_name, role) ON public.profiles TO authenticated;

-- End of Migration
