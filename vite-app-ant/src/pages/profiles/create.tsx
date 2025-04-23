import React, { useState } from "react";
import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const ProfilesCreate = () => {
    const { formProps, saveButtonProps } = useForm();
    
    // 選択されたロールを管理する状態
    const [selectedRole, setSelectedRole] = useState<string>("client"); // デフォルトはクライアント
    
    // ロールの選択肢
    const roleOptions = [
        { label: "管理者", value: "admin" },
        { label: "マネージャー", value: "manager" },
        { label: "顧客", value: "client" }
    ];
    
    // マネージャー一覧を取得
    const { selectProps: managerSelectProps } = useSelect({
        resource: "profiles",
        optionLabel: "last_name",
        optionValue: "id",
        meta: {
            fields: ["id", "first_name", "last_name", "role"],
        },
        filters: [
            {
                field: "role",
                operator: "eq",
                value: "manager",
            },
        ],
        onSearch: (value) => [
            {
                field: "last_name",
                operator: "contains",
                value,
            },
        ],
    });
    
    // マネージャーの表示名をカスタマイズ
    const managerOptions = managerSelectProps.options?.map((option) => {
        // オプションの構造を確認
        const data = option.record || option;
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        
        return {
            ...option,
            label: firstName || lastName ? `${lastName} ${firstName}`.trim() : `マネージャー (ID: ${option.value})`,
        };
    });

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="First Name"
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
                    label="Last Name"
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
                    label="Phone"
                    name={["phone"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Role"
                    name={["role"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                    initialValue="client" // デフォルト値
                >
                    <Select
                        options={roleOptions}
                        onChange={(value) => setSelectedRole(value)}
                    />
                </Form.Item>
                
                {/* ロールが顧客の場合のみマネージャー選択フィールドを表示 */}
                {selectedRole === "client" && (
                    <Form.Item
                        label="担当マネージャー"
                        name={["manager_profile_id"]}
                        rules={[
                            {
                                required: true,
                                message: "担当マネージャーを選択してください",
                            },
                        ]}
                    >
                        <Select
                            options={managerOptions}
                            showSearch
                            placeholder="マネージャーを選択"
                            filterOption={(input, option) => 
                                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                )}
            </Form>
        </Create>
    );
};
