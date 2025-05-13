import React from "react";
import { Create, useForm, useSelect, getValueFromEvent } from "@refinedev/antd";
import { Form, Input, Select, Upload, DatePicker } from "antd";
import dayjs from "dayjs";
import { supabaseClient } from "../../utility/supabaseClient";
import { useGetIdentity } from "@refinedev/core";
import { v4 as uuidv4 } from 'uuid';
const supabaseBucket = import.meta.env.VITE_SUPABASE_BUCKET;

export const ImagesCreate = () => {
    const { formProps, saveButtonProps } = useForm();
    const [uploading, setUploading] = React.useState(false);
    const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
    const { data: identity } = useGetIdentity<{ id: string }>();

    // profile_id自動セット
    React.useEffect(() => {
        const setProfileId = async () => {
            if (!identity?.id) return;
            const { data: profile } = await supabaseClient
                .from("profiles")
                .select("id")
                .eq("id", identity.id)
                .single();
            if (profile?.id) {
                formProps.form?.setFieldsValue({ profile_id: profile.id });
            }
        };
        setProfileId();
    }, [identity, formProps.form]);

    // 画像アップロード処理
    const handleUpload = async (file: File) => {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const imageId = uuidv4();
        const filePath = `${imageId}.${fileExt}`;
        const { error } = await supabaseClient.storage.from(supabaseBucket).upload(filePath, file);
        setUploading(false);
        if (error) {
            return Promise.reject(error.message);
        }
        formProps.form?.setFieldsValue({
            id: imageId,
            file_path: filePath,
            original_filename: file.name
        });
        // サムネイル: FileReaderでDataURL生成
        const reader = new FileReader();
        reader.onload = (e) => {
            setThumbnailUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        // 画像の幅・高さを取得してセット
        const img = new window.Image();
        img.onload = () => {
            formProps.form?.setFieldsValue({ width: img.width, height: img.height });
        };
        img.src = URL.createObjectURL(file);
        return false;
    };

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item name="id" style={{ display: "none" }}>
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item name="profile_id" style={{ display: "none" }}>
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item name="original_filename" style={{ display: "none" }}>
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item name="width" style={{ display: "none" }}>
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item name="height" style={{ display: "none" }}>
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item
                    label="画像"
                    name="file_path"
                    rules={[{ required: true, message: "画像をアップロードしてください" }]}
                >
                    <Upload.Dragger
                        name="file"
                        customRequest={({ file, onError, onSuccess }) => {
                            handleUpload(file as File)
                                .then(() => onSuccess && onSuccess("ok"))
                                .catch((err) => onError && onError(new Error(err)));
                        }}
                        showUploadList={false}
                        disabled={uploading}
                        accept="image/*"
                    >
                        <p className="ant-upload-text">画像をドラッグ＆ドロップ、またはクリックして選択</p>
                    </Upload.Dragger>
                    {thumbnailUrl && (
                        <div style={{ marginTop: 16 }}>
                            <img src={thumbnailUrl} alt="thumbnail" style={{ maxWidth: 200, border: "1px solid #eee" }} />
                            <div style={{ color: "#888", fontSize: 12 }}>アップロード済みサムネイル</div>
                        </div>
                    )}
                    {/* 自動項目の明示表示 */}
                    <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
                        ファイル名: <span style={{ fontWeight: 'bold' }}>{formProps.form?.getFieldValue('original_filename') || '-'}</span><br />
                        幅: <span style={{ fontWeight: 'bold' }}>{formProps.form?.getFieldValue('width') || '-'}</span> px
                        高さ: <span style={{ fontWeight: 'bold' }}>{formProps.form?.getFieldValue('height') || '-'}</span> px
                    </div>
                </Form.Item>
                <Form.Item
                    label="名前"
                    name="name"
                    rules={[{ required: true, message: "名前を入力してください" }]}
                >
                    <Input />
                </Form.Item>
            </Form>
        </Create>
    );
};
