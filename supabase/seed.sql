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
  format('user%s@kater.jp', to_char(gs.i - 1, 'FM00')),
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
  'admin001', '太郎', '山田', 'admin', now(), now()
);

-- General user profiles via generate_series
WITH japanese_names AS (
  SELECT
    gs.i,
    CASE (gs.i % 10)
      WHEN 0 THEN '佐藤'
      WHEN 1 THEN '鈴木'
      WHEN 2 THEN '高橋'
      WHEN 3 THEN '田中'
      WHEN 4 THEN '伊藤'
      WHEN 5 THEN '渡辺'
      WHEN 6 THEN '山本'
      WHEN 7 THEN '中村'
      WHEN 8 THEN '小林'
      WHEN 9 THEN '加藤'
    END as last_name,
    CASE (gs.i % 10)
      WHEN 0 THEN '翔太'
      WHEN 1 THEN '陽菜'
      WHEN 2 THEN '大輝'
      WHEN 3 THEN '結衣'
      WHEN 4 THEN '悠真'
      WHEN 5 THEN '美咲'
      WHEN 6 THEN '颯太'
      WHEN 7 THEN '莉子'
      WHEN 8 THEN '蓮'
      WHEN 9 THEN '優花'
    END as first_name
  FROM generate_series(2, 31) AS gs(i)
)
INSERT INTO public.profiles (id, user_id, code, first_name, last_name, role, created_at, updated_at)
SELECT
  md5(format('profile-id-%s', jn.i))::uuid AS id,
  md5(format('user-id-%s', jn.i))::uuid AS user_id,
  'user' || to_char(jn.i - 1, 'FM000') AS code,
  jn.first_name,
  jn.last_name,
  'general', now(), now()
FROM japanese_names jn;

-- 4. Seed download_logs (5 logs per image)
-- INSERT INTO public.download_logs (log_id, profile_id, image_id, client_ip, created_at, updated_at)
-- SELECT
--   md5(format('log-id-%s-%s', i.id, log.j))::uuid AS log_id,
--   -- Cycle through general users for logs
--   md5(format('profile-id-%s', ((log.j - 1) % 30) + 2))::uuid AS profile_id,
--   i.id AS image_id,
--   format('192.168.%s.%s', (random() * 255)::integer, (random() * 255)::integer)::inet AS client_ip,
--   now() - interval '1 day' * (random() * 30)::integer,
--   now() - interval '1 day' * (random() * 30)::integer
-- FROM public.images i
-- CROSS JOIN generate_series(1, 5) AS log(j);

-- ウォーターマーク設定の追加
insert into public.settings (key, value, description)
values (
    'watermark',
    '{
  "color": "#000000",
  "opacity": 0.3,
  "fontSize": 11
}'::jsonb,
    'ウォーターマーク設定（text: 透かし文字列, fontSizeRel: 画像辺に対する割合(0-1), opacity: 透明度(0-1), angle: 角度(deg)）'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description;
