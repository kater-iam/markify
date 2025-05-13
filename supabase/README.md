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

## ウォーターマーク画像機能

### JWTを使用した認証とアクセス

```bash
# JWTトークンの取得
ACCESS_TOKEN=$(curl -s -X POST 'http://localhost:54411/auth/v1/token?grant_type=password' \
  -H "apikey: $(supabase status --output json | jq -r '.api.anon_key')" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@kater.jp","password":"password123"}' | jq -r '.access_token')

# ウォーターマーク画像機能へのアクセス
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:54411/functions/v1/watermark-image/0287da2f-4058-891c-787e-7d68a7346ee8
```

> Note: 上記のコマンドはローカル開発環境用です。本番環境では適切なURLとAPIキーを使用してください。

## スクリプト一覧

`scripts/` ディレクトリには以下のユーティリティスクリプトが用意されています：

### 画像生成・管理スクリプト

1. **generate_seed_images.ts**
   - 開発環境用のテスト画像を生成
   - 生成される画像：ドキュメント(80枚)、写真(80枚)、チャート(40枚)
   ```bash
   npx ts-node scripts/generate_seed_images.ts
   ```

2. **move_and_rename_images.ts**
   - 画像ファイルの移動とリネーム
   - `storage/` 内のカテゴリ別フォルダから `supabase/storage/original_images/` へ移動
   ```bash
   cd supabase
   npx ts-node scripts/move_and_rename_images.ts
   ```

3. **seed_images.ts**
   - 画像ファイルをSupabaseのストレージとDBに登録
   - `supabase/storage/original_images/` 内の画像を処理
   ```bash
   cd supabase
   npx ts-node scripts/seed_images.ts
   ```

4. **clear_storage_bucket.ts**
   - Supabaseのストレージバケットをクリア
   - デフォルトで `original_images` バケットを対象
   ```bash
   cd supabase
   npx ts-node scripts/clear_storage_bucket.ts [バケット名]
   ```

### シェルスクリプト

1. **re_seed_images.sh**
   - 画像の再シード処理を一括実行
   - バケットのクリア、画像の生成、移動、アップロードを順次実行
   ```bash
   cd supabase
   ./scripts/re_seed_images.sh
   ```

2. **restart_serve_function_and_test_watermark.sh**
   - ウォーターマーク機能のテスト用スクリプト
   - 関数の再起動とテストを実行
   ```bash
   cd supabase
   ./scripts/restart_serve_function_and_test_watermark.sh
   ```

### 画像処理の一括実行

開発環境で画像データを初期化する場合は、以下の手順で実行できます：

```bash
cd supabase
# 1. バケットをクリア
npx ts-node scripts/clear_storage_bucket.ts

# 2. テスト画像を生成
npx ts-node scripts/generate_seed_images.ts

# 3. 画像を移動・リネーム
npx ts-node scripts/move_and_rename_images.ts

# 4. Supabaseに登録
npx ts-node scripts/seed_images.ts

# または、一括実行スクリプトを使用
./scripts/re_seed_images.sh
```

# Markify バックエンド

Supabaseを使用したバックエンドアプリケーション

## 必要条件

- Node.js 18以上
- npm 9以上
- Docker
- Supabase CLI

## セットアップ

1. Supabase CLIのインストール
```bash
npm install -g supabase
```

2. 依存関係のインストール
```bash
npm install
```

3. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定：
```env
SUPABASE_URL=http://127.0.0.1:54411
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## ローカル開発環境の起動

1. Supabaseの起動
```bash
supabase start
```

2. データベースのマイグレーション
```bash
supabase db reset
```

## シードデータの投入

1. テスト画像の生成
```bash
npx ts-node scripts/generate_seed_images.ts
```

2. 画像データの投入
```bash
npx ts-node scripts/seed_images.ts --env=.env.local
```

## ディレクトリ構造

```
supabase/
  ├── migrations/     # データベースマイグレーションファイル
  ├── seed/          # シードデータ
  ├── scripts/       # ユーティリティスクリプト
  └── functions/     # Edge Functions
```

## 主な機能

1. データベース
   - 画像メタデータの管理
   - ダウンロードログの記録
   - ユーザー認証情報の管理

2. ストレージ
   - オリジナル画像の保存
   - ウォーターマーク付き画像の保存

3. Edge Functions
   - ウォーターマーク処理
   - 画像の最適化

## 開発ガイドライン

1. データベース設計
   - マイグレーションファイルは`migrations`ディレクトリに配置
   - スキーマの変更は必ずマイグレーションファイルで管理

2. ストレージ管理
   - 画像ファイルはUUIDベースのファイル名を使用
   - バケットのアクセス制御を適切に設定

3. Edge Functions
   - 関数は`functions`ディレクトリに配置
   - エラーハンドリングを徹底
   - パフォーマンスを考慮した実装

4. テスト
   - 各機能のユニットテストを作成
   - エッジケースのテストを実施
