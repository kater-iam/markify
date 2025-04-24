# Supabase Edge Functions ガイド

## Edge Functions 基本操作

### 起動方法

```bash
# 基本起動
supabase functions serve 関数名

# バックグラウンドで実行（ログファイルに出力）
pkill -f "supabase functions serve" && supabase functions serve > supabase/functions.log 2>&1 &
```

### ログ確認

```bash
# ログ全体表示
cat supabase/functions.log

# リアルタイム監視
tail -f supabase/functions.log
```

### 環境変数（Secrets）

- **自動読み込み**: `supabase/functions/.env` が自動的に読み込まれます
- **手動指定**: `--env-file` オプションで別のファイルを指定できます
- **ローカル環境のキー**: 開発者間で共通のため共有しても問題ありません
- **本番環境**: `supabase secrets set 変数名=値` で設定（非公開で管理）

### 環境変数ファイル例

```bash
# 基本設定
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```


## データベースバックアップ機能

```bash
# JWT認証を使用したバックアップ関数実行
ACCESS_TOKEN=$(curl -s -X POST 'http://localhost:54321/auth/v1/token?grant_type=password' \
  -H "apikey: $(supabase status --output json | jq -r '.api.anon_key')" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kater.jp","password":"password123"}' | jq -r '.access_token')

curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:54321/functions/v1/db-backup
```

## シード画像機能

### 環境変数の設定
`.env`ファイルに以下の環境変数を設定してください：
```bash
SUPABASE_URL=http://127.0.0.1:54321  # ローカル開発時
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 実行方法
```bash
# シード画像のアップロード
npm run seed:images
```

シード画像は`original_images`バケットの以下のパスにアップロードされます：
- `images/sample1.png`
- `images/sample2.png`
- `images/sample3.png`

> Note: このスクリプトは開発環境でのテスト用です。本番環境では実際の画像データを使用してください。