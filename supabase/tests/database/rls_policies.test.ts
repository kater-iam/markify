const { createClient } = require('@supabase/supabase-js');
const { expect } = require('chai');
const { describe, it, before, after } = require('mocha');
const dotenv = require('dotenv');

dotenv.config();

describe('RLS Policies Tests', function() {
  let adminClient;
  let generalUserClient;
  let testUserId;
  let testProfileId;
  let testImageId;

  before(async () => {
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

    // テスト画像の作成
    const { data: image, error: imageError } = await adminClient
      .from('images')
      .insert({
        profile_id: testProfileId,
        file_path: '/test/image.jpg',
        width: 100,
        height: 100
      })
      .select()
      .single();
    if (imageError) throw imageError;
    testImageId = image.id;

    // 一般ユーザーとしてログイン
    const { error: signInError } = await generalUserClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    if (signInError) throw signInError;
  });

  describe('profiles テーブルのRLSテスト', () => {
    it('一般ユーザーは全てのプロファイルを参照できる', async () => {
      const { data, error } = await generalUserClient
        .from('profiles')
        .select('*');
      expect(error).to.be.null;
      expect(data).to.not.be.null;
      expect(data!.length).to.be.greaterThan(0);
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
      expect(error).to.not.be.null;
    });

    it('一般ユーザーは自身のプロファイルの特定フィールドのみ更新できる', async () => {
      // first_nameとlast_nameの更新は許可される
      const { error: updateError } = await generalUserClient
        .from('profiles')
        .update({ first_name: 'Updated', last_name: 'User' })
        .eq('id', testProfileId);
      expect(updateError).to.be.null;

      // codeの更新は許可されない
      const { error: codeUpdateError } = await generalUserClient
        .from('profiles')
        .update({ code: 'test003' })
        .eq('id', testProfileId);
      expect(codeUpdateError).to.not.be.null;
    });
  });

  describe('images テーブルのRLSテスト', () => {
    it('一般ユーザーは自身の画像のみ参照できる', async () => {
      const { data, error } = await generalUserClient
        .from('images')
        .select('*');
      expect(error).to.be.null;
      expect(data).to.not.be.null;
      expect(data!.every(img => img.profile_id === testProfileId)).to.be.true;
    });

    it('一般ユーザーは画像を作成できない', async () => {
      const { error } = await generalUserClient
        .from('images')
        .insert({
          profile_id: testProfileId,
          file_path: '/test/image2.jpg',
          width: 200,
          height: 200
        });
      expect(error).to.not.be.null;
    });
  });

  describe('download_logs テーブルのRLSテスト', () => {
    it('一般ユーザーはダウンロードログを参照できない', async () => {
      const { data, error } = await generalUserClient
        .from('download_logs')
        .select('*');
      expect(error).to.not.be.null;
      expect(data).to.be.null;
    });

    it('一般ユーザーは自身のダウンロードログを作成できる', async () => {
      const { error } = await generalUserClient
        .from('download_logs')
        .insert({
          profile_id: testProfileId,
          image_id: testImageId,
          client_ip: '127.0.0.1'
        });
      expect(error).to.be.null;
    });
  });

  after(async () => {
    // テストデータのクリーンアップ
    await adminClient.from('download_logs').delete().eq('profile_id', testProfileId);
    await adminClient.from('images').delete().eq('id', testImageId);
    await adminClient.from('profiles').delete().eq('id', testProfileId);
    await adminClient.auth.admin.deleteUser(testUserId);
  });
}); 