import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { 
  initSupabaseClient, 
  verifyAdminAccess, 
  createErrorResponse, 
  createSuccessResponse 
} from "../_shared/utils.ts";

// データベースのバックアップを取得して保存する関数
async function backupAndUploadDatabase(supabaseClient: any, schema_name: string = 'public') {
  // dump_database()関数を実行してバックアップを取得
  const { data: backupData, error: backupError } = await supabaseClient
    .rpc('dump_database', {
      schema_name: schema_name,
      include_data: true
    });

  if (backupError) {
    throw new Error(`バックアップの取得に失敗しました: ${backupError.message}`);
  }

  // ファイル名を生成（タイムスタンプを含む）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}-${schema_name}.sql`;

  // バケットにファイルをアップロード
  const { data: uploadData, error: uploadError } = await supabaseClient
    .storage
    .from('db-backups')
    .upload(fileName, backupData, {
      contentType: 'text/plain',
      cacheControl: '3600'
    });

  if (uploadError) {
    throw new Error(`ファイルのアップロードに失敗しました: ${uploadError.message}`);
  }

  return { fileName, uploadData, backupData };
}

serve(async (req) => {
  // CORSヘッダーのハンドリング
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Supabaseクライアントの初期化
    const supabaseClient = initSupabaseClient();

    // 管理者権限の確認
    try {
      await verifyAdminAccess(supabaseClient, req.headers.get('Authorization'));
    } catch (error) {
      return createErrorResponse(
        error.message,
        error.message === '認証トークンが必要です' ? 'AUTH_REQUIRED' :
        error.message === '無効なトークンです' ? 'INVALID_TOKEN' :
        error.message === '管理者権限が必要です' ? 'ADMIN_REQUIRED' :
        'UNKNOWN_ERROR',
        error.message === '認証トークンが必要です' || error.message === '無効なトークンです' ? 401 : 403
      );
    }

    // バックアップの実行
    const results = await Promise.all([
      backupAndUploadDatabase(supabaseClient, 'public'),
      backupAndUploadDatabase(supabaseClient, 'auth')
    ]);

    // レスポンスを返す
    return createSuccessResponse({
      message: "バックアップが正常に保存されました",
      files: results.map(result => ({
        fileName: result.fileName,
        fileData: result.uploadData,
        backupSize: result.backupData.length
      }))
    });

  } catch (error) {
    console.error("バックアップ処理エラー:", error);
    return createErrorResponse(
      error.message,
      'BACKUP_ERROR',
      500
    );
  }
}); 