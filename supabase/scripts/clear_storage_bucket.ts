/**
 * Supabaseのストレージバケットをクリアするスクリプト
 * 
 * 指定されたバケット内のすべてのファイルを削除します。
 * デフォルトでは original_images バケットが対象となります。
 * 
 * 必要な環境変数:
 * - SUPABASE_URL: Supabaseのエンドポイント（デフォルト: http://127.0.0.1:54411）
 * - SUPABASE_SERVICE_ROLE_KEY: サービスロールキー
 * 
 * 使用方法:
 * ```bash
 * cd supabase
 * npx ts-node scripts/clear_storage_bucket.ts [バケット名]
 * ```
 * 
 * 注意:
 * - このスクリプトは指定されたバケット内のすべてのファイルを削除します
 * - 削除前に確認メッセージが表示されます
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as process from 'node:process';

dotenv.config();

// ローカル環境のデフォルト値
const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54411';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function clearStorageBucket(bucketName: string) {
  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;

  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  );

  try {
    // バケットの存在確認
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('バケット一覧の取得に失敗:', bucketsError);
      return;
    }

    const bucket = buckets.find(b => b.name === bucketName);
    if (!bucket) {
      console.error(`バケット "${bucketName}" が見つかりません`);
      return;
    }

    // バケット内のファイル一覧を取得
    const { data: files, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list('', {
        limit: 100000 // より大きな数値を指定して、より多くのファイルを一度に取得
      });

    if (listError) {
      console.error('ファイル一覧の取得に失敗:', listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log(`バケット "${bucketName}" にファイルが存在しません`);
      return;
    }

    console.log(`${files.length} 個のファイルを削除します...`);

    // ファイルの削除
    const filesToDelete = files.map(file => file.name);
    const { error: deleteError } = await supabase
      .storage
      .from(bucketName)
      .remove(filesToDelete);

    if (deleteError) {
      console.error('ファイルの削除に失敗:', deleteError);
      return;
    }

    console.log(`バケット "${bucketName}" から ${files.length} 個のファイルを削除しました`);
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// コマンドライン引数からバケット名を取得
const bucketName = process.argv[2];
if (!bucketName) {
  console.error('使用方法: npx tsx clear_storage_bucket.ts <bucket_name>');
  process.exit(1);
}

clearStorageBucket(bucketName);
