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
  first_name varchar(50) NOT NULL DEFAULT '',
  last_name varchar(50) NOT NULL DEFAULT '',
  role profile_role NOT NULL DEFAULT 'general',
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


-- 5. 管理者判定用の関数を作成
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER   -- これで RLS の束縛外で実行される
AS $$
  SELECT role = 'admin'::profile_role
    FROM public.profiles
   WHERE user_id = auth.uid();
$$;

-- 6. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- 7.1 SELECT: all authenticated users can view all profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can do anything" ON public.profiles
FOR ALL
TO authenticated
 USING (
    is_admin()
  )
  WITH CHECK (
    is_admin()
  );

-- 7. Column-Level Privileges
-- 7.1 Revoke all privileges from authenticated users
REVOKE ALL ON public.profiles FROM authenticated;
-- 7.2 Grant select to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
-- 7.3 Grant update on specific columns for authenticated users
GRANT UPDATE (first_name, last_name) ON public.profiles TO authenticated;

-- End of Migration
