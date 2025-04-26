import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';

// 環境変数の設定
process.env.SUPABASE_URL = 'http://127.0.0.1:54411';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

describe('RLS Policies Tests', () => {
  let adminClient: SupabaseClient;
  let generalUserClient: SupabaseClient;
  let testUserId: string;
  let testProfileId: string;
  let testImageId: string;
  let testEmail: string;

  beforeAll(async () => {
    // テストユーザーのメールアドレスを生成
    testEmail = `test-${Date.now()}@example.com`;

    // 管理者クライアントの設定
    adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 一般ユーザークライアントの設定
    generalUserClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // テストユーザーの作成
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true
    });
    if (authError) throw authError;
    testUserId = authUser.user.id;

    // テストプロファイルの作成
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: testUserId,
        code: `test${Date.now()}`,
        first_name: 'Test',
        last_name: 'User',
        role: 'general'
      })
      .select()
      .single();
    if (profileError) throw profileError;
    testProfileId = profile.id;

    // テスト画像の作成
    const { data: image, error: imageError } = await adminClient
      .from('images')
      .insert({
        profile_id: testProfileId,
        file_path: '/test/image.jpg',
        original_filename: 'image.jpg',
        name: 'Test Image',
        width: 100,
        height: 100
      })
      .select()
      .single();
    if (imageError) throw imageError;
    testImageId = image.id;

    // 一般ユーザーとしてログイン
    const { error: signInError } = await generalUserClient.auth.signInWithPassword({
      email: testEmail,
      password: 'testpassword123'
    });
    if (signInError) throw signInError;
  });

  describe('profiles テーブル', () => {
    it('一般ユーザーは全てのプロファイルを参照できる', async () => {
      const { data, error } = await generalUserClient
        .from('profiles')
        .select('*');
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('一般ユーザーは新規プロファイルを作成できない', async () => {
      const { error } = await generalUserClient
        .from('profiles')
        .insert({
          user_id: testUserId,
          code: 'test002',
          first_name: 'Test2',
          last_name: 'User2',
          role: 'general'
        });
      expect(error).not.toBeNull();
    });

    it('一般ユーザーは自身のプロファイルの特定フィールドのみ更新できる', async () => {
      // first_nameとlast_nameの更新は許可される
      const { error: updateError } = await generalUserClient
        .from('profiles')
        .update({ first_name: 'Updated', last_name: 'User' })
        .eq('id', testProfileId);
      expect(updateError).toBeNull();

      // codeの更新は許可されない
      const { error: codeUpdateError } = await generalUserClient
        .from('profiles')
        .update({ code: 'test003' })
        .eq('id', testProfileId);
      expect(codeUpdateError).not.toBeNull();
    });
  });

  describe('images テーブル', () => {
    it('一般ユーザーは全ての画像を参照できる', async () => {
      // 別のユーザーを作成
      const otherEmail = `other-test-${Date.now()}@example.com`;
      const { data: otherAuthUser, error: otherAuthError } = await adminClient.auth.admin.createUser({
        email: otherEmail,
        password: 'testpassword123',
        email_confirm: true
      });
      if (otherAuthError) throw otherAuthError;

      // 別のプロファイルの画像を作成
      const { data: otherProfile, error: otherProfileError } = await adminClient
        .from('profiles')
        .insert({
          user_id: otherAuthUser.user.id,
          code: `other${Date.now()}`,
          first_name: 'Other',
          last_name: 'User',
          role: 'general'
        })
        .select()
        .single();
      if (otherProfileError) throw otherProfileError;

      const { data: otherImage, error: otherImageError } = await adminClient
        .from('images')
        .insert({
          profile_id: otherProfile.id,
          file_path: '/test/other-image.jpg',
          original_filename: 'other-image.jpg',
          name: 'Other Image',
          width: 200,
          height: 200
        })
        .select()
        .single();
      if (otherImageError) throw otherImageError;

      // 一般ユーザーで全ての画像を取得
      const { data, error } = await generalUserClient
        .from('images')
        .select('*');
      
      console.log('Retrieved images:', data); // デバッグ用のログ
      console.log('Test profile ID:', testProfileId); // デバッグ用のログ
      console.log('Other profile ID:', otherProfile.id); // デバッグ用のログ
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(1); // 少なくとも2つの画像があるはず
      
      // 自分の画像と他のユーザーの画像の両方が取得できることを確認
      expect(data!.some(img => img.profile_id === testProfileId)).toBe(true);
      expect(data!.some(img => img.profile_id === otherProfile.id)).toBe(true);

      // テストデータのクリーンアップ
      await adminClient.from('images').delete().eq('id', otherImage.id);
      await adminClient.from('profiles').delete().eq('id', otherProfile.id);
      await adminClient.auth.admin.deleteUser(otherAuthUser.user.id);
    });

    it('一般ユーザーは画像を作成できない', async () => {
      const { error } = await generalUserClient
        .from('images')
        .insert({
          profile_id: testProfileId,
          file_path: '/test/image2.jpg',
          original_filename: 'image2.jpg',
          name: 'Test Image 2',
          width: 200,
          height: 200
        });
      expect(error).not.toBeNull();
    });
  });

  describe('download_logs テーブル', () => {
    it('一般ユーザーはダウンロードログを参照できない', async () => {
      const { data, error } = await generalUserClient
        .from('download_logs')
        .select('*');
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('一般ユーザーは自身のダウンロードログを作成できる', async () => {
      const { error } = await generalUserClient
        .from('download_logs')
        .insert({
          profile_id: testProfileId,
          image_id: testImageId,
          client_ip: '127.0.0.1'
        });
      expect(error).toBeNull();
    });
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await adminClient.from('download_logs').delete().eq('profile_id', testProfileId);
    await adminClient.from('images').delete().eq('id', testImageId);
    await adminClient.from('profiles').delete().eq('id', testProfileId);
    await adminClient.auth.admin.deleteUser(testUserId);
  });
});