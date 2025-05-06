import { useState, useEffect } from 'react';
import { Button, Image, Input, Slider, Space, Upload, message, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps, RcFile } from 'antd/es/upload';
import { supabaseClient } from '../utility/supabaseClient';

interface ImageViewerProps {
  imageId: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageId }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [opacity, setOpacity] = useState<number>(50);
  const [fontSize, setFontSize] = useState<number>(20);
  const [position, setPosition] = useState<string>('center');
  const [angle, setAngle] = useState<number>(45);

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

  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      if (!file) {
        throw new Error('ファイルが選択されていません');
      }

      const uploadFile = file as RcFile;
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('images')
        .upload(filePath, uploadFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabaseClient.storage.from('images').getPublicUrl(filePath);
      
      if (data) {
        setImageUrl(data.publicUrl);
        message.success('画像のアップロードに成功しました');
        onSuccess?.(data);
      }
    } catch (error) {
      message.error('画像のアップロードに失敗しました');
      onError?.(error as Error);
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

      <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
        <Upload
          customRequest={handleUpload}
          showUploadList={false}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />}>画像をアップロード</Button>
        </Upload>

        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Uploaded image"
            style={{ maxWidth: '100%' }}
          />
        )}

        <Input
          placeholder="ウォーターマークのテキスト"
          value={watermarkText}
          onChange={(e) => setWatermarkText(e.target.value)}
        />

        <div>
          <p>不透明度: {opacity}%</p>
          <Slider
            min={0}
            max={100}
            value={opacity}
            onChange={setOpacity}
          />
        </div>

        <div>
          <p>フォントサイズ: {fontSize}px</p>
          <Slider
            min={10}
            max={100}
            value={fontSize}
            onChange={setFontSize}
          />
        </div>

        <div>
          <p>角度: {angle}°</p>
          <Slider
            min={0}
            max={360}
            value={angle}
            onChange={setAngle}
          />
        </div>

        <Space>
          <Button onClick={() => setPosition('top')}>上</Button>
          <Button onClick={() => setPosition('center')}>中央</Button>
          <Button onClick={() => setPosition('bottom')}>下</Button>
        </Space>
      </Space>
    </div>
  );
}; 