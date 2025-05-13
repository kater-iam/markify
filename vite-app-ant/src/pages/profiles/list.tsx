import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Space } from "antd";
import { EditButton, ShowButton, DeleteButton } from "@refinedev/antd";

// プロファイルの型定義
interface Profile {
    id: string;
    code: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'general';
    created_at: string;
    updated_at: string;
}

export const ProfilesList = () => {
    const { tableProps } = useTable<Profile>({
        syncWithLocation: true,
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

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column
                    dataIndex="id"
                    title="ID"
                    render={(value) => <span>{value.substring(0, 8)}...</span>}
                />
                <Table.Column
                    dataIndex="code"
                    title="コード"
                />
                <Table.Column
                    title="名前"
                    render={(_, record: Profile) => (
                        <span>{record.last_name} {record.first_name}</span>
                    )}
                />
                <Table.Column
                    dataIndex="role"
                    title="ロール"
                    render={(value) => (
                        <Tag color={getRoleColor(value)}>
                            {value === "admin" && "管理者"}
                            {value === "general" && "一般"}
                        </Tag>
                    )}
                />
                <Table.Column
                    title="アクション"
                    dataIndex="actions"
                    render={(_, record: Profile) => (
                        <Space>
                            <ShowButton
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
                            <EditButton
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
