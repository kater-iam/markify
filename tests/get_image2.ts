import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54411';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function main(jwt: string) {
  console.log('Received JWT:', jwt);

  // Supabaseクライアントの作成
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // ユーザー認証
    // const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    //   email: 'user1@kater.jp',
    //   password: 'password123'
    // });

    // if (authError) {
    //   throw authError;
    // }

    // console.log('認証成功:', authData.user?.email);

    // 画像の取得
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('*')
      .eq('id', '0287da2f-4058-891c-787e-7d68a7346ee8')
      .single();

    if (imageError) {
      throw imageError;
    }

    if (!imageData) {
      console.log('画像が見つかりませんでした');
      return;
    }

    console.log('取得した画像データ:', imageData);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// JWTを引数として渡して実行
if (process.argv.length < 3) {
  console.error('使用方法: ts-node get_image2.ts <JWT>');
  process.exit(1);
}

main(process.argv[2]);
