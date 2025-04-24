import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

describe('Storage Policies Tests', () => {
  let adminClient: SupabaseClient;
  let generalUserClient: SupabaseClient;
  let testUserId: string;
  let testProfileId: string;
  let testImagePath: string;

  before(async () => {
    // テスト用の画像を作成
    const testDir = path.join(__dirname, '../test_data');
    testImagePath = path.join(testDir, 'test.png');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // 1x1の透明なPNG画像を作成
    const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, transparentPixel);

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
      email: 'test@example.com',
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
        code: 'test001',
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
      email: 'test@example.com',
      password: 'testpassword123'
    });
    if (signInError) throw signInError;
  });

  describe('original_images バケットのテスト', () => {
    it('一般ユーザーはオリジナル画像をアップロードできない', async () => {
      const { error } = await generalUserClient.storage
        .from('original_images')
        .upload('test.png', fs.readFileSync(testImagePath));
      expect(error).to.not.be.null;
    });

    it('一般ユーザーはオリジナル画像を閲覧できない', async () => {
      // 管理者として画像をアップロード
      await adminClient.storage
        .from('original_images')
        .upload('test.png', fs.readFileSync(testImagePath));

      // 一般ユーザーとして閲覧を試みる
      const { error } = await generalUserClient.storage
        .from('original_images')
        .download('test.png');
      expect(error).to.not.be.null;

      // クリーンアップ
      await adminClient.storage
        .from('original_images')
        .remove(['test.png']);
    });

    it('管理者はオリジナル画像をアップロードと閲覧ができる', async () => {
      // アップロード
      const { error: uploadError } = await adminClient.storage
        .from('original_images')
        .upload('test.png', fs.readFileSync(testImagePath));
      expect(uploadError).to.be.null;

      // 閲覧
      const { error: downloadError } = await adminClient.storage
        .from('original_images')
        .download('test.png');
      expect(downloadError).to.be.null;

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
        .upload('test.png', fs.readFileSync(testImagePath));
      expect(error).to.not.be.null;
    });

    it('一般ユーザーは自身のウォーターマーク画像を閲覧できる', async () => {
      // 管理者として画像をアップロード（実際のシステムではEdge Functionが行う）
      await adminClient.storage
        .from('watermarked_images')
        .upload(`${testProfileId}/test.png`, fs.readFileSync(testImagePath));

      // 一般ユーザーとして閲覧
      const { error } = await generalUserClient.storage
        .from('watermarked_images')
        .download(`${testProfileId}/test.png`);
      expect(error).to.be.null;

      // クリーンアップ
      await adminClient.storage
        .from('watermarked_images')
        .remove([`${testProfileId}/test.png`]);
    });

    it('管理者は全てのウォーターマーク画像を操作できる', async () => {
      // アップロード
      const { error: uploadError } = await adminClient.storage
        .from('watermarked_images')
        .upload('test.png', fs.readFileSync(testImagePath));
      expect(uploadError).to.be.null;

      // 閲覧
      const { error: downloadError } = await adminClient.storage
        .from('watermarked_images')
        .download('test.png');
      expect(downloadError).to.be.null;

      // クリーンアップ
      await adminClient.storage
        .from('watermarked_images')
        .remove(['test.png']);
    });
  });

  after(async () => {
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