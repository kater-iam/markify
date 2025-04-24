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

### 1. 画像の生成

開発環境用のテスト画像を生成するには、以下のコマンドを実行します：

```bash
# プロジェクトルートディレクトリで実行
npx ts-node scripts/generate_seed_images.ts
```

生成される画像：
- ドキュメント画像（80枚）
  - 手書き文書: `handwritten_*.jpg`
  - タイプライター文書: `typewriter_*.jpg`
  - 印刷文書: `printed_*.jpg`
  - 混合文書: `mixed_*.jpg`
- 写真画像（80枚）
  - 風景写真: `landscape_*.jpg`
  - ポートレート写真: `portrait_*.jpg`
  - 商品写真: `product_*.jpg`
  - 建築写真: `architecture_*.jpg`
- チャート画像（40枚）
  - チャート: `chart_*.jpg`
  - グラフ: `graph_*.jpg`
  - ダイアグラム: `diagram_*.jpg`
  - 表: `table_*.jpg`

画像は`storage/`ディレクトリ内のカテゴリごとのフォルダに生成されます。

### 2. 画像のシーディング

生成した画像をSupabaseのストレージにアップロードするには、以下の手順を実行します：

1. 環境変数の設定
`.env`ファイルに以下の環境変数を設定してください：
```bash
SUPABASE_URL=http://127.0.0.1:54321  # ローカル開発時
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> Note: 環境変数を設定しない場合、デフォルト値が使用されます。

2. シーディングの実行
```bash
# supabaseディレクトリで実行
npm run seed:images
```

このコマンドは以下の処理を行います：
- `original_images`バケットの存在確認（なければ作成）
- `storage/`ディレクトリ内の全ての画像をアップロード
- 画像は全て`original_images`バケットの直下に配置されます

### 3. 注意事項

- 生成された画像は開発・テスト環境専用です
- 本番環境では実際のユーザーがアップロードした画像を使用してください
- 画像の詳細な管理方針については`storage/README.md`を参照してください