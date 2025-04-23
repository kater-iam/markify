import React from "react";
import { Show } from "@refinedev/antd";
import { useShow, useOne } from "@refinedev/core";
import { Typography, Descriptions, Tag } from "antd";
import dayjs from "dayjs";

const { Title } = Typography;

export const ProfilesShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;
    
    // マネージャープロフィール情報の取得（顧客の場合のみ）
    const { data: managerData, isLoading: isManagerLoading } = useOne({
        resource: "profiles",
        id: record?.manager_profile_id || "",
        queryOptions: {
            enabled: !!record?.manager_profile_id && record?.role === "client",
        },
    });
    
    // ロールに応じた色を返す関数
    const getRoleColor = (role?: string) => {
        switch (role) {
            case "admin":
                return "red";
            case "manager":
                return "blue";
            case "client":
                return "green";
            default:
                return "default";
        }
    };

    return (
        <Show isLoading={isLoading}>
            <Title level={5}>プロフィール情報</Title>
            <Descriptions bordered>
                <Descriptions.Item label="ID" span={3}>{record?.id}</Descriptions.Item>
                <Descriptions.Item label="名前" span={3}>
                    {record?.last_name} {record?.first_name}
                </Descriptions.Item>
                <Descriptions.Item label="電話番号" span={3}>{record?.phone}</Descriptions.Item>
                <Descriptions.Item label="役割" span={3}>
                    <Tag color={getRoleColor(record?.role)}>
                        {record?.role === "admin" && "管理者"}
                        {record?.role === "manager" && "マネージャー"}
                        {record?.role === "client" && "顧客"}
                    </Tag>
                </Descriptions.Item>
                
                {/* 顧客の場合のみ担当マネージャー情報を表示 */}
                {record?.role === "client" && record?.manager_profile_id && (
                    <Descriptions.Item label="担当マネージャー" span={3}>
                        {isManagerLoading ? (
                            "読み込み中..."
                        ) : (
                            managerData?.data ? (
                                <>
                                    {managerData.data.last_name} {managerData.data.first_name}
                                    <Tag color="blue" style={{ marginLeft: 8 }}>マネージャー</Tag>
                                </>
                            ) : (
                                "マネージャー情報がありません"
                            )
                        )}
                    </Descriptions.Item>
                )}
                
                <Descriptions.Item label="作成日時" span={3}>
                    {record?.created_at && dayjs(record.created_at).format("YYYY年MM月DD日 HH:mm")}
                </Descriptions.Item>
                <Descriptions.Item label="更新日時" span={3}>
                    {record?.updated_at && dayjs(record.updated_at).format("YYYY年MM月DD日 HH:mm")}
                </Descriptions.Item>
            </Descriptions>
        </Show>
    );
};
