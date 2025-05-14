import React from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Typography, Descriptions } from "antd";

const { Title } = Typography;

export const DownloadLogsShow = () => {
    const { queryResult } = useShow();
    const { data, isLoading } = queryResult;
    const record = data?.data;

    return (
        <Show>
            <Title level={5}>ダウンロードログ詳細</Title>
            <Descriptions bordered>
                <Descriptions.Item label="ID" span={3}>
                    {record?.id}
                </Descriptions.Item>
                <Descriptions.Item label="ユーザーID" span={3}>
                    {record?.user_id}
                </Descriptions.Item>
                <Descriptions.Item label="画像ID" span={3}>
                    {record?.image_id}
                </Descriptions.Item>
                <Descriptions.Item label="作成日時" span={3}>
                    {record?.created_at && new Date(record.created_at).toLocaleString('ja-JP')}
                </Descriptions.Item>
            </Descriptions>
        </Show>
    );
};
