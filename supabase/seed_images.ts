import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import * as process from 'node:process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_IMAGES_DIR = path.join(__dirname, 'seed_images');
const TRANSPARENT_PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  // Supabaseクライアントの初期化
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // シード画像用ディレクトリの作成
  if (!fs.existsSync(SEED_IMAGES_DIR)) {
    fs.mkdirSync(SEED_IMAGES_DIR, { recursive: true });
  }

  try {
    // サンプル画像の作成
    const sampleImages = [
      { name: 'sample1.png', path: 'images/sample1.png' },
      { name: 'sample2.png', path: 'images/sample2.png' },
      { name: 'sample3.png', path: 'images/sample3.png' }
    ];

    for (const image of sampleImages) {
      const localPath = path.join(SEED_IMAGES_DIR, image.name);
      
      // ローカルに一時的な画像ファイルを作成
      fs.writeFileSync(localPath, TRANSPARENT_PIXEL);

      // オリジナル画像バケットにアップロード
      const { error: uploadError } = await supabase.storage
        .from('original_images')
        .upload(image.path, fs.readFileSync(localPath), {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload ${image.name}:`, uploadError);
      } else {
        console.log(`Successfully uploaded ${image.name} to original_images bucket`);
      }

      // ローカルの一時ファイルを削除
      fs.unlinkSync(localPath);
    }

    // 一時ディレクトリの削除
    fs.rmdirSync(SEED_IMAGES_DIR);

    console.log('Seed images upload completed successfully');
  } catch (error) {
    console.error('Error during seed images upload:', error);
    process.exit(1);
  }
}

main(); 