import React from "react";
import { Show } from "@refinedev/antd";
import { useShow, useList } from "@refinedev/core";
import { Typography, Descriptions, Tag, Table, Button, Card, Space } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

export const ProfilesShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;
    const navigate = useNavigate();

    // ダウンロード履歴の取得
    const { data: downloadLogsData, isLoading: isDownloadLogsLoading } = useList({
        resource: "download_logs",
        filters: [
            {
                field: "profile_id",
                operator: "eq",
                value: record?.id,
            },
        ],
        sorters: [
            {
                field: "created_at",
                order: "desc",
            },
        ],
        meta: {
            select: "*, images(id, name, original_filename)",
        },
    });

    // ロールに応じた色を返す関数
    const getRoleColor = (role?: string) => {
        switch (role) {
            case "admin":
                return "red";
            case "general":
                return "blue";
            default:
                return "default";
        }
    };

    // ダウンロード履歴のカラム定義
    const downloadLogsColumns = [
        {
            title: "ダウンロード日時",
            dataIndex: "created_at",
            key: "created_at",
            render: (date: string) => {
                return dayjs(date).format('YYYY年MM月DD日 HH時mm分');
            },
        },
        {
            title: "画像名",
            dataIndex: ["images"],
            key: "image_name",
            render: (image: { id: string; name: string; original_filename: string }) => {
                return (
                    <Button
                        type="link"
                        onClick={() => navigate(`/images/show/${image.id}`)}
                    >
                        {image.original_filename}
                    </Button>
                );
            },
        },
    ];

    return (
        <Show>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card>
                    <Title level={5}>プロファイル詳細</Title>
                    <Descriptions bordered>
                        <Descriptions.Item label="ID" span={3}>
                            {record?.id}
                        </Descriptions.Item>
                        <Descriptions.Item label="コード" span={3}>
                            {record?.code}
                        </Descriptions.Item>
                        <Descriptions.Item label="名前" span={3}>
                            {record?.last_name} {record?.first_name}
                        </Descriptions.Item>
                        <Descriptions.Item label="ロール" span={3}>
                            <Tag color={getRoleColor(record?.role)}>
                                {record?.role === "admin" && "管理者"}
                                {record?.role === "general" && "一般"}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="作成日時" span={3}>
                            {record?.created_at && dayjs(record.created_at).format('YYYY年MM月DD日 HH時mm分')}
                        </Descriptions.Item>
                        <Descriptions.Item label="更新日時" span={3}>
                            {record?.updated_at && dayjs(record.updated_at).format('YYYY年MM月DD日 HH時mm分')}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

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
            </Space>
        </Show>
    );
};
