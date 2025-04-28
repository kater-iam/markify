import React from "react";
import { useTable, useNavigation, useGetIdentity } from "@refinedev/core";
import { List, Table, Space, Button, App } from "antd";
import { EyeOutlined, DownloadOutlined } from "@ant-design/icons";
import { BaseRecord } from "@refinedev/core";
import { supabaseClient } from "../../utility";

export const ImagesList: React.FC = () => {
  const { tableQueryResult: { data }, ...tableProps } = useTable({
    resource: "images",
    syncWithLocation: true,
  });

  const { show } = useNavigation();
  const { message } = App.useApp();

  const handleDownload = async (record: BaseRecord) => {
    try {
      console.log("Record data:", record);

      if (!record.id) {
        message.error("画像IDが不足しています");
        return;
      }

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        message.error("認証情報が不足しています");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/watermark-image/${record.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermark_${record.original_filename || "image"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success("ダウンロードが完了しました");
    } catch (error) {
      console.error("Download error:", error);
      message.error("ダウンロードに失敗しました");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "ファイル名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "オリジナルファイル名",
      dataIndex: "original_filename",
      key: "original_filename",
    },
    {
      title: "サイズ",
      key: "size",
      render: (record: any) => (
        <span>{record.width}x{record.height}</span>
      ),
    },
    {
      title: "作成日時",
      dataIndex: "created_at",
      key: "created_at",
      render: (value: string) => {
        return new Date(value).toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        });
      },
    },
    {
      title: "アクション",
      key: "actions",
      render: (record: BaseRecord) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => record.id && show("images", record.id)}
          >
            表示
          </Button>
          <Button
            type="default"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            ダウンロード
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table
        {...tableProps}
        rowKey="id"
        columns={columns}
        dataSource={data?.data}
      />
    </List>
  );
};
