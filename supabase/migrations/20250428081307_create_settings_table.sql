-- moddatetime関数の作成
-- create extension if not exists moddatetime schema extensions;

-- settingsテーブルの作成
create table public.settings (
    id uuid default gen_random_uuid() primary key,
    key text not null unique,
    value jsonb not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.settings is '管理者用設定テーブル';
comment on column public.settings.id is '設定ID';
comment on column public.settings.key is '設定キー';
comment on column public.settings.value is '設定値（JSON形式）';
comment on column public.settings.description is '設定の説明';
comment on column public.settings.created_at is '作成日時';
comment on column public.settings.updated_at is '更新日時';

-- RLSを有効化
alter table public.settings enable row level security;

-- 全てのポリシーを削除（念のため）
drop policy if exists "管理者のみが参照可能" on public.settings;
drop policy if exists "管理者のみが作成可能" on public.settings;
drop policy if exists "管理者のみが更新可能" on public.settings;
drop policy if exists "管理者のみが削除可能" on public.settings;
drop policy if exists "管理者のみが全ての操作を行える" on public.settings;
drop policy if exists "管理者以外のアクセスを拒否" on public.settings;
drop policy if exists "一般ユーザーのアクセスを拒否" on public.settings;

-- 管理者のみが全ての操作を行えるポリシーを設定
drop policy if exists "管理者のみが全ての操作を行える" on public.settings;

-- 管理者のみが参照可能
create policy "管理者のみが参照可能" on public.settings
    for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.user_id = auth.uid()
            and profiles.role = 'admin'::profile_role
        )
    );

-- 管理者のみが作成可能
create policy "管理者のみが作成可能" on public.settings
    for insert
    with check (
        exists (
            select 1 from public.profiles
            where profiles.user_id = auth.uid()
            and profiles.role = 'admin'::profile_role
        )
    );

-- 管理者のみが更新可能
create policy "管理者のみが更新可能" on public.settings
    for update
    using (
        exists (
            select 1 from public.profiles
            where profiles.user_id = auth.uid()
            and profiles.role = 'admin'::profile_role
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.user_id = auth.uid()
            and profiles.role = 'admin'::profile_role
        )
    );

-- 管理者のみが削除可能
create policy "管理者のみが削除可能" on public.settings
    for delete
    using (
        exists (
            select 1 from public.profiles
            where profiles.user_id = auth.uid()
            and profiles.role = 'admin'::profile_role
        )
    );

-- Column-Level Privileges
-- 1. Revoke all privileges from authenticated users
REVOKE ALL ON public.settings FROM authenticated;
-- 2. Grant select to authenticated users (admin only)
GRANT SELECT ON public.settings TO authenticated;
-- 3. Grant insert, update, delete to admin users only
REVOKE INSERT, UPDATE, DELETE ON public.settings FROM authenticated;

-- updated_atを自動更新するトリガーの作成
drop trigger if exists handle_updated_at on public.settings;
create trigger handle_updated_at
    before update on public.settings
    for each row
    execute function public.set_updated_at();

-- ロールバック用
-- drop trigger if exists handle_updated_at on public.settings;
-- drop policy if exists "管理者のみが全ての操作を行える" on public.settings;
-- drop table if exists public.settings;
-- drop extension if exists moddatetime;
