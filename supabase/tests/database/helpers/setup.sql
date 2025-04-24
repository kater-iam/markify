-- テストヘルパー関数のセットアップ
create schema if not exists tests;

create or replace function tests.create_supabase_user(email text, pass text)
returns uuid as $$
declare
  uid uuid;
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    is_sso_user,
    deleted_at,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email,
    crypt(pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now(),
    null,
    null,
    null,
    null,
    null,
    null,
    '',
    0,
    null,
    '',
    false,
    null,
    false
  ) returning id into uid;
  return uid;
end;
$$ language plpgsql security definer;

create or replace function tests.authenticate_as(email text)
returns void as $$
declare
  uid text;
begin
  select id::text into uid from auth.users where auth.users.email = authenticate_as.email;
  set local role authenticated;
  set local request.jwt.claim.sub to uid;
  set local request.jwt.claim.role to 'authenticated';
  set local request.jwt.claim.email to email;
end;
$$ language plpgsql security definer;

create or replace function tests.clear_authentication()
returns void as $$
begin
  set local role postgres;
  set local request.jwt.claim.sub to '';
  set local request.jwt.claim.role to '';
  set local request.jwt.claim.email to '';
end;
$$ language plpgsql security definer;

create or replace function tests.delete_supabase_user(email text)
returns void as $$
begin
  delete from auth.users where auth.users.email = delete_supabase_user.email;
end;
$$ language plpgsql security definer;

-- テストヘルパー関数を作成
grant anon, authenticated to postgres;

create or replace procedure auth.login_as_user(user_email text)
    language plpgsql
    as $$
declare
    auth_user auth.users;
begin
    select
        * into auth_user
    from
        auth.users
    where
        email = user_email;
    execute format('set request.jwt.claim.sub=%L', (auth_user).id::text);
    execute format('set request.jwt.claim.role=%I', (auth_user).role);
    execute format('set request.jwt.claim.email=%L', (auth_user).email);
    execute format('set request.jwt.claims=%L', json_strip_nulls(json_build_object('app_metadata', (auth_user).raw_app_meta_data))::text);
    raise notice '%', format( 'set role %I; -- logging in as %L (%L)', (auth_user).role, (auth_user).id, (auth_user).email);
    execute format('set role %I', (auth_user).role);
end;
$$;

create or replace procedure auth.login_as_anon()
    language plpgsql
    as $$
begin
    set request.jwt.claim.sub='';
    set request.jwt.claim.role='';
    set request.jwt.claim.email='';
    set request.jwt.claims='';
    set role anon;
end;
$$;

create or replace procedure auth.logout()
    language plpgsql
    as $$
begin
    set request.jwt.claim.sub='';
    set request.jwt.claim.role='';
    set request.jwt.claim.email='';
    set request.jwt.claims='';
    set role postgres;
end;
$$; 