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
  format('user%s@kater.jp', gs.i - 1),
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
  'user' || to_char(gs.i - 1, 'FM000') AS code,
  'First' || to_char(gs.i - 1, 'FM000') AS first_name,
  'Last' || to_char(gs.i - 1, 'FM000') AS last_name,
  'general', now(), now()
FROM generate_series(2, 31) AS gs(i);

-- 3. Seed images (200 images with various types)
-- Document category (80 images)
-- INSERT INTO public.images (
--   id, 
--   profile_id, 
--   file_path, 
--   original_filename,
--   name,
--   width,
--   height,
--   created_at, 
--   updated_at
-- )
-- SELECT
--   md5(format('doc-image-%s', gs.i))::uuid AS id,
--   '00000000-0000-0000-0000-000000000001'::uuid AS profile_id,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'handwritten_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 1 THEN 'typewriter_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 2 THEN 'printed_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 3 THEN 'mixed_' || to_char(gs.i, 'FM000') || '.jpg'
--   END AS file_path,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'handwritten_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 1 THEN 'typewriter_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 2 THEN 'printed_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 3 THEN 'mixed_' || to_char(gs.i, 'FM000') || '.jpg'
--   END AS original_filename,
--   CASE (gs.i % 4)
--     WHEN 0 THEN '手書きドキュメント ' || to_char(gs.i, 'FM000')
--     WHEN 1 THEN 'タイプライター文書 ' || to_char(gs.i, 'FM000')
--     WHEN 2 THEN '印刷文書 ' || to_char(gs.i, 'FM000')
--     WHEN 3 THEN '混合文書 ' || to_char(gs.i, 'FM000')
--   END AS name,
--   800 AS width,
--   1200 AS height,
--   now() - interval '1 day' * (random() * 30)::integer,
--   now() - interval '1 day' * (random() * 30)::integer
-- FROM generate_series(1, 80) AS gs(i);

-- -- Photo category (80 images)
-- INSERT INTO public.images (
--   id, 
--   profile_id, 
--   file_path, 
--   original_filename,
--   name,
--   width,
--   height,
--   created_at, 
--   updated_at
-- )
-- SELECT
--   md5(format('photo-image-%s', gs.i))::uuid AS id,
--   '00000000-0000-0000-0000-000000000001'::uuid AS profile_id,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'landscape_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 1 THEN 'portrait_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 2 THEN 'product_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 3 THEN 'architecture_' || to_char(gs.i, 'FM000') || '.jpg'
--   END AS file_path,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'landscape_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 1 THEN 'portrait_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 2 THEN 'product_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 3 THEN 'architecture_' || to_char(gs.i, 'FM000') || '.jpg'
--   END AS original_filename,
--   CASE (gs.i % 4)
--     WHEN 0 THEN '風景写真 ' || to_char(gs.i, 'FM000')
--     WHEN 1 THEN 'ポートレート ' || to_char(gs.i, 'FM000')
--     WHEN 2 THEN '商品写真 ' || to_char(gs.i, 'FM000')
--     WHEN 3 THEN '建築写真 ' || to_char(gs.i, 'FM000')
--   END AS name,
--   1920 AS width,
--   1080 AS height,
--   now() - interval '1 day' * (random() * 30)::integer,
--   now() - interval '1 day' * (random() * 30)::integer
-- FROM generate_series(1, 80) AS gs(i);

-- -- Chart & Graph category (40 images)
-- INSERT INTO public.images (
--   id, 
--   profile_id, 
--   file_path, 
--   original_filename,
--   name,
--   width,
--   height,
--   created_at, 
--   updated_at
-- )
-- SELECT
--   md5(format('chart-image-%s', gs.i))::uuid AS id,
--   '00000000-0000-0000-0000-000000000001'::uuid AS profile_id,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'chart_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 1 THEN 'graph_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 2 THEN 'diagram_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 3 THEN 'table_' || to_char(gs.i, 'FM000') || '.jpg'
--   END AS file_path,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'chart_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 1 THEN 'graph_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 2 THEN 'diagram_' || to_char(gs.i, 'FM000') || '.jpg'
--     WHEN 3 THEN 'table_' || to_char(gs.i, 'FM000') || '.jpg'
--   END AS original_filename,
--   CASE (gs.i % 4)
--     WHEN 0 THEN 'チャート ' || to_char(gs.i, 'FM000')
--     WHEN 1 THEN 'グラフ ' || to_char(gs.i, 'FM000')
--     WHEN 2 THEN 'ダイアグラム ' || to_char(gs.i, 'FM000')
--     WHEN 3 THEN '表 ' || to_char(gs.i, 'FM000')
--   END AS name,
--   1024 AS width,
--   768 AS height,
--   now() - interval '1 day' * (random() * 30)::integer,
--   now() - interval '1 day' * (random() * 30)::integer
-- FROM generate_series(1, 40) AS gs(i);

-- 4. Seed download_logs (5 logs per image)
INSERT INTO public.download_logs (log_id, profile_id, image_id, client_ip, created_at, updated_at)
SELECT
  md5(format('log-id-%s-%s', i.id, log.j))::uuid AS log_id,
  -- Cycle through general users for logs
  md5(format('profile-id-%s', ((log.j - 1) % 30) + 2))::uuid AS profile_id,
  i.id AS image_id,
  format('192.168.%s.%s', (random() * 255)::integer, (random() * 255)::integer)::inet AS client_ip,
  now() - interval '1 day' * (random() * 30)::integer,
  now() - interval '1 day' * (random() * 30)::integer
FROM public.images i
CROSS JOIN generate_series(1, 5) AS log(j);
