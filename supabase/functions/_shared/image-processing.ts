// deno run -A functions/watermark/index.ts でローカルテスト可
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas@v1.4.2/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

// デバッグログのユーティリティ関数
const debugLog = (...args: unknown[]) => console.log('DEBUG:', ...args);
const debugError = (...args: unknown[]) => console.error('DEBUG ERROR:', ...args);

interface WatermarkOptions {
  text: string;            // 透かし文字列
  fontSizeRel?: number;    // 画像辺に対する割合 (0-1) 既定 0.1
  opacity?: number;        // 0-1 既定 0.25
  angle?: number;          // deg 既定 -45
}

/* ---------- 透かし処理本体 ---------- */
export async function addWatermark(
  buf: ArrayBuffer,
  opt: WatermarkOptions = { text: "© YOUR BRAND" },
  format: "jpeg" | "png" | "webp" = "jpeg",
  quality = 0.82,
): Promise<Uint8Array> {
  const b64 = base64Encode(new Uint8Array(buf));
  const img = await loadImage(`data:image/${format};base64,${b64}`);

  const w = img.width();
  const h = img.height();
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  /* 元画像を描画 */
  ctx.drawImage(img, 0, 0);

  /* 透かし設定 */
  const fontSize = Math.floor(
    Math.min(w, h) * (opt.fontSizeRel ?? 0.1),
  );
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = `rgba(255,255,255,${opt.opacity ?? 0.25})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  /* 透かしの描画 */
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const angle = ((opt.angle ?? -45) * Math.PI) / 180;
  ctx.rotate(angle);
  debugLog('Canvas transformed for watermark');

  const step = fontSize * 3;
  const diag = Math.sqrt(w * w + h * h);
  let watermarkCount = 0;

  for (let x = -diag / 2; x < diag / 2; x += step) {
    for (let y = -diag / 2; y < diag / 2; y += step) {
      ctx.fillText(opt.text, x, y);
      watermarkCount++;
    }
  }
  ctx.restore();
  debugLog('Watermarks drawn:', watermarkCount);

  debugLog('Encoding final image...');
  // 修正：toBufferの引数を正しく指定
  const buffer = canvas.toBuffer();
  debugLog('Final buffer size:', buffer.length);

  return buffer;
}

/* ---------- Supabase Edge Function ---------- */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  try {
    const { imageId, wmText } = await req.json();
    if (!imageId) throw new Error("imageId が必要です");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Edgeだが Service Role OK
    );

    /* 画像取得 */
    const { data, error } = await supabase.storage
      .from("original_images")
      .download(imageId);
    if (error) throw new Error("画像取得失敗: " + error.message);

    /* 透かし加工 */
    const watermarked = await addWatermark(
      await data.arrayBuffer(),
      { text: wmText ?? "© YOUR BRAND" },
    );

    /* アップロード */
    const target = `watermarked_${imageId}`;
    const { error: upErr } = await supabase.storage
      .from("watermarked_images")
      .upload(target, watermarked, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (upErr) throw new Error("アップロード失敗: " + upErr.message);

    /* 公開 URL */
    const { data: { publicUrl } } = supabase.storage
      .from("watermarked_images")
      .getPublicUrl(target);

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    debugError('Error in request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});