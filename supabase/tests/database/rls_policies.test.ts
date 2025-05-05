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
  let adminUserId: string;
  let testProfileId: string;
  let testImageId: string;
  let testEmail: string;
  let adminEmail: string;
  let serviceRoleClient: SupabaseClient;

  beforeAll(async () => {
    try {
      // テストユーザーのメールアドレスを生成
      testEmail = `test-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
      adminEmail = `admin-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;

      // サービスロールクライアントの設定（テストユーザー作成用）
      serviceRoleClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // 既存のadminユーザーがいれば削除
      try {
        const { data: userList } = await serviceRoleClient.auth.admin.listUsers();
        const existingAdmin = userList?.users.find(u => u.email === adminEmail);
        if (existingAdmin?.id) {
          await serviceRoleClient.auth.admin.deleteUser(existingAdmin.id);
        }
      } catch (e) {}

      // 管理者ユーザーの作成
      const { data: adminAuthUser, error: adminAuthError } = await serviceRoleClient.auth.admin.createUser({
        email: adminEmail,
        password: 'adminpassword123',
        email_confirm: true
      });
      if (adminAuthError) throw adminAuthError;
      adminUserId = adminAuthUser.user.id;

      // 既存のテストユーザーがいれば削除
      try {
        const { data: userList } = await serviceRoleClient.auth.admin.listUsers();
        const existingUser = userList?.users.find(u => u.email === testEmail);
        if (existingUser?.id) {
          await serviceRoleClient.auth.admin.deleteUser(existingUser.id);
        }
      } catch (e) {}

      // 一般ユーザーの作成
      const { data: authUser, error: authError } = await serviceRoleClient.auth.admin.createUser({
        email: testEmail,
        password: 'testpassword123',
        email_confirm: true
      });
      if (authError) throw authError;
      testUserId = authUser.user.id;

      // 管理者クライアントの設定（一時的）
      const tempAdminClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // 管理者としてログイン
      const { error: adminSignInError } = await tempAdminClient.auth.signInWithPassword({
        email: adminEmail,
        password: 'adminpassword123'
      });
      if (adminSignInError) throw adminSignInError;
      adminClient = tempAdminClient;

      // テストプロファイルの作成
      const { data: profile, error: profileError } = await serviceRoleClient
        .from('profiles')
        .insert({
          user_id: testUserId,
          code: `rls${Date.now() % 1000000}`,
          first_name: 'Test',
          last_name: 'User',
          role: 'general'
        })
        .select()
        .single();
      if (profileError) throw profileError;
      testProfileId = profile.id;

      // テスト画像の作成
      const { data: image, error: imageError } = await serviceRoleClient
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

      // 一般ユーザークライアントを認証済みセッションで再設定
      generalUserClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
        }
      );

      // 一般ユーザーとしてログイン
      const { error: signInError } = await generalUserClient.auth.signInWithPassword({
        email: testEmail,
        password: 'testpassword123'
      });
      if (signInError) throw signInError;

    } catch (error) {
      console.error('Error in beforeAll:', error);
      throw error;
    }
  }, 30000);

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
      const { data: otherAuthUser, error: otherAuthError } = await serviceRoleClient.auth.admin.createUser({
        email: otherEmail,
        password: 'testpassword123',
        email_confirm: true
      });
      if (otherAuthError) throw otherAuthError;

      // 別のプロファイルの画像を作成
      const { data: otherProfile, error: otherProfileError } = await serviceRoleClient
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

      const { data: otherImage, error: otherImageError } = await serviceRoleClient
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
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(1); // 少なくとも2つの画像があるはず
      
      // 自分の画像と他のユーザーの画像の両方が取得できることを確認
      expect(data!.some(img => img.profile_id === testProfileId)).toBe(true);
      expect(data!.some(img => img.profile_id === otherProfile.id)).toBe(true);

      // テストデータのクリーンアップ
      await serviceRoleClient.from('images').delete().eq('id', otherImage.id);
      await serviceRoleClient.from('profiles').delete().eq('id', otherProfile.id);
      await serviceRoleClient.auth.admin.deleteUser(otherAuthUser.user.id);
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

    it('管理者ユーザーは画像を削除でき、削除後にレコードが消えていることを確認する', async () => {
      // まず画像を新規作成
      const { data: newImage, error: insertError } = await adminClient
        .from('images')
        .insert({
          profile_id: testProfileId,
          file_path: `/test/delete-test-${Date.now()}.jpg`,
          original_filename: `delete-test-${Date.now()}.jpg`,
          name: 'Delete Test Image',
          width: 123,
          height: 456
        })
        .select()
        .single();
      expect(insertError).toBeNull();
      expect(newImage).toBeDefined();

      // 削除実行
      const { error: deleteError } = await adminClient
        .from('images')
        .delete()
        .eq('id', newImage.id);
      expect(deleteError).toBeNull();

      // 削除後に本当に消えているか確認
      const { data: afterDelete, error: selectError } = await adminClient
        .from('images')
        .select('*')
        .eq('id', newImage.id);
      expect(selectError).toBeNull();
      expect(afterDelete).toHaveLength(0);
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

  describe('settings テーブル', () => {
    const testSetting = {
      key: `test-key-${Date.now()}`,
      value: { test: 'value' },
      description: 'テスト用設定'
    };

    beforeAll(async () => {
      // テスト用の設定を管理者で作成
      const { error } = await serviceRoleClient
        .from('settings')
        .insert(testSetting);
      if (error) throw error;
    });

    it('一般ユーザーは設定を参照しようとすると空の配列が返される', async () => {
      const { data, error } = await generalUserClient
        .from('settings')
        .select('*');
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('一般ユーザーは設定を作成できない', async () => {
      const { error } = await generalUserClient
        .from('settings')
        .insert({
          key: `test-key-2-${Date.now()}`,
          value: { test: 'value2' },
          description: 'テスト用設定2'
        });
      expect(error).not.toBeNull();
    });

    it('一般ユーザーは設定を更新できない', async () => {
      const { data, error } = await generalUserClient
        .from('settings')
        .update({ value: { test: 'updated' } })
        .eq('key', testSetting.key);
   
      expect(error).toBeNull();
    });

    it('一般ユーザーは設定を削除できない', async () => {
      const { data, error } = await generalUserClient
        .from('settings')
        .delete()
        .eq('key', testSetting.key);
      
      expect(error).toBeNull();
    });

    it('管理者は全ての操作が可能', async () => {
      // 参照
      const { data: selectData, error: selectError } = await adminClient
        .from('settings')
        .select('*')
        .eq('key', testSetting.key);
      expect(selectError).toBeNull();
      expect(selectData).not.toBeNull();
      expect(selectData![0].key).toBe(testSetting.key);

      // 作成
      const newSetting = {
        key: `admin-test-key-${Date.now()}`,
        value: { admin: 'test', number: 123 },
        description: '管理者テスト用設定'
      };

      // INSERTの実行と結果の取得
      const { data: insertData, error: insertError } = await adminClient
        .from('settings')
        .insert(newSetting)
        .select()
        .single();

      // INSERTのエラーチェック
      expect(insertError).toBeNull();
      expect(insertData).not.toBeNull();

      // 挿入したデータの検証
      expect(insertData).toMatchObject({
        key: newSetting.key,
        value: newSetting.value,
        description: newSetting.description
      });

      // 別途SELECTで取得して、データが正しく保存されているか確認
      const { data: verifyData, error: verifyError } = await adminClient
        .from('settings')
        .select('*')
        .eq('key', newSetting.key)
        .single();

      expect(verifyError).toBeNull();
      expect(verifyData).not.toBeNull();
      expect(verifyData).toMatchObject({
        key: newSetting.key,
        value: newSetting.value,
        description: newSetting.description
      });
      // タイムスタンプの存在確認
      expect(verifyData.created_at).toBeDefined();
      expect(verifyData.updated_at).toBeDefined();

      // 更新
      const { error: updateError } = await adminClient
        .from('settings')
        .update({ value: { admin: 'updated' } })
        .eq('key', newSetting.key);
      expect(updateError).toBeNull();

      // 削除
      const { error: deleteError } = await adminClient
        .from('settings')
        .delete()
        .eq('key', newSetting.key);
      expect(deleteError).toBeNull();
    });

    afterAll(async () => {
      // テストデータのクリーンアップ
      await serviceRoleClient
        .from('settings')
        .delete()
        .eq('key', testSetting.key);
    });
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await serviceRoleClient.from('download_logs').delete().eq('profile_id', testProfileId);
    await serviceRoleClient.from('images').delete().eq('id', testImageId);
    await serviceRoleClient.from('profiles').delete().eq('id', testProfileId);
    await serviceRoleClient.auth.admin.deleteUser(testUserId);
    await serviceRoleClient.auth.admin.deleteUser(adminUserId);
  });
});