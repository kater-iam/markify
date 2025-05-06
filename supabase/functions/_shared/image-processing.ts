// deno run -A functions/watermark/index.ts でローカルテスト可
import { createCanvas, loadImage } from "https://deno.land/x/canvas@v1.4.2/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { debug } from './utils.ts';

export interface WatermarkOptions {
  text: string;            // 透かし文字列
  fontSize?: number;       // フォントサイズ（px）既定 11px
  opacity?: number;        // 0-1 既定 0.25
  angle?: number;          // deg 既定 -45
  color?: string;         // 色指定（CSS色形式）既定 '#FFFFFF'
}

/* ---------- 透かし処理本体 ---------- */
export async function addWatermark(
  buf: ArrayBuffer,
  opt: WatermarkOptions = { text: "© YOUR BRAND" },
  format: "jpeg" | "png" | "webp" = "jpeg",
  quality = 0.82,
): Promise<Uint8Array> {
  debug.log('Starting addWatermark function');
  debug.log('Input buffer size:', buf.byteLength);
  debug.log('Options:', JSON.stringify(opt));
  
  // 画像の読み込みと準備
  const b64 = base64Encode(new Uint8Array(buf));
  debug.log('Base64 encoded length:', b64.length);
  
  const img = await loadImage(`data:image/${format};base64,${b64}`);
  const w = img.width();
  const h = img.height();
  debug.log('Image dimensions:', { width: w, height: h });

  // キャンバスの作成と元画像の描画
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // 透かしのスタイル設定
  const fontSize = opt.fontSize ?? 11; // デフォルトは11px
  ctx.font = `${fontSize}px sans-serif`;
  const color = opt.color ?? '#FFFFFF'; // デフォルトは白
  ctx.fillStyle = `${color}${opt.opacity ? Math.round(opt.opacity * 255).toString(16).padStart(2, '0') : '40'}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  debug.log('Watermark style configured with font size, color:', fontSize, color);

  // 透かしの描画
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const angle = ((opt.angle ?? -45) * Math.PI) / 180;
  ctx.rotate(angle);

  // 文字列の長さに基づいて間隔を計算
  const textWidth = ctx.measureText(opt.text).width;
  const step = Math.max(textWidth * 1.5, fontSize * 3); // 文字列の長さの1.5倍か、フォントサイズの3倍の大きい方を使用
  const diag = Math.sqrt(w * w + h * h);
  debug.log('Drawing watermark pattern. Step:', step, 'Diagonal:', diag);
  
  let watermarkCount = 0;
  for (let x = -diag / 2; x < diag / 2; x += step) {
    for (let y = -diag / 2; y < diag / 2; y += step) {
      ctx.fillText(opt.text, x, y);
      watermarkCount++;
    }
  }
  ctx.restore();
  debug.log('Watermarks drawn:', watermarkCount);

  try {
    const buffer = canvas.toBuffer();
    debug.log('Canvas encoded successfully. Buffer size:', buffer.length);
    return buffer;
  } catch (error: unknown) {
    if (error instanceof Error) {
      debug.error('Error encoding canvas:', error.message);
    } else {
      debug.error('Unknown error occurred while encoding canvas');
    }
    throw error;
  }
}