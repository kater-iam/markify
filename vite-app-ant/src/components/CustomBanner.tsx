import React from 'react';
import { Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export const CustomBanner: React.FC = () => {
    return (
        <Alert
            message="Markify - 画像のウォーターマーク管理システム"
            description="このシステムは、画像にユーザー固有のウォーターマークを付与し、不正使用を防止するためのツールです。"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{
                marginBottom: '16px',
                borderRadius: '0',
            }}
        />
    );
};
