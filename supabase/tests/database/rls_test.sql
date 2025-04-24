begin;
select plan(12);

-- テストユーザーの作成
insert into auth.users (id, email)
values 
    ('11111111-1111-1111-1111-111111111111', 'user1@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'user2@example.com');

-- テストデータの作成
insert into public.todos (id, user_id, title, completed)
values 
    (1, '11111111-1111-1111-1111-111111111111', 'User1 Todo1', false),
    (2, '11111111-1111-1111-1111-111111111111', 'User1 Todo2', true),
    (3, '22222222-2222-2222-2222-222222222222', 'User2 Todo1', false);

-- 匿名ユーザーのテスト
call auth.login_as_anon();

select results_eq(
    'select count(*) from todos',
    array[0::bigint],
    '匿名ユーザーはtodosを閲覧できない'
);

select throws_ok(
    'insert into todos (user_id, title) values (''11111111-1111-1111-1111-111111111111'', ''Test Todo'')',
    '42501',
    'permission denied for table todos',
    '匿名ユーザーはtodosを作成できない'
);

-- ユーザー1のテスト
call auth.login_as_user('user1@example.com');

select results_eq(
    'select count(*) from todos',
    array[2::bigint],
    'ユーザー1は自分のtodosのみ閲覧可能'
);

select results_eq(
    'select title from todos order by id',
    array['User1 Todo1', 'User1 Todo2'],
    'ユーザー1は正しいtodosを閲覧可能'
);

select lives_ok(
    'insert into todos (user_id, title) values (''11111111-1111-1111-1111-111111111111'', ''New Todo'')',
    'ユーザー1は自分のtodosを作成可能'
);

select throws_ok(
    'insert into todos (user_id, title) values (''22222222-2222-2222-2222-222222222222'', ''Test Todo'')',
    '42501',
    'new row violates row-level security policy for table "todos"',
    'ユーザー1は他のユーザーのtodosを作成できない'
);

-- ユーザー2のテスト
call auth.login_as_user('user2@example.com');

select results_eq(
    'select count(*) from todos',
    array[1::bigint],
    'ユーザー2は自分のtodosのみ閲覧可能'
);

select results_eq(
    'select title from todos',
    array['User2 Todo1'],
    'ユーザー2は正しいtodosを閲覧可能'
);

select lives_ok(
    'insert into todos (user_id, title) values (''22222222-2222-2222-2222-222222222222'', ''New Todo'')',
    'ユーザー2は自分のtodosを作成可能'
);

select throws_ok(
    'insert into todos (user_id, title) values (''11111111-1111-1111-1111-111111111111'', ''Test Todo'')',
    '42501',
    'new row violates row-level security policy for table "todos"',
    'ユーザー2は他のユーザーのtodosを作成できない'
);

-- クリーンアップ
call auth.logout();

select * from finish();
rollback; 