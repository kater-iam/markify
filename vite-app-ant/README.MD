# Markify フロントエンド

Vite + React + Refine + Ant Design を使用したフロントエンドアプリケーション

## 必要条件

- Node.js 18以上
- npm 9以上

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定：
```env
VITE_SUPABASE_URL=http://127.0.0.1:54411
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_SUPABASE_BUCKET=original-images
```

## 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは http://localhost:5173 で起動します。

## ビルド

```bash
npm run build
```

ビルドされたファイルは `dist` ディレクトリに出力されます。

## テスト

```bash
npm run test
```

## 主な機能

- 画像のアップロード
- ウォーターマーク付き画像のダウンロード
- 画像一覧の表示
- 画像の詳細表示
- 画像の削除

## ディレクトリ構造

```
src/
  ├── components/     # 共通コンポーネント
  ├── pages/         # ページコンポーネント
  ├── providers/     # プロバイダー
  ├── utility/       # ユーティリティ関数
  └── App.tsx        # アプリケーションのエントリーポイント
```

## 開発ガイドライン

1. コンポーネントの作成
   - 新しいコンポーネントは `src/components` に配置
   - ページコンポーネントは `src/pages` に配置

2. スタイリング
   - Ant Design のコンポーネントを優先的に使用
   - カスタムスタイルは必要最小限に

3. 状態管理
   - Refine の機能を活用
   - 必要に応じて React Context を使用

4. エラーハンドリング
   - 適切なエラーメッセージを表示
   - エラー状態の管理を徹底
