import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

interface AppTitleProps {
  collapsed: boolean;
}

export const AppTitle: React.FC<AppTitleProps> = ({ collapsed }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '64px' }}>
      {collapsed ? (
        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>M</Title>
      ) : (
        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Markify</Title>
      )}
    </div>
  );
};
