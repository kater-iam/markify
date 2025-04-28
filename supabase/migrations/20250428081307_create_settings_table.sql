-- moddatetime関数の作成
create extension if not exists moddatetime schema extensions;

-- settingsテーブルの作成
create table if not exists public.settings (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    value jsonb not null,
    description text,
    created_at timestamptz not null default timezone('Asia/Tokyo'::text, now()),
    updated_at timestamptz not null default timezone('Asia/Tokyo'::text, now())
);

comment on table public.settings is '管理者用設定テーブル';
comment on column public.settings.id is '設定ID';
comment on column public.settings.key is '設定キー';
comment on column public.settings.value is '設定値（JSON形式）';
comment on column public.settings.description is '設定の説明';
comment on column public.settings.created_at is '作成日時';
comment on column public.settings.updated_at is '更新日時';

-- RLSの設定
alter table public.settings enable row level security;

-- 管理者のみが全ての操作を行えるポリシーを設定
create policy "管理者のみが全ての操作を行える" on public.settings
    for all
    using (auth.jwt()->>'role' = 'admin')
    with check (auth.jwt()->>'role' = 'admin');

-- updated_atを自動更新するトリガーの作成
create trigger handle_updated_at before update on public.settings
    for each row execute function moddatetime('updated_at');

-- ロールバック用
-- drop trigger if exists handle_updated_at on public.settings;
-- drop policy if exists "管理者のみが全ての操作を行える" on public.settings;
-- drop table if exists public.settings;
-- drop extension if exists moddatetime;
