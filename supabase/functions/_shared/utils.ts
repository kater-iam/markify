import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

// 標準化されたエラーレスポンスを生成する関数
export function createErrorResponse(error: string, code: string, status: number = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      code,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

// 標準化された成功レスポンスを生成する関数
export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

// Supabaseクライアントを初期化する関数
export function initSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Required environment variables are not set');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    }
  });
}

// 管理者権限を確認する関数
export async function verifyAdminAccess(supabaseClient: any, authHeader: string | null) {
  if (!authHeader) {
    throw new Error('認証トークンが必要です');
  }

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (userError || !user) {
    throw new Error('無効なトークンです');
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('管理者権限が必要です');
  }

  return user;
}

// 環境変数を取得する関数
export function getRequiredEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
} 