import { supabaseClient } from '../utility/supabaseClient';
const Jimp = require('jimp');

export async function addWatermark(imageId: string): Promise<string> {
  try {
    // オリジナル画像の取得
    const { data: imageData, error: downloadError } = await supabaseClient
      .storage
      .from('images')
      .download(imageId);

    if (downloadError) {
      throw new Error('画像の取得に失敗しました');
    }

    // 画像の処理
    const buffer = Buffer.from(await imageData.arrayBuffer());
    const image = await Jimp.read(buffer);
    
    // ウォーターマークのテキストを追加
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    image.print(
      font,
      10,
      10,
      {
        text: '© Markify',
        alignmentX: 0,
        alignmentY: 0,
      },
      image.getWidth(),
      image.getHeight()
    );

    // 処理済み画像をバッファに変換
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // 処理済み画像をアップロード
    const watermarkedFileName = `watermarked_${imageId}`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('processed-images')
      .upload(watermarkedFileName, processedBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error('処理済み画像のアップロードに失敗しました');
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('processed-images')
      .getPublicUrl(watermarkedFileName);

    return publicUrl;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
} 