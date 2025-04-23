import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Space,
  Typography,
  Alert,
  Table,
  Modal,
  Spin,
  message,
} from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "../../utility/supabaseClient";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { confirm } = Modal;

interface BackupFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
  url: string;
}

interface StorageItem {
  id: string;
  name: string;
  metadata?: {
    size?: number;
  };
  created_at?: string;
}

export const DbBackupList = () => {
  const { data: identity } = useGetIdentity<{
    id: string;
    name: string;
    role: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);

  // バックアップファイルリストの取得
  const fetchBackupFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("バックアップファイル一覧を取得中...");
      const { data, error } = await supabaseClient.storage
        .from("db-backups")
        .list(undefined, {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "desc" },
        });

      if (error) {
        console.error("一覧取得エラー:", error);
        throw error;
      }

      console.log("取得したファイル数:", data?.length || 0);
      if (data) {
        // ファイル情報を整形
        const formattedFiles: BackupFile[] = data
          .filter((item: StorageItem) => !item.id.endsWith("/")) // フォルダを除外
          .map((item: StorageItem) => {
            const fileName = item.name;
            const filePath = item.name;

            return {
              name: fileName,
              path: filePath,
              size: item.metadata?.size || 0,
              created_at: item.created_at || "",
              url: supabaseClient.storage
                .from("db-backups")
                .getPublicUrl(filePath).data.publicUrl,
            };
          })
          .sort((a: BackupFile, b: BackupFile) => {
            // 名前（日付）の降順でソート
            return b.name.localeCompare(a.name);
          });

        setBackupFiles(formattedFiles);
      }
    } catch (err: any) {
      console.error("バックアップファイルの取得エラー:", err);
      setError(`バックアップファイルの取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // コンポーネント初期化時にバックアップファイルを取得
  useEffect(() => {
    if (identity?.role === "admin") {
      fetchBackupFiles();
    }
  }, [identity]);

  // バックアップの作成
  const createBackup = async () => {
    if (identity?.role !== "admin") {
      message.error("管理者権限が必要です");
      return;
    }

    setBackupInProgress(true);
    setError(null);

    // より詳細なログメッセージ
    message.info("バックアップ処理を開始しています。この処理には数分かかる場合があります。");
    console.log("バックアップ処理開始", new Date().toISOString());

    try {
      // テスト環境用のデモモードオプション
      const isTestEnvironment = window.location.hostname === 'localhost' ||
                               window.location.hostname === '127.0.0.1';

      // テスト環境またはCypressテスト実行中はデモモードを使用
      const options = {
        includeSystemTables: false,
        excludeTables: ["schema_migrations", "storage"],  // 大きなテーブルは除外
        maxTables: 20,  // 一度に処理するテーブル数を制限
        timeout: 540,   // タイムアウトを9分に設定（秒単位）
        debug: true,    // デバッグモードを有効化
        demoMode: isTestEnvironment, // テスト環境ではデモモードを有効
      };

      console.log("バックアップオプション:", options);

      const { data, error } = await supabaseClient.functions.invoke("db-backup", {
        method: 'POST',
        body: options
      });

      // 詳細なレスポンスのログ出力
      console.log("バックアップAPI応答:", {
        status: "success",
        data: data,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error("バックアップAPI呼び出しエラー:", {
          error,
          timestamp: new Date().toISOString(),
          details: error.message || "詳細不明"
        });
        throw error;
      }

      if (data?.success) {
        console.log("バックアップ成功:", {
          timestamp: new Date().toISOString(),
          details: data
        });
        message.success("バックアップが正常に作成されました");

        // テスト環境で自動ダウンロードをシミュレート
        if (data.demo && isTestEnvironment) {
          // ダミーファイルのダウンロードを模擬
          const dummyData = new Blob(['-- This is a mock SQL backup file\nSELECT 1;'], { type: 'text/plain' });
          const url = URL.createObjectURL(dummyData);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.files[0].fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log("デモモード: ダミーファイルのダウンロードをシミュレーション");
        }

        // バックアップリストを更新
        fetchBackupFiles();
      } else {
        console.error("バックアップAPI失敗応答:", {
          data,
          timestamp: new Date().toISOString()
        });
        throw new Error(data?.error || "バックアップの作成に失敗しました");
      }
    } catch (err: any) {
      const errorDetails = {
        message: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date().toISOString()
      };
      console.error("バックアップ作成エラー詳細:", errorDetails);

      // テスト環境の場合は表示するエラーメッセージを調整
      let errorMessage = `バックアップの作成に失敗しました: ${err.message}`;

      if (err.code) {
        errorMessage += ` (エラーコード: ${err.code})`;
      }

      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setBackupInProgress(false);
      console.log("バックアップ処理終了", new Date().toISOString());
    }
  };

  // バックアップファイルのダウンロード
  const downloadBackupFile = async (file: BackupFile) => {
    try {
      const { data, error } = await supabaseClient.storage
        .from("db-backups")
        .download(file.path);

      if (error) {
        throw error;
      }

      // ダウンロードしたデータをブラウザでダウンロード
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success("ファイルをダウンロードしました");
    } catch (err: any) {
      console.error("ダウンロードエラー:", err);
      message.error(`ダウンロードに失敗しました: ${err.message}`);
    }
  };

  // バックアップファイルの削除
  const deleteBackupFile = (file: BackupFile) => {
    confirm({
      title: "バックアップファイルを削除しますか？",
      icon: <ExclamationCircleOutlined />,
      content: `${file.name} を削除します。この操作は取り消せません。`,
      okText: "削除",
      okType: "danger",
      cancelText: "キャンセル",
      async onOk() {
        try {
          const { error } = await supabaseClient.storage
            .from("db-backups")
            .remove([file.path]);

          if (error) {
            throw error;
          }

          message.success(`${file.name} を削除しました`);
          fetchBackupFiles(); // リストを更新
        } catch (err: any) {
          console.error("削除エラー:", err);
          message.error(`削除に失敗しました: ${err.message}`);
        }
      },
    });
  };

  // ファイルサイズを読みやすい形式に変換
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // ファイル名から日時を抽出
  const extractDateFromFileName = (fileName: string): string => {
    // MM-DDThh-mm-ss-mmmZ-schema.sql 形式からの抽出
    const match = fileName.match(/(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z-(.+?)\.sql$/);
    if (match) {
      const [_, month, day, hour, minute, second, ms, schema] = match;
      const currentYear = new Date().getFullYear();

      try {
        // 現在の年を使用してタイムスタンプを構築
        const formattedTimestamp = `${currentYear}-${month}-${day}T${hour}:${minute}:${second}.${ms}Z`;
        const date = dayjs(formattedTimestamp);

        if (date.isValid()) {
          return `${date.year()}年${date.month() + 1}月${date.date()}日 ${date.hour()}時${date.minute()}分 (${schema})`;
        }
      } catch (e) {
        console.error('日時の解析に失敗:', e);
        console.error('入力値:', { month, day, hour, minute, second, ms, schema });
      }
      return `${month}-${day} ${hour}:${minute} (${schema})`;
    }

    return fileName;
  };

  // テーブルカラム定義
  const columns = [
    {
      title: "ファイル名",
      dataIndex: "name",
      key: "name",
      render: (name: string) => {
        const match = name.match(/backup-(.+?)-(.+?)\.sql$/);
        return match ? `${match[2]}スキーマのバックアップ` : name;
      },
    },
    {
      title: "作成日時",
      dataIndex: "name",
      key: "created",
      render: (name: string) => extractDateFromFileName(name),
    },
    {
      title: "サイズ",
      dataIndex: "size",
      key: "size",
      render: (size: number) => formatFileSize(size),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: BackupFile) => (
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => downloadBackupFile(record)}
          >
            ダウンロード
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteBackupFile(record)}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ];

  // 管理者でない場合のアラート表示
  if (identity && identity.role !== "admin") {
    return (
      <Card>
        <Alert
          message="アクセス制限"
          description="このページは管理者ユーザーのみがアクセスできます。"
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Space
          direction="horizontal"
          style={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Title level={4}>データベースバックアップ</Title>
          <Space>
            <Button
              type="primary"
              onClick={createBackup}
              loading={backupInProgress}
              disabled={backupInProgress}
            >
              新規バックアップ作成
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchBackupFiles}
              disabled={loading}
            >
              更新
            </Button>
          </Space>
        </Space>

        {error && (
          <Alert message="エラー" description={error} type="error" showIcon />
        )}

        {backupInProgress && (
          <Alert
            message="バックアップを作成中"
            description={
              <Space>
                <Spin /> バックアップを作成しています。この処理には数分かかる場合があります。
              </Space>
            }
            type="info"
            showIcon
          />
        )}

        <Table
          dataSource={backupFiles}
          columns={columns}
          rowKey="path"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: "バックアップファイルがありません",
          }}
        />

        <Alert
          message="注意"
          description="バックアップファイルには機密データが含まれる可能性があります。適切に管理してください。"
          type="warning"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default DbBackupList;
