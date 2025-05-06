import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// deno run -A functions/watermark/index.ts でローカルテスト可
import {
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas@v1.4.2/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { handleError, debug } from '../_shared/utils.ts';
import { addWatermark, type WatermarkOptions } from '../_shared/image-processing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageData {
  file_path: string;
  original_filename: string;
  width: number;
  height: number;
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

    // ユーザーのプロファイル情報を取得
    debug.log('Fetching user profile...')
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('code')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      debug.error('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    debug.log('User profile retrieved:', profile)

    // ServiceRoleを使ったadminClientを作成（Storageやwatermarkオプションへのアクセス）
    debug.log('Initializing admin client...');
    const serviceRoleClient = createClient(
      supabaseUrl ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    debug.log('Admin client initialized');


    // watermark設定の取得
    debug.log('Fetching watermark settings...')
    const { data: settings, error: settingsError } = await serviceRoleClient
      .from('settings')
      .select('value')
      .eq('key', 'watermark')
      .single()

    if (settingsError) {
      debug.error('Settings fetch error:', settingsError)
      // 設定が見つからない場合はデフォルト値を使用
      debug.log('Using default watermark settings')
    }

    const watermarkSettings = settings?.value || {
      opacity: 0.25,
      fontSize: 11,  // デフォルトは11px
      color: '#FFFFFF' // デフォルトは白
    }

    debug.log('Watermark settings:', watermarkSettings)

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
    debug.log('Downloading image from storage...')
    const { data: imageFile, error: storageError } = await serviceRoleClient
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
      text: profile.code,
      opacity: watermarkSettings.opacity,
      fontSize: watermarkSettings.fontSize,
      color: watermarkSettings.color
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