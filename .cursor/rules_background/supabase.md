# Supabaseの操作とデータベース管理のルール背景

このドキュメントは[supabase.mdc](./../rules/supabase.mdc)のルールの背景を説明するものです。

## 1. 専用Terminalの使用
- 「supabase」という名前の専用Terminalを使用することで：
  - Supabase関連の操作履歴を一元管理
  - 他の開発作業との混在を防止
  - ログの追跡が容易に

## 2. バックグラウンド実行
- Supabaseのローカル操作をバックグラウンドで実行することで：
  - 他の開発作業を妨げない
  - ターミナルのブロックを防止
  - 長時間の操作も安全に実行可能

## 3. ローカル関数の起動方法
```bash
pkill -f "supabase functions serve" ; supabase functions serve > supabase/functions.log 2>&1 &
```
- このコマンドの利点：
  - 既存のプロセスを確実に終了
  - ログファイルへの出力で追跡が容易
  - エラー出力も含めて記録

## 4. デプロイの制限
- ローカル開発を優先することで：
  - 開発環境での十分なテストが可能
  - 本番環境への影響を防止
  - チーム内でのレビューを確実に実施

## 5. マイグレーションファイルの作成
マイグレーションには以下を含める必要があります：
```sql
-- 変更内容の説明
-- 作成者：名前
-- 作成日：YYYY-MM-DD

-- 変更内容
CREATE TABLE example (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL
);

-- ロールバック手順
-- DROP TABLE example;
```
- 初期バージョン（概ね v1.0 より前）については、既存のマイグレーションファイルを編集してまとめることで履歴の見通しが良くなる。

## 6. マイグレーションファイルの命名
- `YYYYMMDDHHMMSS_descriptions.sql` 形式の例：
  - `20240215143000_create_users_table.sql`
  - `20240215143500_add_profile_columns.sql`
- 時系列での管理が容易に
- 変更内容が名前から推測可能

## 7. タイムスタンプカラム
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT (current_timestamp AT TIME ZONE 'JST' AT TIME ZONE 'Asia/Tokyo') NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT (current_timestamp AT TIME ZONE 'JST' AT TIME ZONE 'Asia/Tokyo') NOT NULL
```
- JSTでの一貫した時刻管理
- 自動更新トリガーの設定

## 8. カラムコメント
```sql
-- 良い例
COMMENT ON COLUMN users.email IS 'ユーザーのメールアドレス（主要な連絡先として使用）';
COMMENT ON COLUMN profiles.user_id IS 'ユーザーID（usersテーブルの外部キー）';

-- 避けるべき例
COMMENT ON COLUMN users.email IS 'email address';
```

## 9. Dockerイメージの管理
```bash
# 新しいイメージ取得後の確認と削除
docker images | grep supabase
docker rmi [古いイメージID]
```
- ディスク容量の効率的な管理
- 不要なイメージの蓄積を防止
- システムリソースの最適化 

## 10. Edge Functions の認証

### 基本的な認証フロー
```typescript
// Supabaseクライアントの初期化
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
)

// JWTトークンの取得と認証
const authHeader = req.headers.get('Authorization')!
const token = authHeader.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### クライアントからの呼び出し方法
```bash
# JWTトークンの取得
ACCESS_TOKEN=$(curl -s -X POST 'http://localhost:54411/auth/v1/token?grant_type=password' \
  -H "apikey: $(supabase status --output json | jq -r '.api.anon_key')" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}' | jq -r '.access_token')

# Edge Functionの呼び出し
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:54411/functions/v1/your-function-name
```

### 重要な注意点
1. Edge Functions内では`SUPABASE_ANON_KEY`を使用してクライアントを初期化
2. クライアントからの呼び出し時は`Authorization`ヘッダーにJWTトークンを設定
3. 認証エラーは適切にハンドリングし、401ステータスコードを返す
4. 環境変数（`SUPABASE_URL`と`SUPABASE_ANON_KEY`）が正しく設定されていることを確認

### 参考資料
- [Supabase Edge Functions Auth公式ドキュメント](https://supabase.com/docs/guides/functions/auth)
- [Supabase Edge Functions Overview](https://supabase.com/docs/guides/functions)
- [JWT認証の基本概念](https://supabase.com/docs/learn/auth-deep-dive/auth-deep-dive-jwts)

### ローカル開発時のデバッグ
```bash
# ログの確認
tail -f supabase/functions.log

# 認証情報の確認
supabase status --output json | jq '.api.anon_key'
```

