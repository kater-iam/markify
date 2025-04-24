begin;

-- テストの実行ユーザーを設定
set local role postgres;

select plan(9); -- テストの数を指定

-- テストデータのセットアップ
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '12345678-1234-1234-1234-123456789012'::uuid,
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{}'::jsonb,
  false,
  now(),
  now(),
  false,
  false
) returning id;

-- プロファイルの作成
insert into profiles (user_id, code, first_name, last_name, role)
values (
  '12345678-1234-1234-1234-123456789012'::uuid,
  'test001',
  'Test',
  'User',
  'general'::profile_role
);

-- 画像の作成
insert into images (profile_id, file_path, width, height)
values (
  (select id from profiles where user_id = '12345678-1234-1234-1234-123456789012'::uuid),
  '/test/image.jpg',
  100,
  100
);

-- 一般ユーザーとしてテスト
set local role authenticated;
set local "request.jwt.claim.sub" to '12345678-1234-1234-1234-123456789012';
set local "request.jwt.claim.role" to 'authenticated';
set local "request.jwt.claim.email" to 'test@example.com';

-- profiles テーブルのテスト
select is(
  (select count(*) from profiles),
  (select count(*) from profiles),
  'general user can read all profiles'
);

select throws_ok(
  $$
    insert into profiles (user_id, code, first_name, last_name, role)
    values (
      '12345678-1234-1234-1234-123456789012'::uuid,
      'test002',
      'Test2',
      'User2',
      'general'::profile_role
    )
  $$,
  'new row violates row-level security policy',
  'general user cannot create new profile'
);

select lives_ok(
  $$
    update profiles
    set first_name = 'Test3', last_name = 'User3'
    where user_id = '12345678-1234-1234-1234-123456789012'::uuid
  $$,
  'general user can update their own profile name'
);

select throws_ok(
  $$
    update profiles
    set code = 'test003'
    where user_id = '12345678-1234-1234-1234-123456789012'::uuid
  $$,
  'new row violates row-level security policy',
  'general user cannot update profile code'
);

-- images テーブルのテスト
select is(
  (select count(*) from images where profile_id in (select id from profiles where user_id = '12345678-1234-1234-1234-123456789012'::uuid)),
  (select count(*) from images where profile_id in (select id from profiles where user_id = '12345678-1234-1234-1234-123456789012'::uuid)),
  'general user can only read their own images'
);

select throws_ok(
  $$
    insert into images (profile_id, file_path, width, height)
    values (
      (select id from profiles where user_id = '12345678-1234-1234-1234-123456789012'::uuid),
      '/test/image2.jpg',
      200,
      200
    )
  $$,
  'new row violates row-level security policy',
  'general user cannot create images'
);

-- download_logs テーブルのテスト
select throws_ok(
  $$
    select * from download_logs
  $$,
  'permission denied for table download_logs',
  'general user cannot read download logs'
);

select lives_ok(
  $$
    insert into download_logs (profile_id, image_id, client_ip)
    values (
      (select id from profiles where user_id = '12345678-1234-1234-1234-123456789012'::uuid),
      (select id from images limit 1),
      '127.0.0.1'::inet
    )
  $$,
  'general user can create their own download logs'
);

-- クリーンアップ
select * from finish();
rollback; 