import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import * as process from 'node:process';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 画像ディレクトリのパス
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

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

async function uploadImagesInDirectory(supabase: any, directory: string) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    if (!file.endsWith('.jpg')) continue;
    
    const localPath = path.join(directory, file);
    
    try {
      const fileContent = fs.readFileSync(localPath);
      const { width, height } = await getImageMetadata(localPath);
      
      const { error: uploadError } = await supabase.storage
        .from('original_images')
        .upload(file, fileContent, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload ${file}:`, uploadError);
      } else {
        // 画像情報をDBに保存
        const { data: publicUrlData } = supabase.storage.from('original_images').getPublicUrl(file);
        
        const { error: dbError } = await supabase
          .from('images')
          .insert({
            profile_id: '00000000-0000-0000-0000-000000000001',
            file_path: file,
            original_filename: file,
            name: file.split('.')[0],
            width,
            height
          });

        if (dbError) {
          console.error(`Failed to save image data to DB for ${file}:`, dbError);
        } else {
          console.log(`Successfully uploaded and saved ${file}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;

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

  const originalImagesBucket = buckets.find(b => b.name === 'original_images');
  if (!originalImagesBucket) {
    console.log('original_images bucket not found. Creating...');
    const { error: createBucketError } = await supabase
      .storage
      .createBucket('original_images', { public: false });

    if (createBucketError) {
      console.error('Failed to create bucket:', createBucketError);
      process.exit(1);
    }
    console.log('Successfully created original_images bucket');
  }

  try {
    // 各カテゴリの画像をアップロード
    const categories = ['documents', 'photos', 'charts'];
    for (const category of categories) {
      const categoryDir = path.join(STORAGE_DIR, category);
      if (fs.existsSync(categoryDir)) {
        console.log(`Uploading images from ${category} directory...`);
        await uploadImagesInDirectory(supabase, categoryDir);
      } else {
        console.warn(`Directory not found: ${categoryDir}`);
      }
    }

    console.log('Seed images upload completed successfully');
  } catch (error) {
    console.error('Error during seed images upload:', error);
    process.exit(1);
  }
}

main(); 