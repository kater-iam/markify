import React, { useState, useEffect } from "react";
import { useShow, useList } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Typography, Space, Card, Image, Spin, message, Button, Descriptions, Table } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import { DeleteButton } from "@refinedev/antd";
import { supabaseClient } from "../../utility";
import { useUserRole } from "../../utility/hooks/useUserRole";

const { Title } = Typography;

export const ImagesShow = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { query } = useShow();
    const { data, isLoading } = query;
    const record = data?.data;
    const { isAdmin } = useUserRole();

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // ダウンロード履歴の取得
    const { data: downloadLogsData, isLoading: isDownloadLogsLoading } = useList({
        resource: "download_logs",
        filters: [
            {
                field: "image_id",
                operator: "eq",
                value: id,
            },
        ],
        sorters: [
            {
                field: "created_at",
                order: "desc",
            },
        ],
        meta: {
            select: "*, profiles!download_logs_profile_id_fkey(id, first_name, last_name)",
        },
    });

    const fetchWatermarkedImage = async () => {
        if (!record?.id) return;
        try {
            setLoading(true);
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session?.access_token) {
                throw new Error("認証情報が不足しています");
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

    // ダウンロード履歴のカラム定義
    const downloadLogsColumns = [
        {
            title: "ダウンロード日時",
            dataIndex: "created_at",
            key: "created_at",
            render: (date: string) => {
                const d = new Date(date);
                return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}時${String(d.getMinutes()).padStart(2, '0')}分`;
            },
        },
        {
            title: "ユーザー名",
            dataIndex: ["profiles"],
            key: "user_name",
            render: (profile: { first_name: string; last_name: string; id: string }) => {
                return (
                    <Button
                        type="link"
                        onClick={() => navigate(`/profiles/show/${profile.id}`)}
                    >
                        {`${profile.last_name} ${profile.first_name}`}
                    </Button>
                );
            },
        },
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
                            {record?.created_at && (() => {
                                const date = new Date(record.created_at);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                return `${year}年${month}月${day}日`;
                            })()}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
                {isAdmin && (
                    <Card>
                        <Title level={5}>ダウンロード履歴</Title>
                        <Table
                            dataSource={downloadLogsData?.data}
                            columns={downloadLogsColumns}
                            loading={isDownloadLogsLoading}
                            rowKey="id"
                            pagination={{ pageSize: 5 }}
                        />
                    </Card>
                )}
            </Space>
        </Show>
    );
};
