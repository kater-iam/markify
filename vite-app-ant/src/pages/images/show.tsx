import React, { useState, useEffect } from "react";
import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Typography, Space, Card, Descriptions, Image, Spin, message } from "antd";
import { useParams } from "react-router-dom";
import { supabaseClient } from "../../utility";

const { Title } = Typography;

export const ImagesShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { queryResult } = useShow({
    resource: "images",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = queryResult;
  const record = data?.data;

  const fetchWatermarkedImage = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("認証情報が不足しています");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/watermark-image/${id}`,
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
        throw new Error(errorData.error || `画像の取得に失敗しました: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (error) {
      console.error("Error fetching watermarked image:", error);
      message.error(error instanceof Error ? error.message : "画像の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatermarkedImage();
    // クリーンアップ関数
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [id]);

  return (
    <Show isLoading={isLoading}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : imageUrl ? (
            <Image
              src={imageUrl}
              alt="Watermarked image"
              style={{ maxWidth: '100%' }}
            />
          ) : null}
        </Card>        <Card>
          <Title level={5}>画像情報</Title>
          <Descriptions column={1}>
            <Descriptions.Item label="ファイル名">{record?.name}</Descriptions.Item>
            <Descriptions.Item label="オリジナルファイル名">{record?.original_filename}</Descriptions.Item>
            <Descriptions.Item label="サイズ">{record?.width}x{record?.height}</Descriptions.Item>
            <Descriptions.Item label="作成日時">
              {record?.created_at && new Date(record.created_at).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })}
            </Descriptions.Item>
          </Descriptions>
        </Card>


      </Space>
    </Show>
  );
};
