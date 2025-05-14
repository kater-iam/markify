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
import { Table, Space } from "antd";
import { useUserRole } from "../../utility/hooks/useUserRole";

export const ImagesList = () => {
    const { isAdmin, isLoading } = useUserRole();

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
    console.log('isAdmin' + isAdmin);

    const renderHeaderButtons = () => {
        if (isAdmin !== true) {
            return [];
        }
        return [<CreateButton key="create" />];
    };

    return (
        <List headerButtons={renderHeaderButtons}>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="name" title="Name" />
                <Table.Column
                    dataIndex={["created_at"]}
                    title=""
                    render={(value: any) => <DateField value={value} />}
                />
                <Table.Column
                    title="Actions"
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
