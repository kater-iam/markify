# Supabase テスト

## セットアップ

1. 必要なパッケージのインストール:
```bash
npm install --save-dev @supabase/supabase-js chai mocha @types/chai @types/mocha typescript ts-node dotenv
```

2. 環境変数の設定:
以下の環境変数を`.env`ファイルに設定してください：
```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## テストの実行

```bash
# TypeScriptでテストを実行
npx mocha -r ts-node/register -r dotenv/config database/**/*.test.ts
```

## テストの説明

### RLSポリシーテスト
`database/rls_policies.test.ts`では以下のテストを実行します：

#### profiles テーブル
- 一般ユーザーは全てのプロファイルを参照できる
- 一般ユーザーは新規プロファイルを作成できない
- 一般ユーザーは自身のプロファイルの特定フィールドのみ更新できる

#### images テーブル
- 一般ユーザーは自身の画像のみ参照できる
- 一般ユーザーは画像を作成できない

#### download_logs テーブル
- 一般ユーザーはダウンロードログを参照できない
- 一般ユーザーは自身のダウンロードログを作成できる 