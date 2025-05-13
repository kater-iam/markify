import React, { useState, useEffect } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, DatePicker, Select } from "antd";
import dayjs from "dayjs";

export const ProfilesEdit = () => {
    const { formProps, saveButtonProps, queryResult } = useForm();

    // 現在選択されているロールを追跡する状態
    const [selectedRole, setSelectedRole] = useState<string | undefined>(
        formProps.initialValues?.role
    );

    // 初期値が読み込まれたときにロールを設定
    useEffect(() => {
        if (formProps.initialValues?.role) {
            setSelectedRole(formProps.initialValues.role);
        }
    }, [formProps.initialValues]);

    // ロールの選択肢
    const roleOptions = [
        { label: "管理者", value: "admin" },
        { label: "一般", value: "general" }
    ];

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="Id"
                    name={["id"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input readOnly disabled />
                </Form.Item>
                <Form.Item
                    label="コード"
                    name={["code"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="姓"
                    name={["last_name"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="名"
                    name={["first_name"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="ロール"
                    name={["role"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Select
                        options={roleOptions}
                        onChange={(value) => setSelectedRole(value)}
                    />
                </Form.Item>
            </Form>
        </Edit>
    );
};
