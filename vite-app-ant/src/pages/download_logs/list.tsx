import React from "react";
import { BaseRecord, useMany } from "@refinedev/core";
import {
    useTable,
    List,
    EditButton,
    ShowButton,
    DeleteButton,
    DateField,
} from "@refinedev/antd";
import { Table, Space } from "antd";

export const DownloadLogsList = () => {
    const { tableProps } = useTable({
        syncWithLocation: true,
    });

    const { data: profileData, isLoading: profileIsLoading } = useMany({
        resource: "profiles",
        ids: tableProps?.dataSource?.map((item) => item?.profile_id) ?? [],
        queryOptions: {
            enabled: !!tableProps?.dataSource,
        },
    });

    const { data: imageData, isLoading: imageIsLoading } = useMany({
        resource: "images",
        ids: tableProps?.dataSource?.map((item) => item?.image_id) ?? [],
        queryOptions: {
            enabled: !!tableProps?.dataSource,
        },
    });

    return (
        // ヘッダーボタンを空配列（ボタンを表示しない）で返す
        <List headerButtons={() => {return []}}>
            <Table {...tableProps} rowKey="id">
                <Table.Column
                    dataIndex={["profile_id"]}
                    title="ダウンロードユーザー"
                    render={(value) =>
                        profileIsLoading ? (
                            <>Loading...</>
                        ) : (
                            `${profileData?.data?.find((item) => item.id === value)?.last_name} ${profileData?.data?.find((item) => item.id === value)?.first_name}`
                        )
                    }
                />
                <Table.Column
                    dataIndex={["image_id"]}
                    title="ダウンロード画像"
                    render={(value) =>
                        imageIsLoading ? (
                            <>Loading...</>
                        ) : (
                            imageData?.data?.find((item) => item.id === value)
                                ?.name
                        )
                    }
                />
                <Table.Column dataIndex="client_ip" title="IPアドレス" />
                <Table.Column
                    dataIndex={["created_at"]}
                    title="作成日（画像ダウンロード日）"
                    render={(value: any) => <DateField value={value} />}
                />
                <Table.Column
                    title="操作"
                    dataIndex="actions"
                    render={(_, record: BaseRecord) => (
                        <Space>
                            <ShowButton
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
                            <DeleteButton
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
