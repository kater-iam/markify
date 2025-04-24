import React from "react";
import { useTable, useNavigation } from "@refinedev/core";
import { List, Table, Space, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";

export const ImagesList: React.FC = () => {
  const { tableProps } = useTable({
    resource: "images",
    syncWithLocation: true,
  });

  const { show } = useNavigation();

  const columns = [
    {
      title: "ファイル名",
      dataIndex: "file_name",
      key: "file_name",
    },
    {
      title: "作成日時",
      dataIndex: "created_at",
      key: "created_at",
      render: (value: string) => new Date(value).toLocaleString("ja-JP"),
    },
    {
      title: "アクション",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => {
              window.location.href = `/images/view/${record.id}`;
            }}
          >
            表示
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table {...tableProps} columns={columns} rowKey="id" />
    </List>
  );
};
