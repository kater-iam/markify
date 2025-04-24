import React, { useState, useEffect } from 'react';
import { Image, Spin, message } from 'antd';
import { supabaseClient } from '../utility/supabaseClient';

interface ImageViewerProps {
  imageId: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageId }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWatermarkedImage = async () => {
    try {
      setLoading(true);
      
      // Edge Functionを呼び出して画像を取得
      const { data, error } = await supabaseClient.functions.invoke('watermark-image', {
        body: { imageId }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        setImageUrl(data.url);
      } else {
        throw new Error('画像URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching watermarked image:', error);
      message.error('画像の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatermarkedImage();
  }, [imageId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      {loading && <Spin />}
      
      {imageUrl && !loading && (
        <Image
          src={imageUrl}
          alt="Watermarked image"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      )}
    </div>
  );
}; 