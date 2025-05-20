import React from "react";
import { Show } from "@refinedev/antd";
import { useShow, useOne } from "@refinedev/core";
import { Typography, Descriptions } from "antd";

const { Title } = Typography;

export const DownloadLogsShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;

    const { data: profileData } = useOne({
        resource: "profiles",
        id: record?.profile_id ?? "",
        queryOptions: {
            enabled: !!record?.profile_id,
        },
    });

    return (
        <Show headerButtons={() => []}>
            <Title level={5}>ダウンロードログ詳細</Title>
            <Descriptions bordered>
                <Descriptions.Item label="ID" span={3}>
                    {record?.id}
                </Descriptions.Item>
                <Descriptions.Item label="ダウンロードユーザー" span={3}>
                    {profileData?.data ? `${profileData.data.last_name} ${profileData.data.first_name}` : "Loading..."}
                </Descriptions.Item>
                <Descriptions.Item label="画像ID" span={3}>
                    {record?.image_id}
                </Descriptions.Item>
                <Descriptions.Item label="IPアドレス" span={3}>
                    {record?.client_ip}
                </Descriptions.Item>
                <Descriptions.Item label="作成日時" span={3}>
                    {record?.created_at && new Date(record.created_at).toLocaleString('ja-JP')}
                </Descriptions.Item>
            </Descriptions>
        </Show>
    );
};
