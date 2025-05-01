import React from "react";
import { useTable, useNavigation } from "@refinedev/core";
import { List, Table, Space, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { BaseRecord } from "@refinedev/core";

export const ImagesList: React.FC = () => {
  const { tableQueryResult, current, pageSize, setCurrent, setPageSize } = useTable({
    resource: "images",
    syncWithLocation: true,
    pagination: {
      pageSize: 10,
    },
  });

  const { show } = useNavigation();

  const columns = [
    {
      title: "ファイル名",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: BaseRecord) => (
        <a onClick={() => record.id && show("images", record.id)}>{text}</a>
      ),
    },
    {
      title: "オリジナルファイル名",
      dataIndex: "original_filename",
      key: "original_filename",
      render: (text: string, record: BaseRecord) => (
        <a onClick={() => record.id && show("images", record.id)}>{text}</a>
      ),
    },
    {
      title: "サイズ",
      key: "size",
      render: (record: any) => (
        <a onClick={() => record.id && show("images", record.id)}>
          {record.width}x{record.height}
        </a>
      ),
    },
    {
      title: "作成日時",
      dataIndex: "created_at",
      key: "created_at",
      render: (value: string, record: BaseRecord) => (
        <a onClick={() => record.id && show("images", record.id)}>
          {new Date(value).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })}
        </a>
      ),
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
        dataSource={tableQueryResult.data?.data}
        rowKey="id"
        columns={columns}
        onRow={(record) => ({
          onClick: () => record.id && show("images", record.id),
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: current,
          pageSize: pageSize,
          total: tableQueryResult.data?.total,
          onChange: (page, pageSize) => {
            setCurrent(page);
            setPageSize(pageSize);
          },
          showSizeChanger: true,
          showTotal: (total) => `全 ${total} 件`,
        }}
      />
    </List>
  );
};
