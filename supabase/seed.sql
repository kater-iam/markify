-- Seed Data for Markify (Development)
-- UUIDs are fixed for reproducibility

-- Enable pgcrypto for crypt and gen_salt
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Seed auth.users (admin + 30 general users)
-- Admin user
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at, email_change_token_new,
  email_change, email_change_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'admin@kater.jp',
  crypt('password123', gen_salt('bf')),
  current_timestamp, '', current_timestamp,
  '', current_timestamp, '', '',
  current_timestamp, current_timestamp,
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{"role":"admin"}'::jsonb,
  current_timestamp, current_timestamp
);

-- General users via generate_series (IDs 000...0002 to 000...0031)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at, email_change_token_new,
  email_change, email_change_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid AS instance_id,
  md5(format('user-id-%s', gs.i))::uuid AS id,
  'authenticated', 'authenticated',
  format('user%s@example.com', gs.i - 1),
  crypt('password123', gen_salt('bf')),
  current_timestamp, '', current_timestamp,
  '', current_timestamp, '', '',
  current_timestamp, current_timestamp,
  jsonb_build_object('provider','email','providers',array['email'],'role','general'),
  jsonb_build_object('role','general'),
  current_timestamp, current_timestamp
FROM generate_series(2, 31) AS gs(i);

-- 2. Seed profiles (matching auth.users)
-- Admin profile
INSERT INTO public.profiles (id, user_id, code, first_name, last_name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'admin001', 'Admin', 'User', 'admin', now(), now()
);

-- General user profiles via generate_series
INSERT INTO public.profiles (id, user_id, code, first_name, last_name, role, created_at, updated_at)
SELECT
  md5(format('profile-id-%s', gs.i))::uuid AS id,
  md5(format('user-id-%s', gs.i))::uuid AS user_id,
  format('user%03s', gs.i - 1) AS code,
  format('First%s', gs.i - 1) AS first_name,
  format('Last%s', gs.i - 1) AS last_name,
  'general', now(), now()
FROM generate_series(2, 31) AS gs(i);

-- 3. Seed images (50 images by admin)
INSERT INTO public.images (id, profile_id, file_path, created_at, updated_at)
SELECT
  md5(format('image-id-%s', gs.i))::uuid AS id,
  '00000000-0000-0000-0000-000000000001'::uuid AS profile_id,
  format('images/image_%03s.jpg', gs.i) AS file_path,
  now(), now()
FROM generate_series(1, 50) AS gs(i);

-- 4. Seed download_logs (3 logs per image)
INSERT INTO public.download_logs (log_id, profile_id, image_id, client_ip, created_at, updated_at)
SELECT
  md5(format('log-id-%s-%s', gs.i, log.j))::uuid AS log_id,
  -- Cycle through general users for logs
  md5(format('profile-id-%s', ((log.j - 1) % 30) + 2))::uuid AS profile_id,
  md5(format('image-id-%s', gs.i))::uuid AS image_id,
  format('192.168.0.%s', log.j + 10)::inet AS client_ip,
  now(), now()
FROM generate_series(1, 50) AS gs(i)
CROSS JOIN generate_series(1, 3) AS log(j);
