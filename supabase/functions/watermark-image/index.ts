import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processImage } from '../_shared/image-processing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS用のプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // リクエストボディの取得
    const { imageId } = await req.json()

    if (!imageId) {
      throw new Error('画像IDが指定されていません')
    }

    // Supabaseクライアントの初期化
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 認証情報の取得
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('認証情報が必要です')
    }

    // オリジナル画像の取得
    const { data: imageData, error: downloadError } = await supabaseClient
      .storage
      .from('images')
      .download(imageId)

    if (downloadError) {
      throw new Error('画像の取得に失敗しました')
    }

    // 画像の処理
    const processedImageBuffer = await processImage(await imageData.arrayBuffer())

    // 処理済み画像のアップロード
    const watermarkedFileName = `watermarked_${imageId}`
    const { error: uploadError } = await supabaseClient
      .storage
      .from('processed-images')
      .upload(watermarkedFileName, processedImageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      throw new Error('処理済み画像のアップロードに失敗しました')
    }

    // 公開URLの取得
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('processed-images')
      .getPublicUrl(watermarkedFileName)

    return new Response(
      JSON.stringify({ url: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 