import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// 既存 import の下に追加
import { createCanvas, loadImage } from 'https://deno.land/x/canvas@v1.4.2/mod.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

import { processImage } from '../_shared/image-processing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // const supabaseUrl = 'http://kong:8000'
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
          headers: { Authorization: 'Bearer ' + req.headers.get('Authorization') || '' },
        },
      }
    )

    // ユーザー認証の確認
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    // const { data: user, error: authError } = await supabaseClient.auth.signInWithPassword({
    //   email: 'user1@kater.jp',
    //   password: 'password123'
    // });


    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', user)

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
    console.log('Fetching image file from storage...')
    const { data: imageFile, error: storageError } = await supabaseClient
      .storage
      .from('images')
      .download(imageData.file_path)

    if (storageError) {
      console.error('Storage error:', storageError)
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
    const processedImage = await processImage(arrayBuffer, {
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