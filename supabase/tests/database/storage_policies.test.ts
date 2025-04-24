import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'node:buffer';

// 環境変数の設定
process.env.SUPABASE_URL = 'http://127.0.0.1:54411';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

dotenv.config();

describe('Storage Policies Tests', () => {
  let adminClient: SupabaseClient;
  let generalUserClient: SupabaseClient;
  let testUserId: string;
  let testProfileId: string;
  let testImagePath: string;
  let testImageBuffer: Buffer;
  let testEmail: string;

  beforeAll(async () => {
    // テスト用の画像を作成
    const testDir = path.join(__dirname, '../test_data');
    testImagePath = path.join(testDir, 'test.png');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // 1x1の透明なPNG画像を作成
    testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, testImageBuffer);

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

    // 一般ユーザーとしてログイン
    const { error: signInError } = await generalUserClient.auth.signInWithPassword({
      email: testEmail,
      password: 'testpassword123'
    });
    if (signInError) throw signInError;
  });

  describe('original_images バケットのテスト', () => {
    it('一般ユーザーはオリジナル画像をアップロードできない', async () => {
      const { error } = await generalUserClient.storage
        .from('original_images')
        .upload('test.png', testImageBuffer, {
          contentType: 'image/png'
        });
      expect(error).not.toBeNull();
    });

    it('一般ユーザーはオリジナル画像を閲覧できない', async () => {
      // 管理者として画像をアップロード
      await adminClient.storage
        .from('original_images')
        .upload('test.png', testImageBuffer, {
          contentType: 'image/png'
        });

      // 一般ユーザーとして閲覧を試みる
      const { error } = await generalUserClient.storage
        .from('original_images')
        .download('test.png');
      expect(error).not.toBeNull();

      // クリーンアップ
      await adminClient.storage
        .from('original_images')
        .remove(['test.png']);
    });

    it('管理者はオリジナル画像をアップロードと閲覧ができる', async () => {
      // アップロード
      const { error: uploadError } = await adminClient.storage
        .from('original_images')
        .upload('test.png', testImageBuffer, {
          contentType: 'image/png'
        });
      expect(uploadError).toBeNull();

      // 閲覧
      const { error: downloadError } = await adminClient.storage
        .from('original_images')
        .download('test.png');
      expect(downloadError).toBeNull();

      // クリーンアップ
      await adminClient.storage
        .from('original_images')
        .remove(['test.png']);
    });
  });

  describe('watermarked_images バケットのテスト', () => {
    it('一般ユーザーはウォーターマーク画像をアップロードできない', async () => {
      const { error } = await generalUserClient.storage
        .from('watermarked_images')
        .upload('test.png', testImageBuffer, {
          contentType: 'image/png'
        });
      expect(error).not.toBeNull();
    });

    it('一般ユーザーは自身のウォーターマーク画像を閲覧できる', async () => {
      // 管理者として画像をアップロード（実際のシステムではEdge Functionが行う）
      await adminClient.storage
        .from('watermarked_images')
        .upload(`${testUserId}/test.png`, testImageBuffer, {
          contentType: 'image/png'
        });

      // 一般ユーザーとして閲覧
      const { error } = await generalUserClient.storage
        .from('watermarked_images')
        .download(`${testUserId}/test.png`);
      expect(error).toBeNull();

      // クリーンアップ
      await adminClient.storage
        .from('watermarked_images')
        .remove([`${testUserId}/test.png`]);
    });

    it('管理者は全てのウォーターマーク画像を操作できる', async () => {
      // アップロード
      const { error: uploadError } = await adminClient.storage
        .from('watermarked_images')
        .upload('test.png', testImageBuffer, {
          contentType: 'image/png'
        });
      expect(uploadError).toBeNull();

      // 閲覧
      const { error: downloadError } = await adminClient.storage
        .from('watermarked_images')
        .download('test.png');
      expect(downloadError).toBeNull();

      // クリーンアップ
      await adminClient.storage
        .from('watermarked_images')
        .remove(['test.png']);
    });
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await adminClient.from('profiles').delete().eq('id', testProfileId);
    await adminClient.auth.admin.deleteUser(testUserId);
    
    // テスト用画像の削除
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    const testDir = path.dirname(testImagePath);
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });
}); 