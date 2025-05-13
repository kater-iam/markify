import React from "react";
import { Edit, useForm, useSelect, getValueFromEvent } from "@refinedev/antd";
import { Form, Input, Select, Upload, DatePicker } from "antd";
import dayjs from "dayjs";

export const ImagesEdit = () => {
    const { formProps, saveButtonProps, query } = useForm();

    const imagesData = query?.data?.data;

    const { selectProps: profileSelectProps } = useSelect({
        resource: "profiles",
        defaultValue: imagesData?.profile_id,
        optionLabel: "first_name",
    });

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="Id（変更不可）"
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
                    label="ファイル所有者"
                    name={"profile_id"}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Select {...profileSelectProps} />
                </Form.Item>
                <Form.Item label="Original Filename">
                    <Form.Item
                        name="original_filename"
                        getValueProps={(value) => ({
                            fileList: [{ url: value, name: value, uid: value }],
                        })}
                        getValueFromEvent={getValueFromEvent}
                        noStyle
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <Upload.Dragger
                            listType="picture"
                            beforeUpload={() => false}
                        >
                            <p className="ant-upload-text">
                                Drag & drop a file in this area
                            </p>
                        </Upload.Dragger>
                    </Form.Item>
                </Form.Item>
                <Form.Item
                    label="ファイル名"
                    name={["name"]}
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
            </Form>
        </Edit>
    );
};
