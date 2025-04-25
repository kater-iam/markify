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
  console.log('DEBUG: Starting addWatermark function');
  console.log('DEBUG: Input buffer size:', buf.byteLength);
  console.log('DEBUG: Options:', JSON.stringify(opt));
  
  const b64 = base64Encode(new Uint8Array(buf));
  console.log('DEBUG: Base64 encoded length:', b64.length);
  
  console.log('DEBUG: Loading image...');
  const img = await loadImage(`data:image/${format};base64,${b64}`);
  console.log('DEBUG: Image loaded successfully');

  const w = img.width();
  const h = img.height();
  console.log('DEBUG: Image dimensions:', { width: w, height: h });

  console.log('DEBUG: Creating canvas...');
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  console.log('DEBUG: Canvas created');

  /* 元画像を描画 */
  console.log('DEBUG: Drawing original image...');
  ctx.drawImage(img, 0, 0);
  console.log('DEBUG: Original image drawn');

  /* 透かし設定 */
  const fontSize = Math.floor(
    Math.min(w, h) * (opt.fontSizeRel ?? 0.1),
  );
  console.log('DEBUG: Font size calculated:', fontSize);
  
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = `rgba(255,255,255,${opt.opacity ?? 0.25})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  console.log('DEBUG: Watermark text settings applied');

  /* 斜めで全面敷き詰め */
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const angle = ((opt.angle ?? -45) * Math.PI) / 180;
  console.log('DEBUG: Rotation angle (radians):', angle);
  ctx.rotate(angle);

  const step = fontSize * 3;
  const diag = Math.sqrt(w * w + h * h);
  console.log('DEBUG: Starting watermark pattern. Step:', step, 'Diagonal:', diag);
  
  let watermarkCount = 0;
  for (let x = -diag / 2; x < diag / 2; x += step) {
    for (let y = -diag / 2; y < diag / 2; y += step) {
      ctx.fillText(opt.text, x, y);
      watermarkCount++;
    }
  }
  console.log('DEBUG: Watermarks drawn:', watermarkCount);
  
  ctx.restore();
  console.log('DEBUG: Context restored');

  try {
    console.log('DEBUG: Attempting to encode canvas...');
    const buffer = canvas.toBuffer();
    console.log('DEBUG: Canvas encoded successfully. Buffer size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('DEBUG: Error encoding canvas:', error);
    throw error;
  }
}

serve(async (req: Request) => {
  console.log('DEBUG: Request received:', req.method, req.url);
  
  // CORS用のプリフライトリクエスト対応
  if (req.method === 'OPTIONS') {
    console.log('DEBUG: Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. リクエスト受付
    // GETメソッド以外は許可しない
    if (req.method !== 'GET') {
      console.log('DEBUG: Invalid method:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // URLからimage_idを取得
    const url = new URL(req.url)
    const imageId = url.pathname.split('/').pop()
    console.log('DEBUG: Image ID extracted:', imageId)

    if (!imageId) {
      console.log('DEBUG: No image ID provided');
      return new Response(
        JSON.stringify({ error: '画像IDが指定されていません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // JWTの検証
    const authHeader = req.headers.get('Authorization')
    console.log('DEBUG: Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('DEBUG: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 環境変数のログ出力
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    console.log('DEBUG: Environment check:')
    console.log('DEBUG: SUPABASE_URL present:', !!supabaseUrl)
    console.log('DEBUG: SUPABASE_ANON_KEY present:', !!supabaseAnonKey)

    // Supabaseクライアントの初期化
    console.log('DEBUG: Initializing Supabase client...');
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    )
    console.log('DEBUG: Supabase client initialized');

    // JWTで渡されたユーザーに変更
    console.log('DEBUG: Verifying JWT...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      console.error('DEBUG: Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('DEBUG: User authenticated:', user?.email)

    // 2. 画像情報の取得
    console.log('DEBUG: Fetching image data...')
    const { data: imageData, error: dbError } = await supabaseClient
      .from('images')
      .select('file_path, original_filename, width, height')
      .eq('id', imageId)
      .single()

    if (dbError) {
      console.error('DEBUG: Database error:', dbError)
      console.error('DEBUG: Error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      })
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('DEBUG: Image data retrieved:', imageData)

    // 3. ストレージからの画像取得
    console.log('DEBUG: Initializing admin client...');
    const adminClient = createClient(
      supabaseUrl ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    console.log('DEBUG: Admin client initialized');

    console.log('DEBUG: Downloading image from storage...')
    const { data: imageFile, error: storageError } = await adminClient
      .storage
      .from('original_images')
      .download(`${imageData.file_path}`)

    if (storageError) {
      console.error('DEBUG: Storage error:', storageError)
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('DEBUG: Image file downloaded successfully');

    // 4. 画像処理
    console.log('DEBUG: Converting image to array buffer...');
    const arrayBuffer = await imageFile.arrayBuffer()
    console.log('DEBUG: Array buffer size:', arrayBuffer.byteLength);
    
    console.log('DEBUG: Processing image with watermark...');
    const processedImage = await addWatermark(arrayBuffer, {
      text: '© YOUR BRAND', // TODO: 設定から取得
    })
    console.log('DEBUG: Image processed successfully');

    // 5. レスポンス返却
    const contentType = imageData.original_filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg'
    console.log('DEBUG: Content-Type determined:', contentType);

    console.log('DEBUG: Sending response...');
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
    console.error('DEBUG: Fatal error:', error)
    console.error('DEBUG: Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 