/**
 * 画像ファイルをSupabaseのストレージとデータベースに登録するスクリプト
 *
 * supabase/storage/original_images/ ディレクトリ内の画像ファイルを
 * Supabaseのストレージにアップロードし、imagesテーブルにメタデータを登録します。
 *
 * 必要な環境変数:
 * - SUPABASE_URL: Supabaseのエンドポイント（デフォルト: http://127.0.0.1:54411）
 * - SUPABASE_SERVICE_ROLE_KEY: サービスロールキー
 *
 * 使用方法:
 *   # npm scriptを使う場合（推奨）
 *   npm run seed:images:local
 *   npm run seed:images:production -- --profile-id=xxxx --bucket=original-images
 *
 *   # 直接実行する場合
 *   $(npm bin)/ts-node scripts/seed_images.ts --env=.env.local
 *   $(npm bin)/ts-node scripts/seed_images.ts --env=.env.production --profile-id=xxxx --bucket=original-images
 *
 * 処理内容:
 * 1. original_imagesバケットの存在確認（なければ作成 or スキップ）
 * 2. 画像ファイルのアップロード
 * 3. 画像メタデータ（幅、高さ）の取得
 * 4. imagesテーブルへのデータ登録
 * 5. ダウンロードログの生成（画像ごとに5件）
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import sharp from 'sharp';
import minimist from "minimist";
import { v4 as uuidv4 } from 'uuid';
import md5 from 'md5';

// ファイル名パターンと日本語名のマッピング
const patterns: { [key: string]: string } = {
  'landscape': '縦長書類',
  'portrait': '縦長書類',
  'product': '製品',
  'architecture': '建物画像',
  'table': '表',
  'graph': 'グラフ',
  'diagram': '図表',
  'chart': 'チャート',
  'typewriter': 'タイプ打ち文書',
  'printed': '印刷文書',
  'mixed': '混合文書',
  'handwritten': '手書き文書'
};

// ファイル名から日本語名を生成する関数
function getJapaneseName(filename: string): string {
  // 数字とアンダースコアを除去してパターンマッチング用の文字列を作成
  const baseFilename = filename.replace(/\d+_/, '').replace('.jpg', '');

  for (const [pattern, jaName] of Object.entries(patterns)) {
    if (baseFilename.includes(pattern)) {
      // ファイル番号を抽出
      const numberMatch = filename.match(/^(\d+)_/);
      const number = numberMatch ? numberMatch[1] : '';
      return `${jaName}${number ? ` (${number})` : ''}`;
    }
  }

  return filename.split('.')[0]; // マッチするパターンがない場合はファイル名をそのまま使用
}

// コマンドライン引数でenvファイルを指定可能に
const argv = minimist(process.argv.slice(2));
const envPath: string | undefined = (argv as any).env;
if (!envPath) {
  console.error(`\n[使い方]\n  npx tsx scripts/seed_images.ts --env=.env.production [--profile-id=<PROFILE_ID>] [--bucket=<BUCKET>] [--skip-bucket-create]\n\n  --env           : .envファイルのパス（例: .env.production）※必須\n  --profile-id    : imagesテーブルに登録するprofile_id（UUID）※省略時は.envから\n  --bucket        : バケット名（例: original-images）※省略時は.envから\n  --skip-bucket-create : バケット作成をスキップ（本番は必須）\n`);
  process.exit(1);
}

dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROFILE_ID = (argv as any)["profile-id"] || process.env.PROFILE_ID || "00000000-0000-0000-0000-000000000001";
const BUCKET = (argv as any)["bucket"] || process.env.BUCKET || "original-images";
const SKIP_BUCKET_CREATE = (argv as any)["skip-bucket-create"] !== undefined ? Boolean((argv as any)["skip-bucket-create"]) : true; // デフォルトtrue

// 画像ディレクトリのパス
const STORAGE_DIR = path.join(process.cwd(), 'storage/original_images');

// ローカル環境のデフォルト値
const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54411';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function getImageMetadata(filePath: string) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 800,
      height: metadata.height || 600
    };
  } catch (error) {
    console.error(`Failed to get metadata for ${filePath}:`, error);
    return {
      width: 800,
      height: 600
    };
  }
}

// ダウンロードログの生成
async function generateDownloadLogs(supabase: any, imageId: string) {
  // 一般ユーザーのプロファイルIDを取得
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'general')
    .limit(30);

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return;
  }

  // 各画像に対して5つのダウンロードログを生成
  for (let i = 0; i < 5; i++) {
    const profileId = profiles[i % profiles.length].id;
    // 固定のUUIDを生成（画像IDとインデックスから一意のIDを生成）
    const logId = md5(`log-${imageId}-${i}`).toString('hex');
    const clientIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

    const { error: logError } = await supabase
      .from('download_logs')
      .insert({
        id: logId,
        profile_id: profileId,
        image_id: imageId,
        client_ip: clientIp,
        created_at: createdAt,
        updated_at: createdAt
      });

    if (logError) {
      console.error('Error creating download log:', logError);
    }
  }
}

async function uploadImages(supabase: any) {
  const files = fs.readdirSync(STORAGE_DIR);
  let uploadedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.jpg')) continue;

    const localPath = path.join(STORAGE_DIR, file);

    try {
      const fileContent = fs.readFileSync(localPath);
      const { width, height } = await getImageMetadata(localPath);

      // 固定のUUIDを生成（ファイル名から一意のIDを生成）
      const imageId = md5(`image-${file}`).toString('hex');
      const newFileName = `${imageId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newFileName, fileContent, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload ${newFileName}:`, uploadError);
        continue;
      }

      // 画像情報をDBに保存
      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(newFileName);

      const { data: imageData, error: dbError } = await supabase
        .from('images')
        .insert({
          id: imageId,
          profile_id: PROFILE_ID,
          file_path: newFileName,
          original_filename: file,
          name: getJapaneseName(file),
          width,
          height
        })
        .select()
        .single();

      if (dbError) {
        console.error(`Failed to save image data to DB for ${newFileName}:`, dbError);
      } else {
        // ダウンロードログの生成
        await generateDownloadLogs(supabase, imageData.id);
        uploadedCount++;
        console.log(`Successfully uploaded and saved ${newFileName} (${uploadedCount} of ${files.length})`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  console.log(`Total images uploaded: ${uploadedCount}`);
}

async function main() {
  const supabaseUrl = SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;

  // Supabaseクライアントの初期化
  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  );

  // バケットの存在確認
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('Failed to list buckets:', bucketsError);
    process.exit(1);
  }

  const originalImagesBucket = buckets.find(b => b.name === BUCKET);
  if (!originalImagesBucket) {
    if (SKIP_BUCKET_CREATE) {
      console.error(`${BUCKET} bucket not found. Please create it manually in Supabase Studio or run without --skip-bucket-create.`);
      process.exit(1);
    } else {
      console.log(`${BUCKET} bucket not found. Creating...`);
      const { error: createBucketError } = await supabase
        .storage
        .createBucket(BUCKET, { public: false });
      if (createBucketError) {
        console.error('Failed to create bucket:', createBucketError);
        process.exit(1);
      }
      console.log(`Successfully created ${BUCKET} bucket`);
    }
  }

  try {
    console.log('Uploading images...');
    await uploadImages(supabase);
    console.log('Seed images upload completed successfully');
  } catch (error) {
    console.error('Error during seed images upload:', error);
    process.exit(1);
  }
}

main();
