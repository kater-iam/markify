import React from 'react';
import { useParams } from 'react-router-dom';
import { ImageViewer } from '../components/ImageViewer';
import { Card } from 'antd';

export const ImagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>画像IDが指定されていません</div>;
  }

  return (
    <Card title="画像表示">
      <ImageViewer imageId={id} />
    </Card>
  );
}; 