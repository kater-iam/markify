import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { Console } from "node:console";
// deno run -A functions/watermark/index.ts でローカルテスト可
import {
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas@v1.4.2/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  /* 斜めで全面敷き詰め */
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(((opt.angle ?? -45) * Math.PI) / 180);

  const step = fontSize * 3;
  const diag = Math.sqrt(w * w + h * h);
  for (let x = -diag / 2; x < diag / 2; x += step) {
    for (let y = -diag / 2; y < diag / 2; y += step) {
      ctx.fillText(opt.text, x, y);
    }
  }
  ctx.restore();

  return canvas.toBuffer(`image/${format}`, Math.floor(quality * 100));
}

serve(async (req: Request) => {
  // CORS用のプリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. リクエスト受付
    // GETメソッド以外は許可しない
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // URLからimage_idを取得
    const url = new URL(req.url)
    const imageId = url.pathname.split('/').pop()
    console.log('Image ID:', imageId)

    if (!imageId) {
      return new Response(
        JSON.stringify({ error: '画像IDが指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // JWTの検証
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 環境変数のログ出力
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    console.log('Environment variables:')
    console.log('SUPABASE_URL:', supabaseUrl || 'not set')
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey || 'not set')

    // Supabaseクライアントの初期化
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    )

    // JWTで渡されたユーザーに変更
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', user?.email)

    // 2. 画像情報の取得
    console.log('Fetching image data from database...')
    const { data: imageData, error: dbError } = await supabaseClient
      .from('images')
      .select('file_path, original_filename, width, height')
      .eq('id', imageId)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      console.error('Database error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      })
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!imageData) {
      console.log('No image data found for ID:', imageId)
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Image data found:', {
      file_path: imageData.file_path,
      original_filename: imageData.original_filename
    })

    // 3. ストレージからの画像取得
    const adminClient = createClient(
      supabaseUrl ?? '',
      // Deno.env.get('SUPABASE_ANON_KEY')!
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // console.log('Admin Client:', adminClient)

    console.log('Fetching image file from storage...')
    const { data: imageFile, error: storageError } = await adminClient
      .storage
      .from('original_images')
      .download(`${imageData.file_path}`)

    if (storageError) {
      console.error('Storage error. This error might be due to the file not being found:', storageError)
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!imageFile) {
      console.log('No image file found at path:', imageData.file_path)
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 画像処理
    const arrayBuffer = await imageFile.arrayBuffer()
    console.log('Array Buffer:', arrayBuffer)
    const processedImage = await addWatermark(arrayBuffer, {
      text: '© YOUR BRAND', // TODO: 設定から取得
    })

    // 5. レスポンス返却
    // Content-Typeの決定（ファイル名の拡張子から判断）
    const contentType = imageData.original_filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg'

    return new Response(
      processedImage,
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        }
      }
    )

  } catch (error) {
    // エラーログの出力
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 