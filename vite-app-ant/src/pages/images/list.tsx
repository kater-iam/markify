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
} from "@refinedev/antd";
import { Table, Space } from "antd";

export const ImagesList = () => {
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

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="name" title="Name" />
                <Table.Column
                    dataIndex={["created_at"]}
                    title="Created At"
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
