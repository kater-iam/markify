import React from "react";
import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Typography, Space, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export const ImagesShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { queryResult } = useShow({
    resource: "images",
  });

  const { data, isLoading } = queryResult;
  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>画像情報</Title>
      <Text>ファイル名: {record?.file_name}</Text>
      <br />
      <Text>作成日時: {record?.created_at && new Date(record.created_at).toLocaleString("ja-JP")}</Text>
      <br />
      <Space style={{ marginTop: 16 }}>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/images/view/${id}`)}
        >
          ウォーターマーク付き画像を表示
        </Button>
      </Space>
    </Show>
  );
};
