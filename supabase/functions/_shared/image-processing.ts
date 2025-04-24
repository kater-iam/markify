import { Image, createCanvas, loadImage } from 'https://deno.land/x/canvas@v1.4.1/mod.ts'

export async function processImage(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  // 画像の読み込み
  const image = await loadImage(imageBuffer)
  
  // キャンバスの作成
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  
  // 元の画像を描画
  ctx.drawImage(image, 0, 0)
  
  // ウォーターマークの設定
  ctx.font = '32px sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.textAlign = 'start'
  ctx.textBaseline = 'top'
  
  // ウォーターマークの描画
  ctx.fillText('© Markify', 10, 10)
  
  // 処理済み画像をバッファとして取得
  return canvas.toBuffer()
} 