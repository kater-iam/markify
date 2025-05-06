import { useState, useEffect } from 'react';
import { supabaseClient } from '../';

/**
 * ユーザーロールの情報を格納するインターフェース
 * @interface UserRole
 * @property {boolean} isAdmin - ユーザーが管理者権限を持っているかどうか
 * @property {boolean} isLoading - ロール情報の取得中かどうか
 * @property {Error | null} error - エラーが発生した場合のエラー情報
 */
interface UserRole {
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * ユーザーのロール情報を取得・監視するカスタムフック
 * 
 * @description
 * - Supabaseの認証情報を使用してユーザーのロールを取得
 * - profilesテーブルのroleカラムを参照して管理者権限を判定
 * - 認証状態の変更を監視し、自動的にロール情報を更新
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { isAdmin, isLoading, error } = useUserRole();
 * 
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 * 
 *   return (
 *     <div>
 *       {isAdmin ? "管理者です" : "一般ユーザーです"}
 *     </div>
 *   );
 * };
 * ```
 * 
 * @returns {UserRole} ユーザーのロール情報
 */
export const useUserRole = (): UserRole => {
  // 管理者権限の状態
  const [isAdmin, setIsAdmin] = useState(false);
  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  // エラー状態
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /**
     * ユーザーのロール情報を確認する非同期関数
     * Supabaseからセッション情報を取得し、profilesテーブルでロールを確認
     */
    const checkUserRole = async () => {
      try {
        // セッション情報の取得
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // セッションが存在しない場合は非管理者として扱う
        if (!session?.user?.id) {
          setIsAdmin(false);
          return;
        }

        // profilesテーブルからユーザーのロール情報を取得
        const { data: profile, error } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          throw error;
        }

        // roleが'admin'の場合のみ管理者として扱う
        setIsAdmin(profile?.role === 'admin');
      } catch (err) {
        setError(err instanceof Error ? err : new Error('ユーザーロールの取得に失敗しました'));
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    // 初回のロール確認を実行
    checkUserRole();

    // Supabaseの認証状態変更を監視
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(() => {
      checkUserRole();
    });

    // クリーンアップ関数：監視を解除
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading, error };
}; 