import React from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions, Tag } from "antd";
import dayjs from "dayjs";

const { Title } = Typography;

export const ProfilesShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;
    
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

    return (
        <Show>
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
        </Show>
    );
};
