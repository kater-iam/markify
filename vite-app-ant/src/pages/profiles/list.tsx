import React from "react";
import { List, useTable } from "@refinedev/antd";
import { useMany } from "@refinedev/core";
import { Table, Tag, Space } from "antd";
import { EditButton, ShowButton, DeleteButton } from "@refinedev/antd";

// 簡易的なプロファイルの型定義
interface Profile {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    manager_profile_id?: string;
    created_at: string;
    updated_at: string;
}

export const ProfilesList = () => {
    const { tableProps } = useTable<Profile>({
        syncWithLocation: true,
    });
    
    // マネージャー情報を取得するためのuseMany
    const { data: managersData, isLoading: isManagersLoading } = useMany({
        resource: "profiles",
        ids: tableProps?.dataSource
            ?.filter((item: Profile) => item.manager_profile_id)
            .map((item: Profile) => item.manager_profile_id as string) || [],
        queryOptions: {
            enabled: !!tableProps.dataSource,
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
    
    // マネージャー名を取得する関数
    const getManagerName = (managerId?: string) => {
        if (!managerId || isManagersLoading) return "-";
        
        const manager = managersData?.data.find((item) => item.id === managerId);
        return manager ? `${manager.last_name} ${manager.first_name}` : "-";
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
                    dataIndex={["last_name", "first_name"]}
                    title="名前"
                    render={(_, record: any) => (
                        <span>{record.last_name} {record.first_name}</span>
                    )}
                />
                <Table.Column
                    dataIndex="phone"
                    title="電話番号"
                />
                <Table.Column
                    dataIndex="role"
                    title="役割"
                    render={(value) => (
                        <Tag color={getRoleColor(value)}>
                            {value === "admin" && "管理者"}
                            {value === "manager" && "マネージャー"}
                            {value === "client" && "顧客"}
                        </Tag>
                    )}
                />
                <Table.Column
                    dataIndex="manager_profile_id"
                    title="担当マネージャー"
                    render={(value, record: any) => (
                        record.role === "client" ? getManagerName(value) : "-"
                    )}
                />
                <Table.Column
                    title="アクション"
                    dataIndex="actions"
                    render={(_, record: any) => (
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
