import React, { useState, useEffect } from "react";
import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Typography, Space, Card, Image, Spin, message, Button, Descriptions } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import { DeleteButton } from "@refinedev/antd";
import { supabaseClient } from "../../utility";

const { Title } = Typography;

export const ImagesShow = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { query } = useShow();
    const { data, isLoading } = query;
    const record = data?.data;

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchWatermarkedImage = async () => {
        if (!record?.id) return;
        try {
            setLoading(true);
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session?.access_token) {
                throw new Error("認証情報が不足しています");
            }
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/v1/watermark-image/${record.id}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
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

    const handleDownload = async () => {
        if (!imageUrl || !record?.original_filename) return;
        try {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = record.original_filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading image:", error);
            message.error("ダウンロードに失敗しました");
        }
    };

    useEffect(() => {
        fetchWatermarkedImage();
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record?.id]);

    const headerButtons = [
        <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!imageUrl}
        >
            ダウンロード
        </Button>,
        <DeleteButton
            key="delete"
            resource="images"
            recordItemId={record?.id}
            onSuccess={() => {
                message.success("画像を削除しました");
                navigate("/images");
            }}
            mutationMode="pessimistic"
            icon={<DeleteOutlined />}
        />,
    ];

    return (
        <Show isLoading={isLoading} headerButtons={headerButtons}>
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
                </Card>
                <Card>
                    <Title level={5}>画像情報</Title>
                    <Descriptions column={1}>
                        <Descriptions.Item label="ファイル名">{record?.name}</Descriptions.Item>
                        <Descriptions.Item label="オリジナルファイル名">{record?.original_filename}</Descriptions.Item>
                        <Descriptions.Item label="サイズ">{record?.width}x{record?.height}</Descriptions.Item>
                        <Descriptions.Item label="作成日時">
                            {record?.created_at && new Date(record.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, '年').replace('年', '年').replace('年', '月').replace('月', '月').replace('日', '日')}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            </Space>
        </Show>
    );
};
