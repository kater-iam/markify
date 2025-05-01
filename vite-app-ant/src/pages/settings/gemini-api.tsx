import React, { useState, useEffect } from "react";
import { useNotification } from "@refinedev/core";
import { Card, Typography, Button, Input, Space, Alert, Spin, message, Badge, Modal, Tag, Form } from "antd";
import { ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, FileSearchOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { supabaseClient } from "../../utility";

const { Title, Text, Paragraph } = Typography;

export const GeminiApiSettings = () => {
    const [apiKeyData, setApiKeyData] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [validationState, setValidationState] = useState<{
        apiKeyValid: boolean | null;
        message: string | null;
        details: string | null;
    }>({
        apiKeyValid: null,
        message: null,
        details: null
    });
    const [isTestingApi, setIsTestingApi] = useState(false);
    const [validationModalVisible, setValidationModalVisible] = useState(false);
    const [inputApiKey, setInputApiKey] = useState('');
    
    const { open } = useNotification();

    // Gemini APIキーの情報を取得する
    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabaseClient
                    .from("settings")
                    .select("value")
                    .eq("key", "gemini_apikey")
                    .single();

                if (error) {
                    // エラーがあっても初回設定の可能性があるので、特にエラー表示はしない
                    console.log("Gemini APIキー取得: データなし");
                } else if (data) {
                    setApiKeyData(data.value);
                    setInputApiKey(data.value);
                    // 既存のAPIキーが有効かを確認
                    await validateApiKey(data.value);
                }
            } catch (error: any) {
                console.error("Gemini APIキー情報の取得エラー:", error);
                open?.({
                    type: "error",
                    message: "Gemini APIキー情報の取得に失敗しました",
                    description: error.message,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchApiKey();
    }, []);

    // APIキーの検証
    const validateApiKey = async (apiKey: string) => {
        try {
            setIsTestingApi(true);
            setValidationState(prev => ({
                ...prev,
                apiKeyValid: null,
                message: "APIキーを検証中...",
                details: null
            }));
            
            // APIキーが空の場合
            if (!apiKey.trim()) {
                setValidationState({
                    apiKeyValid: false,
                    message: "APIキーが入力されていません",
                    details: "有効なAPIキーを入力してください"
                });
                return false;
            }
            
            // Gemini APIに簡単なプロンプトを送信してテスト
            const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
            if (!functionsUrl) {
                throw new Error('Supabase Functions URLが設定されていません');
            }
            
            // Supabase認証トークンの取得
            const { data: sessionData } = await supabaseClient.auth.getSession();
            const supabaseToken = sessionData.session?.access_token;
            
            const response = await fetch(`${functionsUrl}/functions/v1/gemini`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': supabaseToken ? `Bearer ${supabaseToken}` : '',
                    'apikey': import.meta.env.VITE_SUPABASE_KEY || '',
                },
                body: JSON.stringify({
                    prompt: "Say 'Hello, this is a test'",
                    apiKey: apiKey,
                    temperature: 0.0
                })
            });
            
            const result = await response.json();
            
            if (!response.ok || result.error) {
                setValidationState({
                    apiKeyValid: false,
                    message: "Gemini APIキーが無効です",
                    details: result.error || "APIキーの検証中にエラーが発生しました"
                });
                return false;
            }
            
            // APIテストが成功した場合
            setValidationState({
                apiKeyValid: true,
                message: "Gemini APIキーは有効です",
                details: "APIは正常に動作しています"
            });
            
            return true;
        } catch (error: any) {
            console.error("Gemini API検証エラー:", error);
            setValidationState({
                apiKeyValid: false,
                message: "APIキーの検証中にエラーが発生しました",
                details: error.message
            });
            return false;
        } finally {
            setIsTestingApi(false);
        }
    };

    // APIキーの保存
    const saveApiKey = async () => {
        try {
            setSaving(true);
            
            if (!inputApiKey.trim()) {
                message.error("APIキーを入力してください");
                return;
            }
            
            // APIキーをデータベースに保存
            const { data, error } = await supabaseClient
                .from("settings")
                .upsert({ 
                    key: "gemini_apikey", 
                    value: inputApiKey 
                }, { 
                    onConflict: "key"
                });
            
            if (error) {
                throw error;
            }
            
            setApiKeyData(inputApiKey);
            message.success("Gemini APIキーを保存しました");
            
            // 保存後にAPIキーを検証
            await validateApiKey(inputApiKey);
        } catch (error: any) {
            console.error("APIキー保存エラー:", error);
            message.error(`APIキーの保存に失敗しました: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    // 詳細表示モーダル
    const showValidationDetails = () => {
        setValidationModalVisible(true);
    };

    // 手動で検証を実行
    const handleManualValidation = async () => {
        if (apiKeyData) {
            await validateApiKey(apiKeyData);
        } else {
            message.error("APIキーが設定されていません");
        }
    };

    // APIキー入力の変更
    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputApiKey(e.target.value);
    };

    // 検証状態のバッジを表示
    const renderValidationBadge = () => {
        if (validationState.apiKeyValid === null) {
            return <Badge status="default" text="未検証" />;
        } else if (validationState.apiKeyValid) {
            return <Badge status="success" text="有効" />;
        } else {
            return <Badge status="error" text="無効" />;
        }
    };

    return (
        <Card>
            <Title level={4}>Gemini API設定</Title>
            <Text>AI機能に使用するGemini APIのAPIキーを設定します。</Text>
            
            {loading ? (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    <div style={{ margin: '20px 0' }}>
                        {apiKeyData ? (
                            <Alert
                                message="Gemini APIキーが設定されています"
                                description={
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Text>APIキーが登録されています。更新する場合は新しいAPIキーを入力してください。</Text>
                                        <Space>
                                            <Button 
                                                type="primary" 
                                                icon={<SyncOutlined />} 
                                                onClick={handleManualValidation}
                                                loading={isTestingApi}
                                            >
                                                検証を実行
                                            </Button>
                                            <Button 
                                                icon={<FileSearchOutlined />} 
                                                onClick={showValidationDetails}
                                                disabled={validationState.apiKeyValid === null}
                                            >
                                                詳細を表示
                                            </Button>
                                        </Space>
                                        <div style={{ marginTop: 10 }}>
                                            <Text strong>APIキー状態: </Text>
                                            {renderValidationBadge()}
                                        </div>
                                    </Space>
                                }
                                type="success"
                                showIcon
                                icon={<CheckCircleOutlined />}
                            />
                        ) : (
                            <Alert
                                message="Gemini APIキーが設定されていません"
                                description="AI機能を使用するにはGemini APIキーを設定してください。"
                                type="warning"
                                showIcon
                                icon={<CloseCircleOutlined />}
                            />
                        )}
                    </div>
                    
                    <Card title="Gemini APIキーの設定" bordered={false}>
                        <Form layout="vertical">
                            <Form.Item 
                                label="APIキー" 
                                help="Google AI StudioからGemini APIキーを取得して入力してください"
                            >
                                <Input.Password
                                    value={inputApiKey}
                                    onChange={handleApiKeyChange}
                                    placeholder="APIキーを入力してください"
                                    iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                    style={{ width: '100%' }}
                                    disabled={saving}
                                />
                            </Form.Item>
                            <Form.Item>
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<ApiOutlined />}
                                        onClick={saveApiKey}
                                        loading={saving}
                                    >
                                        APIキーを保存
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </Card>
                    
                    <div style={{ marginTop: '20px' }}>
                        <Title level={5}>Gemini APIについて</Title>
                        <Text>
                            Gemini APIはGoogle AIが提供する自然言語処理APIです。
                            このシステムでは、SQLクエリの最適化、エラー解決、説明生成などのAI機能に使用されます。
                        </Text>
                        <div style={{ marginTop: '10px' }}>
                            <Text strong>APIキーの取得方法:</Text>
                            <ol>
                                <li>Google AI Studioにアクセス: <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">https://aistudio.google.com/</a></li>
                                <li>Googleアカウントでログイン</li>
                                <li>「API keys」セクションで新しいAPIキーを作成</li>
                                <li>作成したAPIキーをコピーして、このページに入力</li>
                            </ol>
                        </div>
                    </div>
                    
                    <Modal
                        title="Gemini API検証結果"
                        open={validationModalVisible}
                        onCancel={() => setValidationModalVisible(false)}
                        footer={[
                            <Button key="close" onClick={() => setValidationModalVisible(false)}>
                                閉じる
                            </Button>
                        ]}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                                <Text strong>APIキー状態: </Text>
                                {validationState.apiKeyValid === true ? (
                                    <Tag color="success">有効</Tag>
                                ) : validationState.apiKeyValid === false ? (
                                    <Tag color="error">無効</Tag>
                                ) : (
                                    <Tag color="default">未検証</Tag>
                                )}
                            </div>
                            
                            {validationState.message && (
                                <Alert
                                    message={validationState.message}
                                    type={validationState.apiKeyValid ? "success" : "error"}
                                    showIcon
                                />
                            )}
                            
                            {validationState.details && (
                                <div style={{ marginTop: 10 }}>
                                    <Text strong>詳細:</Text>
                                    <Paragraph style={{ background: '#f5f5f5', padding: 10, marginTop: 5 }}>
                                        {validationState.details}
                                    </Paragraph>
                                </div>
                            )}
                        </Space>
                    </Modal>
                </>
            )}
        </Card>
    );
}; 