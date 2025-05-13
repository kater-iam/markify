# Markify

画像のウォーターマーク付与サービス

## 開発環境のセットアップ

このプロジェクトは以下の2つの主要コンポーネントで構成されています：

1. フロントエンド（Vite + React + Refine）
   - [フロントエンド開発ガイド](./vite-app-ant/README.md)

2. バックエンド（Supabase）
   - [バックエンド開発ガイド](./supabase/README.md)

## 開発フロー

1. リポジトリのクローン
```bash
git clone https://github.com/kater-iam/markify.git
cd markify
```

2. フロントエンドのセットアップ
```bash
cd vite-app-ant
npm install
```

3. バックエンドのセットアップ
```bash
cd supabase
npm install
```

4. 開発サーバーの起動
   - フロントエンドとバックエンドの詳細な起動方法は、それぞれのREADMEを参照してください。

## ブランチ戦略

- `main`: 本番環境用ブランチ
- `develop`: 開発用ブランチ
- 機能開発は `feature/YYYYMM/username/description` の形式でブランチを作成

## プルリクエスト

1. プルリクエストは `develop` ブランチに対して作成
2. タイトルは日本語で変更内容を明確に記載
3. 本文には「概要」と「変更内容」のセクションを含める

## 環境変数

各コンポーネントで必要な環境変数は、それぞれのREADMEを参照してください。

