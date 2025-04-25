import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Console } from "node:console";
// deno run -A functions/watermark/index.ts でローカルテスト可
import {
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas@v1.4.2/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { handleError, debug } from '../_shared/utils.ts';

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

interface ImageData {
  file_path: string;
  original_filename: string;
  width: number;
  height: number;
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
  const fontSize = Math.floor(Math.min(w, h) * (opt.fontSizeRel ?? 0.1));
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = `rgba(255,255,255,${opt.opacity ?? 0.25})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  debug.log('Watermark style configured with font size:', fontSize);

  // 透かしの描画
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const angle = ((opt.angle ?? -45) * Math.PI) / 180;
  ctx.rotate(angle);

  const step = fontSize * 3;
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

serve(async (req: Request) => {
  debug.log('Request received:', req.method, req.url);
  
  // CORS用のプリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    debug.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. リクエスト受付
    // GETメソッド以外は許可しない
    if (req.method !== 'GET') {
      debug.log('Invalid method:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // URLからimage_idを取得
    const url = new URL(req.url)
    const imageId = url.pathname.split('/').pop()
    debug.log('Image ID extracted:', imageId)

    if (!imageId) {
      debug.log('No image ID provided');
      return new Response(
        JSON.stringify({ error: '画像IDが指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // JWTの検証
    const authHeader = req.headers.get('Authorization')
    debug.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      debug.log('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 環境変数のログ出力
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    debug.log('Environment check:')
    debug.log('SUPABASE_URL present:', !!supabaseUrl)
    debug.log('SUPABASE_ANON_KEY present:', !!supabaseAnonKey)

    // Supabaseクライアントの初期化
    debug.log('Initializing Supabase client...');
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    )
    debug.log('Supabase client initialized');

    // JWTで渡されたユーザーに変更
    debug.log('Verifying JWT...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      debug.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    debug.log('User authenticated:', user?.email)

    // 2. 画像情報の取得
    debug.log('Fetching image data...')
    const { data: imageData, error: dbError } = await supabaseClient
      .from('images')
      .select('file_path, original_filename, width, height')
      .eq('id', imageId)
      .single()

    if (dbError) {
      debug.error('Database error:', dbError)
      debug.error('Error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      })
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    debug.log('Image data retrieved:', imageData)

    // 3. ストレージからの画像取得
    debug.log('Initializing admin client...');
    const adminClient = createClient(
      supabaseUrl ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    debug.log('Admin client initialized');

    debug.log('Downloading image from storage...')
    const { data: imageFile, error: storageError } = await adminClient
      .storage
      .from('original_images')
      .download(`${imageData.file_path}`)

    if (storageError) {
      debug.error('Storage error:', storageError)
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    debug.log('Image file downloaded successfully');

    // 4. 画像処理
    debug.log('Converting image to array buffer...');
    const arrayBuffer = await imageFile.arrayBuffer()
    debug.log('Array buffer size:', arrayBuffer.byteLength);
    
    debug.log('Processing image with watermark...');
    const processedImage = await addWatermark(arrayBuffer, {
      text: '© YOUR BRAND', // TODO: 設定から取得
    })
    debug.log('Image processed successfully');

    // 5. レスポンス返却
    const contentType = imageData.original_filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg'
    debug.log('Content-Type determined:', contentType);

    debug.log('Sending response...');
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

  } catch (error: unknown) {
    return handleError(error);
  }
}) 