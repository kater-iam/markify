import React from 'react';
import { Card, Typography, Space } from 'antd';
import { PictureOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export const CustomBanner: React.FC = () => {
    return (
        <Card
            style={{
                marginBottom: '16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
        >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Title level={3} style={{ margin: 0, color: '#1a1a1a' }}>
                    Markify - 画像のウォーターマーク管理システム
                </Title>
                <Space size="large">
                    <Space>
                        <PictureOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                        <Paragraph style={{ margin: 0 }}>
                            ユーザー固有のウォーターマーク
                        </Paragraph>
                    </Space>
                    <Space>
                        <SafetyCertificateOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                        <Paragraph style={{ margin: 0 }}>
                            不正使用の防止
                        </Paragraph>
                    </Space>
                    <Space>
                        <TeamOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                        <Paragraph style={{ margin: 0 }}>
                            チームでの安全な共有
                        </Paragraph>
                    </Space>
                </Space>
            </Space>
        </Card>
    );
};
