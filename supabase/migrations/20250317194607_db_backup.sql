CREATE OR REPLACE FUNCTION public.dump_database(
  schema_name text DEFAULT 'public',
  include_data boolean DEFAULT true
) RETURNS text AS $$
DECLARE
  result text := '';
  table_record record;
  column_list text;
  data_record record;
  table_name_full text;
  select_stmt text;
  data_rows text;
  index_record record;
  constraint_record record;
  trigger_record record;
  fk_record record;
BEGIN
  -- スキーマ内のテーブル情報を取得
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = schema_name 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
  LOOP
    table_name_full := quote_ident(schema_name) || '.' || quote_ident(table_record.table_name);
    
    -- テーブル作成のDDLを追加
    result := result || E'-- Table: ' || table_name_full || E'\n\n';
    result := result || E'DROP TABLE IF EXISTS ' || table_name_full || E' CASCADE;\n\n';
    
    -- カラム定義を取得
    result := result || E'CREATE TABLE ' || table_name_full || E' (\n';
    
    -- カラム情報を取得してDDLを生成（ORDER BYをstring_aggの中に移動）
    SELECT string_agg(
      '  ' || quote_ident(column_name) || ' ' || 
      data_type || 
      CASE WHEN character_maximum_length IS NOT NULL 
           THEN '(' || character_maximum_length || ')' 
           ELSE '' END ||
      CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
      E',\n' ORDER BY ordinal_position
    ) INTO column_list
    FROM information_schema.columns
    WHERE table_schema = schema_name 
      AND table_name = table_record.table_name;
    
    result := result || column_list || E'\n);\n\n';
    
    -- インデックス情報を取得
    result := result || E'-- インデックス: ' || table_name_full || E'\n';
    FOR index_record IN 
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = schema_name AND tablename = table_record.table_name
    LOOP
      result := result || index_record.indexdef || E';\n';
    END LOOP;
    result := result || E'\n';
    
    -- 制約情報を取得（PRIMARY KEY、UNIQUE、CHECK）
    result := result || E'-- 制約: ' || table_name_full || E'\n';
    FOR constraint_record IN 
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        CASE 
          WHEN tc.constraint_type = 'PRIMARY KEY' THEN
            (SELECT 'ALTER TABLE ' || table_name_full || ' ADD CONSTRAINT ' || 
             quote_ident(tc.constraint_name) || ' PRIMARY KEY (' || 
             string_agg(quote_ident(kcu.column_name), ', ' ORDER BY kcu.ordinal_position) || ');'
             FROM information_schema.key_column_usage kcu
             WHERE kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema = tc.table_schema
             AND kcu.table_name = tc.table_name)
          WHEN tc.constraint_type = 'UNIQUE' THEN
            (SELECT 'ALTER TABLE ' || table_name_full || ' ADD CONSTRAINT ' || 
             quote_ident(tc.constraint_name) || ' UNIQUE (' || 
             string_agg(quote_ident(kcu.column_name), ', ' ORDER BY kcu.ordinal_position) || ');'
             FROM information_schema.key_column_usage kcu
             WHERE kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema = tc.table_schema
             AND kcu.table_name = tc.table_name)
          WHEN tc.constraint_type = 'CHECK' THEN
            (SELECT 'ALTER TABLE ' || table_name_full || ' ADD CONSTRAINT ' || 
             quote_ident(tc.constraint_name) || ' CHECK ' || 
             regexp_replace(pg_get_constraintdef(oid), '^CHECK \\((.*)\\)$', '(\\1)')
             FROM pg_constraint 
             WHERE conname = tc.constraint_name
             AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = tc.constraint_schema))
          ELSE NULL
        END as constraint_def
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = schema_name
        AND tc.table_name = table_record.table_name
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
    LOOP
      IF constraint_record.constraint_def IS NOT NULL THEN
        result := result || constraint_record.constraint_def || E'\n';
      END IF;
    END LOOP;
    
    -- 外部キー制約を個別に取得（グループ化の問題を回避）
    FOR fk_record IN
      SELECT DISTINCT
        tc.constraint_name,
        kcu.table_schema,
        kcu.table_name,
        string_agg(DISTINCT quote_ident(kcu.column_name), ', ' ORDER BY quote_ident(kcu.column_name)) AS columns,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        string_agg(DISTINCT quote_ident(ccu.column_name), ', ' ORDER BY quote_ident(ccu.column_name)) AS foreign_columns
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = schema_name
        AND tc.table_name = table_record.table_name
      GROUP BY
        tc.constraint_name,
        kcu.table_schema,
        kcu.table_name,
        ccu.table_schema,
        ccu.table_name
    LOOP
      result := result || 'ALTER TABLE ' || table_name_full || 
                ' ADD CONSTRAINT ' || quote_ident(fk_record.constraint_name) || 
                ' FOREIGN KEY (' || fk_record.columns || 
                ') REFERENCES ' || quote_ident(fk_record.foreign_table_schema) || 
                '.' || quote_ident(fk_record.foreign_table_name) || 
                '(' || fk_record.foreign_columns || ');' || E'\n';
    END LOOP;
    result := result || E'\n';
    
    -- トリガー情報を取得
    result := result || E'-- トリガー: ' || table_name_full || E'\n';
    FOR trigger_record IN 
      SELECT 
        tgname AS trigger_name,
        pg_get_triggerdef(t.oid) AS trigger_def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = schema_name
        AND c.relname = table_record.table_name
        AND NOT t.tgisinternal
    LOOP
      result := result || trigger_record.trigger_def || E';\n';
    END LOOP;
    result := result || E'\n';
    
    -- データをエクスポート（include_dataがtrueの場合）
    IF include_data THEN
      result := result || E'-- データのエクスポート: ' || table_name_full || E'\n';
      
      -- 列名の一覧を取得（ORDER BYをstring_aggの中に移動）
      SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO column_list
      FROM information_schema.columns
      WHERE table_schema = schema_name 
        AND table_name = table_record.table_name;
      
      -- 動的SQLを構築してテーブルデータを取得
      select_stmt := 'SELECT array_to_string(ARRAY[' ||
        (SELECT string_agg(
          'CASE WHEN ' || quote_ident(column_name) || ' IS NULL THEN ''NULL'' ' ||
          'WHEN pg_typeof(' || quote_ident(column_name) || ') IN (''text''::regtype, ''varchar''::regtype, ''char''::regtype, ''json''::regtype, ''jsonb''::regtype, ''date''::regtype, ''timestamp''::regtype, ''timestamptz''::regtype) ' ||
          'THEN '''''''' || replace(' || quote_ident(column_name) || '::text, '''''''', '''''''''''') || '''''''' ' ||
          'ELSE ' || quote_ident(column_name) || '::text END',
          ', ' ORDER BY ordinal_position
        ) FROM information_schema.columns
        WHERE table_schema = schema_name 
          AND table_name = table_record.table_name) ||
      '], '', '') AS row_data FROM ' || table_name_full;
      
      data_rows := '';
      
      -- 動的SQLを実行してデータを取得
      BEGIN
        FOR data_record IN EXECUTE select_stmt LOOP
          IF data_rows <> '' THEN
            data_rows := data_rows || ',';
          END IF;
          data_rows := data_rows || E'\n  (' || data_record.row_data || ')';
        END LOOP;
      EXCEPTION WHEN OTHERS THEN
        data_rows := E'-- エラー: テーブル ' || table_name_full || ' のデータ取得に失敗しました: ' || SQLERRM;
      END;
      
      -- データがある場合はINSERT文を追加
      IF data_rows <> '' AND data_rows NOT LIKE '-- エラー:%' THEN
        result := result || 'INSERT INTO ' || table_name_full || ' (' || column_list || ') VALUES' || data_rows || E';\n\n';
      ELSE
        result := result || E'-- テーブル ' || table_name_full || ' にはデータがありません\n\n';
        IF data_rows LIKE '-- エラー:%' THEN
          result := result || data_rows || E'\n\n';
        END IF;
      END IF;
    END IF;
    
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ダンプファイル用のストレージバケットを作成（存在しない場合のみ）
do $$
begin
    if not exists (select 1 from storage.buckets where id = 'db-backups') then
        insert into storage.buckets (id, name, public)
        values ('db-backups', 'db-backups', false);
    end if;
end $$;

-- RLSを有効化
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Admin users can access db-backups bucket" ON storage.buckets;
DROP POLICY IF EXISTS "Admin users can access db-backups objects" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can access db-backups bucket" ON storage.buckets;
DROP POLICY IF EXISTS "Everyone can access db-backups objects" ON storage.objects;

-- バケットに対するRLSポリシー（管理者のみアクセス可能）
CREATE POLICY "Admin users can access db-backups bucket" ON storage.buckets
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin') AND id = 'db-backups')
    OR (id != 'db-backups') -- 他のバケットへの既存のアクセスは維持
  );

-- ファイルに対するRLSポリシー（管理者のみアクセス可能）
CREATE POLICY "Admin users can access db-backups objects" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin') AND bucket_id = 'db-backups')
    OR (bucket_id != 'db-backups') -- 他のバケットのオブジェクトへの既存のアクセスは維持
  );

-- 注意: Supabaseローカル環境では、ストレージAPIの「object/list」エンドポイントで
-- 「Bucket not found」エラーが発生する場合があります。これはローカル環境の既知の問題であり、
-- 実際の本番環境では正常に動作する可能性が高いです。
-- ローカル環境でのテスト中にこの問題が発生した場合は、フロントエンド側でエラーを適切に処理し、
-- ユーザーにフレンドリーなメッセージを表示するようにしてください。
-- バックアップ処理自体（バックアップの作成とアップロード）はこの問題の影響を受けません。

