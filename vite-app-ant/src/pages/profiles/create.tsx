import React, { useState } from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const ProfilesCreate = () => {
    const { formProps, saveButtonProps } = useForm();
    
    // 選択されたロールを管理する状態
    const [selectedRole, setSelectedRole] = useState<string>("general"); // デフォルトは一般ユーザー
    
    // ロールの選択肢
    const roleOptions = [
        { label: "管理者", value: "admin" },
        { label: "一般", value: "general" }
    ];

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="コード"
                    name={["code"]}
                    rules={[
                        {
                            required: true,
                            message: "コードを入力してください",
                        },
                    ]}
                >
                    <Input placeholder="例: user001" />
                </Form.Item>
                <Form.Item
                    label="姓"
                    name={["last_name"]}
                    rules={[
                        {
                            required: true,
                            message: "姓を入力してください",
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
                            message: "名を入力してください",
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
                            message: "ロールを選択してください",
                        },
                    ]}
                    initialValue="general"
                >
                    <Select
                        options={roleOptions}
                        onChange={(value) => setSelectedRole(value)}
                    />
                </Form.Item>
            </Form>
        </Create>
    );
};
