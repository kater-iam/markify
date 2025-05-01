import React, { useEffect, useState, useCallback } from 'react';
import { Card, Form, Input, InputNumber, Button, message, Spin, Alert, Typography } from 'antd';
import { supabaseClient } from '../../utility/supabaseClient';
import { Authenticated } from "@refinedev/core";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface WatermarkSettingsData {
  fontSize: number;
  opacity: number;
  color: string;
  spacing: number;
}

const defaultSettings: WatermarkSettingsData = {
  fontSize: 24,
  opacity: 0.5,
  color: '#000000',
  spacing: 100,
};

export const WatermarkSettings: React.FC = () => {
  const [form] = Form.useForm<WatermarkSettingsData>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'watermark')
        .single();

      if (error && error.code !== 'PGRST116') {
         throw error;
      }

      if (data?.value) {
        form.setFieldsValue(data.value as WatermarkSettingsData);
      } else {
        form.setFieldsValue(defaultSettings);
      }
    } catch (error: any) {
      console.error('ウォーターマーク設定の読み込みに失敗しました:', error);
      message.error(`設定の読み込みに失敗しました: ${error.message}`);
      setLoadError(error);
      form.setFieldsValue(defaultSettings);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const onFinish = async (values: WatermarkSettingsData) => {
    setSaving(true);
    console.log("Form Values:", values);
    try {
        const { error } = await supabaseClient
            .from('settings')
            .upsert({
                key: 'watermark',
                value: values,
                description: 'ウォーターマーク設定'
            }, {
                onConflict: 'key'
            });

        if (error) {
            throw error;
        }

        message.success('ウォーターマーク設定を保存しました');

    } catch (error: any) {
      message.error(`設定の保存に失敗しました: ${error.message}`);
      console.error("Save Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Card title="ウォーターマーク設定">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p>設定を読み込んでいます...</p>
          </div>
        </Card>
      </div>
    );
  }



  if (loadError) {
    return (
      <Authenticated key="watermark-settings-error" fallback={<div>認証が必要です</div>}>
        <Card title="ウォーターマーク設定">
          <Alert
            message="エラー"
            description={
              <>
                設定の読み込み中にエラーが発生しました。再試行してください。
                <br />
                ({loadError.message || '不明なエラー'})
              </>
            }
            type="error"
            showIcon
            action={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadSettings}
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
    <div
    >
      <Card>
        <Title level={4}>ウォーターマーク設定</Title>
        <Text>画像に表示するウォーターマーク（透かし）の設定を行います。</Text>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="fontSize"
            label="フォントサイズ (px)"
            rules={[{ required: true, message: 'フォントサイズを入力してください' }]}
            tooltip="透かし文字の大きさをピクセル単位で指定します。"
          >
            <InputNumber min={8} max={128} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="opacity"
            label="不透明度 (0〜1)"
            rules={[
                { required: true, message: '不透明度を入力してください' },
                { type: 'number', min: 0, max: 1, message: '0から1の間で指定してください' }
            ]}
            tooltip="透かしの透明度を指定します。0で完全に透明、1で完全に不透明です。"
          >
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }}/>
          </Form.Item>

          <Form.Item
            name="color"
            label="色"
            rules={[{ required: true, message: '色を選択してください' }]}
            tooltip="透かしの色を選択します。"
          >
            <Input type="color" style={{ width: '100px' }} />
          </Form.Item>

          <Form.Item
            name="spacing"
            label="文字間隔 (px)"
            rules={[{ required: true, message: '文字間隔を入力してください' }]}
            tooltip="透かし文字の間隔をピクセル単位で指定します。大きくすると文字の重なりが減ります。"
          >
            <InputNumber min={50} max={500} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
            >
              設定を保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}; 