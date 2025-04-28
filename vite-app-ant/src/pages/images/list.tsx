import React from "react";
import { useTable, useNavigation } from "@refinedev/core";
import { List, Table, Space, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { BaseRecord } from "@refinedev/core";

export const ImagesList: React.FC = () => {
  const { tableQueryResult: { data }, ...tableProps } = useTable({
    resource: "images",
    syncWithLocation: true,
  });

  const { show } = useNavigation();

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
