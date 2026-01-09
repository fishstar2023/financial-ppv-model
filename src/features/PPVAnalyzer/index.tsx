import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Alert,
  Row,
  Col,
  Typography,
  Space,
  Statistic,
  Tag,
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { PPVService } from '../../services/ppv';
import { PPVInstance } from '../../types/ppv';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface PPVAnalyzerProps {
  onAnalysisComplete: (data: PPVInstance) => void;
}

export const PPVAnalyzer: React.FC<PPVAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [chatLog, setChatLog] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PPVInstance | null>(null);

  const handleAnalyze = async () => {
    if (!chatLog.trim()) return;
    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const data = await PPVService.extractPPV(chatLog);
      setPreviewData(data);
      onAnalysisComplete(data);
    } catch (err) {
      console.error(err);
      setError('分析失敗：請確認後端 Server (Port 8000) 已啟動');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Header */}
        <div>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>
              <ExperimentOutlined style={{ marginRight: 8 }} />
              建立您的數位分身
            </Title>
            <Tag color="blue">Step 1: 人格建模</Tag>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            這是產生數位孿生的第一步。請貼上您過去的對話紀錄（例如 LINE 或 Email），AI 將分析您的語言風格、風險偏好與價值觀。
          </Text>
        </div>

        {/* Input */}
        <TextArea
          rows={6}
          placeholder={`建議輸入範例：
User: 我最近不敢買股票，感覺風險好大...
AI: 為什麼呢？
User: 因為我上次賠了很多錢，所以現在投資變得很保守，只敢存定存，連 ETF 都不敢碰。`}
          value={chatLog}
          onChange={(e) => setChatLog(e.target.value)}
          disabled={loading}
        />

        {/* Error */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
          />
        )}

        {/* Button */}
        <Button
          type="primary"
          size="large"
          onClick={handleAnalyze}
          loading={loading}
          disabled={!chatLog.trim()}
          block
        >
          {loading ? 'AI 正在分析人格大腦...' : '開始分析並建立分身'}
        </Button>

        {/* Results */}
        {previewData && (
          <Alert
            message={
              <Space>
                <CheckCircleFilled style={{ color: '#52c41a' }} />
                <Text strong style={{ color: '#52c41a' }}>模型建立完成！</Text>
              </Space>
            }
            description={
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Statistic
                    title="開放性 (Openness)"
                    value={previewData.big5.openness}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="盡責性 (Conscientiousness)"
                    value={previewData.big5.conscientiousness}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="風險承受 (Risk)"
                    value={previewData.risk_profile?.overall ?? 'N/A'}
                    valueStyle={{ fontSize: 20, color: '#1890ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="外向性 (Extraversion)"
                    value={previewData.big5.extraversion}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
              </Row>
            }
            type="success"
          />
        )}
      </Space>
    </Card>
  );
};
