# [.envファイルの管理方針](.cursor/rules/env.mdc)

## 1. [ローカル開発環境の固定値のGit管理](.cursor/rules/env.mdc)
ローカル開発環境で使用する`.env`ファイルには、開発者間で共通の固定値（例：Supabaseのローカル環境のURL、キーなど）が含まれることがあります。これらの値は以下の理由からGitで管理することが推奨されます：

- 開発者間での環境設定の統一が容易になる
- ローカル環境の固定値は秘匿性が低い（例：Supabaseのローカルキーは全開発者で同じ）
- 新規開発者のセットアップ時間を短縮できる

## 2. [本番環境の秘匿情報の管理除外](.cursor/rules/env.mdc)
本番環境で使用する秘匿情報（APIキー、パスワードなど）は、セキュリティリスクを避けるためGitで管理しません。これらの情報は以下の方法で管理します：

- 環境変数として直接設定
- シークレット管理サービスの利用
- デプロイメントプロセスでの注入

## 3. [Git管理時のコメント記載](.cursor/rules/env.mdc)
`.env`ファイルをGitで管理する場合、各環境変数が秘匿情報ではないことを明確にするため、コメントを記載します。例：

```bash
# 以下の環境変数はローカル開発環境の固定値であり、秘匿情報ではありません
SUPABASE_URL=http://localhost:54321
```

## 4. [.env.exampleファイルの管理](.cursor/rules/env.mdc)
`.env.example`ファイルは、必要な環境変数の一覧とその形式を示すテンプレートとして機能します。このファイルは：

- 必要な環境変数の一覧を提供
- 各環境変数の形式や制約を説明
- 開発者が自身の`.env`ファイルを作成する際のガイドとなる

## 5. [.env.productionファイルの管理](.cursor/rules/env.mdc)
`.env.production`ファイルの管理方法は、含まれる情報の性質に応じて決定します：

### 公開可能な情報のGit管理
以下のような公開可能な情報はGitで管理することが推奨されます：
- Supabaseの`ANON_KEY`（クライアントサイドでも使用される）
- 公開APIのエンドポイントURL
- 公開されているサービスの設定値
- CI/CDでビルドに必要な公開情報

管理する理由：
- CI/CDパイプラインでの自動ビルドが容易になる
- 設定の一貫性が保たれる
- チーム間での設定共有が容易になる

### 秘匿情報の別途管理
以下のような秘匿情報は`.gitignore`に追加し、別途管理します：
- `SERVICE_ROLE_KEY`などの管理者権限を持つキー
- 決済サービスのAPIキー
- データベースの認証情報

管理方法：
- 環境変数として直接設定
- シークレット管理サービスの利用
- デプロイメントプロセスでの注入 