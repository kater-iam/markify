import React from "react";
import { BaseRecord, useMany } from "@refinedev/core";
import {
    useTable,
    List,
    EditButton,
    ShowButton,
    DeleteButton,
    ImageField,
    DateField,
    CreateButton,
} from "@refinedev/antd";
import { Table, Space, Button } from "antd";
import { useUserRole } from "../../utility/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

export const ImagesList = () => {
    const { isAdmin, isLoading } = useUserRole();
    const navigate = useNavigate();

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

    if (isLoading) {
        return <div>Loading...</div>;
    }

    const renderHeaderButtons = () => {
        if (isAdmin !== true) {
            return [];
        }
        return [<CreateButton key="create" />];
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };

    return (
        <List headerButtons={renderHeaderButtons}>
            <Table {...tableProps} rowKey="id">
                <Table.Column
                    dataIndex="name"
                    title="名前"
                    render={(value: string, record: BaseRecord) => (
                        <Button
                            type="link"
                            onClick={() => navigate(`/images/show/${record.id}`)}
                        >
                            {value}
                        </Button>
                    )}
                />
                <Table.Column
                    dataIndex={["created_at"]}
                    title="作成日時"
                    render={(value: any) => formatDate(value)}
                />
                <Table.Column
                    title="操作"
                    dataIndex="actions"
                    render={(_, record: BaseRecord) => (
                        <Space>
                            <EditButton
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
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
