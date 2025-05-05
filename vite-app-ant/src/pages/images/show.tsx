import React from "react";
import { useShow, useOne } from "@refinedev/core";
import {
    Show,
    TagField,
    TextField,
    ImageField,
    NumberField,
    DateField,
} from "@refinedev/antd";
import { Typography } from "antd";

const { Title } = Typography;

export const ImagesShow = () => {
    const { query } = useShow();
    const { data, isLoading } = query;

    const record = data?.data;

    const { data: profileData, isLoading: profileIsLoading } = useOne({
        resource: "profiles",
        id: record?.profile_id || "",
        queryOptions: {
            enabled: !!record,
        },
    });

    return (
        <Show isLoading={isLoading}>
            <Title level={5}>Id</Title>
            <TextField value={record?.id} />
            <Title level={5}>Profile</Title>
            {profileIsLoading ? (
                <>Loading...</>
            ) : (
                <>{profileData?.data?.first_name}</>
            )}
            <Title level={5}>File Path</Title>
            <ImageField style={{ maxWidth: 200 }} value={record?.file_path} />
            <Title level={5}>Original Filename</Title>
            <ImageField
                style={{ maxWidth: 200 }}
                value={record?.original_filename}
            />
            <Title level={5}>Name</Title>
            <TextField value={record?.name} />
            <Title level={5}>Width</Title>
            <NumberField value={record?.width ?? ""} />
            <Title level={5}>Height</Title>
            <NumberField value={record?.height ?? ""} />
            <Title level={5}>Created At</Title>
            <DateField value={record?.created_at} />
            <Title level={5}>Updated At</Title>
            <DateField value={record?.updated_at} />
        </Show>
    );
};
