/**
 * 画像ファイルの移動とリネームを行うスクリプト
 * 
 * storage/ ディレクトリ内のカテゴリ別フォルダ（documents, photos, charts）から
 * 画像を取得し、supabase/storage/original_images/ ディレクトリに移動します。
 * 
 * ファイル名の形式を以下のように変更します：
 * - 変更前: category_001.jpg
 * - 変更後: 001_category.jpg
 * 
 * 使用方法:
 * ```bash
 * cd supabase
 * npx ts-node scripts/move_and_rename_images.ts
 * ```
 * 
 * 注意: 
 * - 移動元のファイルはそのまま残ります
 * - ファイル名の数字は重複しないように自動的に調整されます
 */

import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join(process.cwd(), '../storage');
const DEST_DIR = path.join(process.cwd(), 'storage/original_images');

// ファイル名から数値部分を抽出する関数
function extractNumber(filename: string): number {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ファイル名からタイプを抽出する関数
function extractType(filename: string): string {
  const match = filename.match(/^([a-z]+)_\d+/);
  return match ? match[1] : '';
}

// ファイルを移動およびリネームする関数
async function moveAndRenameFiles(): Promise<void> {
  const categories = ['photos', 'documents', 'charts'];
  const usedNumbers = new Set<number>();
  
  // 出力ディレクトリの作成
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  for (const category of categories) {
    const sourceDir = path.join(SOURCE_DIR, category);
    
    // ディレクトリが存在するか確認
    if (!fs.existsSync(sourceDir)) {
      console.log(`ソースディレクトリが存在しません: ${sourceDir}`);
      continue;
    }
    
    // ディレクトリ内のファイルを取得
    const files = fs.readdirSync(sourceDir);
    
    for (const file of files) {
      if (!file.endsWith('.jpg')) continue;
      
      const sourceFile = path.join(sourceDir, file);
      const fileType = extractType(file);
      let fileNumber = extractNumber(file);
      
      // 番号が重複している場合は新しい番号を割り当てる
      while (usedNumbers.has(fileNumber)) {
        fileNumber++;
      }
      usedNumbers.add(fileNumber);
      
      // 新しいファイル名を作成
      const newFilename = `${String(fileNumber).padStart(3, '0')}_${fileType}.jpg`;
      const destFile = path.join(DEST_DIR, newFilename);
      
      // ファイルをコピー
      fs.copyFileSync(sourceFile, destFile);
      console.log(`移動: ${sourceFile} -> ${destFile}`);
    }
  }
}

// メイン処理
async function main(): Promise<void> {
  try {
    await moveAndRenameFiles();
    console.log('すべてのファイルの移動と名前変更が完了しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

main(); 