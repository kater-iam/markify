import React, { useEffect, useState, useCallback } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Spin, Alert } from 'antd';
import { Authenticated, useOne, useUpdate } from "@refinedev/core";
import { ReloadOutlined } from "@ant-design/icons";

interface WatermarkSettingsData {
  enabled: boolean;
  text: string;
  fontSize: number;
  opacity: number;
  color: string;
}

interface SettingRecord {
  id: string | number;
  key: string;
  value: WatermarkSettingsData;
  description?: string;
}

const defaultSettings: WatermarkSettingsData = {
  enabled: false,
  text: '',
  fontSize: 24,
  opacity: 0.5,
  color: '#000000',
};

export const WatermarkSettings: React.FC = () => {
  const [form] = Form.useForm<WatermarkSettingsData>();
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | number | null>(null);

  const { data: queryResult, isLoading, isError, error, refetch } = useOne<SettingRecord>(
    {
      resource: "settings",
      id: "watermark",
      meta: {
        // Supabase Data Provider は meta を直接 SQL に反映しないため、
        // id として key を渡し、dataProvider の getOne で解釈させるか、
        // useList を使うか、dataProvider のカスタマイズが必要になる。
        // ここでは一旦 key を id として渡す方法を試す。
        // 本来なら getOne(resource, { id: 'some-uuid', meta: { filters: [...] } }) や
        // getList(resource, { filters: [...] }) が適切。
        // select: "value" // 必要なら指定
      },
    },
  );

  useEffect(() => {
    if (queryResult?.data) {
      const record = queryResult.data;
      if (record?.value) {
        form.setFieldsValue(record.value);
        setRecordId(record.id);
      } else {
        form.setFieldsValue(defaultSettings);
        setRecordId(null);
      }
    } else if (!isLoading && !isError) {
      form.setFieldsValue(defaultSettings);
      setRecordId(null);
    }
  }, [queryResult, form, isLoading, isError]);

  const { mutate } = useUpdate<SettingRecord>();

  const onFinish = async (values: WatermarkSettingsData) => {
    if (recordId) {
      mutate({
        resource: "settings",
        id: recordId,
        values: {
          value: values,
          description: 'ウォーターマーク設定'
        },
        successNotification: () => ({
          message: "設定を保存しました",
          type: "success"
        }),
        errorNotification: (error) => ({
          message: `設定の保存に失敗しました: ${error?.message || '不明なエラー'}`,
          type: "error"
        })
      });
    } else {
      console.error("初回保存のためのレコードIDが見つかりません。Upsertロジックが必要です。");
      message.error("設定の初回保存に失敗しました。開発者に連絡してください。");
    }
  };

  if (isLoading) {
    return (
      <Authenticated key="watermark-settings-loading" fallback={<div>認証が必要です</div>}>
        <Card title="ウォーターマーク設定">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p>設定を読み込んでいます...</p>
          </div>
        </Card>
      </Authenticated>
    );
  }

  if (isError) {
    return (
      <Authenticated key="watermark-settings-error" fallback={<div>認証が必要です</div>}>
        <Card title="ウォーターマーク設定">
          <Alert
            message="エラー"
            description={
              <>
                設定の読み込み中にエラーが発生しました。
                <br />
                ({(error as any)?.message || '不明なエラー'})
              </>
            }
            type="error"
            showIcon
            action={
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
              >
                再試行
              </Button>
            }
          />
        </Card>
      </Authenticated>
    );
  }

  return (
    <Authenticated
      key="watermark-settings"
      fallback={<div>認証が必要です</div>}
    >
      <Card title="ウォーターマーク設定">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="enabled"
            label="ウォーターマークを有効にする"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="text"
            label="ウォーターマークテキスト"
            rules={[{ required: true, message: 'テキストを入力してください' }]}
          >
            <Input placeholder="例: © 2024 My Company" />
          </Form.Item>

          <Form.Item
            name="fontSize"
            label="フォントサイズ"
            rules={[{ required: true, message: 'フォントサイズを入力してください' }]}
          >
            <InputNumber min={8} max={72} />
          </Form.Item>

          <Form.Item
            name="opacity"
            label="不透明度"
            rules={[{ required: true, message: '不透明度を入力してください' }]}
          >
            <InputNumber min={0} max={1} step={0.1} />
          </Form.Item>

          <Form.Item
            name="color"
            label="色"
            rules={[{ required: true, message: '色を選択してください' }]}
          >
            <Input type="color" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Authenticated>
  );
}; 