import { encode as base64Encode } from 'https://deno.land/std@0.106.0/encoding/base64.ts'
import { createCanvas, loadImage } from 'https://deno.land/x/canvas@v1.4.1/mod.ts'

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number;
  angle?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: WatermarkOptions = {
  text: '© YOUR BRAND',
  fontSize: 0.1, // 画像幅に対する比率
  opacity: 0.25,
  angle: -45,
  quality: 0.9,
  outputFormat: 'image/jpeg'
}

/**
 * 画像全体に透過文字列を敷き詰める
 * @param buf ArrayBuffer 形式の元画像
 * @param options ウォーターマークのオプション
 * @returns Uint8Array
 */
export async function processImage(
  buf: ArrayBuffer,
  options: Partial<WatermarkOptions> = {}
): Promise<Uint8Array> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options } as Required<WatermarkOptions>
    
    // Uint8Array → Base64 データ URL へ変換
    const base64 = base64Encode(new Uint8Array(buf))
    const img = await loadImage(`data:${opts.outputFormat};base64,${base64}`)

    const w = img.width()
    const h = img.height()
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')

    // 元画像をそのまま描画
    ctx.drawImage(img, 0, 0)

    // ウォーターマーク設定
    const fontSize = Math.floor(w * opts.fontSize)
    const step = fontSize * 3
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = `rgba(255,255,255,${opts.opacity})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 斜めに敷き詰めるためにキャンバス全体を回転
    ctx.translate(w / 2, h / 2)
    ctx.rotate((opts.angle * Math.PI) / 180)

    const diag = Math.sqrt(w * w + h * h)
    for (let x = -diag / 2; x < diag / 2; x += step) {
      for (let y = -diag / 2; y < diag / 2; y += step) {
        ctx.fillText(opts.text, x, y)
      }
    }

    // 指定されたフォーマットでバッファを返却
    return canvas.toBuffer(opts.outputFormat, opts.quality)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`画像処理中にエラーが発生しました: ${error.message}`)
    }
    throw new Error('画像処理中に予期せぬエラーが発生しました')
  }
}
