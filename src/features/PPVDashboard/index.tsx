import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Statistic,
  Alert,
  Select,
  Switch,
  Button,
  Typography,
  Space,
  Tag,
  Tooltip,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const API_BASE = 'http://localhost:8787';

export const PPVDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [dataSource, setDataSource] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '/api/vietnam_ppv_diversity';
      if (dataSource === 'vietnam2') {
        endpoint = '/api/vietnam2_ppv_diversity';
      } else if (dataSource === 'all') {
        endpoint = '/api/all_ppv_diversity';
      }

      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [dataSource]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchMetrics]);

  const getStatusColor = (score) => {
    if (score >= 0.8) return '#52c41a';
    if (score >= 0.6) return '#faad14';
    if (score >= 0.4) return '#fa8c16';
    return '#f5222d';
  };

  const getProgressStatus = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'normal';
    return 'exception';
  };

  const getStatusTag = (status) => {
    if (status.includes('HEALTHY')) return <Tag color="success">HEALTHY</Tag>;
    if (status.includes('MODERATE')) return <Tag color="warning">MODERATE</Tag>;
    if (status.includes('WARNING')) return <Tag color="orange">WARNING</Tag>;
    return <Tag color="error">CRITICAL</Tag>;
  };

  const renderBig5Chart = () => {
    if (!metrics?.trait_summary) return null;

    const big5Keys = ['big5_openness', 'big5_conscientiousness', 'big5_extraversion', 'big5_agreeableness', 'big5_neuroticism'];
    const labels = ['O', 'C', 'E', 'A', 'N'];
    const fullLabels = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];

    return (
      <Row gutter={8} align="bottom" style={{ height: 120 }}>
        {big5Keys.map((key, idx) => {
          const trait = metrics.trait_summary[key];
          if (!trait || trait.type !== 'continuous') return null;

          const mean = trait.mean || 50;
          const std = trait.std || 0;
          const height = (mean / 100) * 100;

          return (
            <Col key={key} flex={1} style={{ textAlign: 'center' }}>
              <Tooltip title={`${fullLabels[idx]}: ${mean.toFixed(1)} (SD: ${std.toFixed(1)})`}>
                <div style={{
                  height: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center'
                }}>
                  <Text type="secondary" style={{ fontSize: 10, marginBottom: 2 }}>
                    {mean.toFixed(0)}
                  </Text>
                  <div style={{
                    width: 30,
                    height: `${height}%`,
                    background: 'linear-gradient(to top, #1890ff, #69c0ff)',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: -std/2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 2,
                      height: std,
                      background: '#8c8c8c'
                    }} />
                  </div>
                </div>
                <Text strong style={{ fontSize: 11 }}>{labels[idx]}</Text>
              </Tooltip>
            </Col>
          );
        })}
      </Row>
    );
  };

  const renderDecisionStylePie = () => {
    if (!metrics?.trait_summary?.decision_primary) return null;

    const dist = metrics.trait_summary.decision_primary.distribution || {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const colors = ['#1890ff', '#52c41a', '#faad14', '#fa8c16', '#f5222d'];

    let cumulative = 0;
    const segments = Object.entries(dist).map(([style, value], idx) => {
      const start = cumulative;
      cumulative += (value / total) * 360;
      return { style, value, start, end: cumulative, color: colors[idx % colors.length] };
    });

    return (
      <Row gutter={16} align="middle">
        <Col>
          <svg width="80" height="80" viewBox="0 0 100 100">
            {segments.map((seg, idx) => {
              const startAngle = (seg.start - 90) * Math.PI / 180;
              const endAngle = (seg.end - 90) * Math.PI / 180;
              const x1 = 50 + 40 * Math.cos(startAngle);
              const y1 = 50 + 40 * Math.sin(startAngle);
              const x2 = 50 + 40 * Math.cos(endAngle);
              const y2 = 50 + 40 * Math.sin(endAngle);
              const largeArc = seg.end - seg.start > 180 ? 1 : 0;

              return (
                <path
                  key={idx}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={seg.color}
                />
              );
            })}
          </svg>
        </Col>
        <Col>
          <Space direction="vertical" size={2}>
            {segments.map((seg, idx) => (
              <Space key={idx} size={6}>
                <div style={{ width: 10, height: 10, background: seg.color, borderRadius: 2 }} />
                <Text style={{ fontSize: 11 }}>{seg.style}: {(seg.value * 100).toFixed(0)}%</Text>
              </Space>
            ))}
          </Space>
        </Col>
      </Row>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            PPV 多樣性監測儀表板
          </Title>
          <Text type="secondary">
            Persona Personality Variance - 即時多樣性監測
          </Text>
        </Col>

        <Col>
          <Space size="middle">
            <Select
              value={dataSource}
              onChange={setDataSource}
              style={{ width: 160 }}
              options={[
                { value: 'all', label: '全部 Personas' },
                { value: 'vietnam', label: 'Vietnam Interview' },
                { value: 'vietnam2', label: 'Observer Notes' },
              ]}
            />

            <Space>
              <Text>自動刷新</Text>
              <Switch
                checked={autoRefresh}
                onChange={setAutoRefresh}
                size="small"
              />
            </Space>

            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={fetchMetrics}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert
          message="錯誤"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {loading && !metrics && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}

      {metrics && (
        <>
          {/* Status Overview */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      整體健康度
                      {getStatusTag(metrics.diversity_health.status)}
                    </Space>
                  }
                  value={(metrics.diversity_health.overall_score * 100).toFixed(0)}
                  suffix="%"
                  valueStyle={{ color: getStatusColor(metrics.diversity_health.overall_score) }}
                />
              </Card>
            </Col>

            <Col span={6}>
              <Card>
                <Statistic
                  title="受訪者總數"
                  value={metrics.total_personas}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>

            <Col span={6}>
              <Card>
                <Statistic
                  title={`ESS (${(metrics.combined_metrics.ess_ratio * 100).toFixed(0)}%)`}
                  value={metrics.combined_metrics.ess}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>

            <Col span={6}>
              <Card>
                <Statistic
                  title="Mean Min-Distance"
                  value={metrics.combined_metrics.mean_min_distance.toFixed(3)}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Main Content Grid */}
          <Row gutter={24}>
            {/* Left Column */}
            <Col span={16}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                {/* Component Scores */}
                <Card title="組件分數">
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {Object.entries(metrics.diversity_health.component_scores).map(([key, value]) => (
                      <div key={key}>
                        <Row justify="space-between" style={{ marginBottom: 4 }}>
                          <Text type="secondary">{key.toUpperCase()}</Text>
                          <Text strong style={{ color: getStatusColor(value) }}>
                            {(value * 100).toFixed(0)}%
                          </Text>
                        </Row>
                        <Progress
                          percent={value * 100}
                          status={getProgressStatus(value)}
                          showInfo={false}
                          strokeColor={getStatusColor(value)}
                        />
                      </div>
                    ))}
                  </Space>
                </Card>

                {/* Big5 Distribution */}
                <Card title="Big5 人格特質分布">
                  {renderBig5Chart()}
                  <Row justify="space-around" style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>μ = 平均值</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>| = 標準差</Text>
                  </Row>
                </Card>

                {/* Entropy Analysis */}
                <Card title="熵分析">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="最小熵"
                        value={metrics.core_metrics.min_entropy.toFixed(3)}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="平均熵"
                        value={metrics.core_metrics.mean_entropy.toFixed(3)}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="閾值達標"
                        value={metrics.core_metrics.entropy_threshold_met ? '達標' : '未達標'}
                        prefix={metrics.core_metrics.entropy_threshold_met ?
                          <CheckCircleFilled style={{ color: '#52c41a' }} /> :
                          <CloseCircleFilled style={{ color: '#f5222d' }} />
                        }
                      />
                    </Col>
                  </Row>
                </Card>
              </Space>
            </Col>

            {/* Right Column */}
            <Col span={8}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                {/* Decision Style */}
                <Card title="決策風格分布">
                  {renderDecisionStylePie()}
                </Card>

                {/* Warnings */}
                {metrics.diversity_health.warnings.length > 0 && (
                  <Alert
                    message="警告"
                    description={
                      <Space direction="vertical" size={4}>
                        {metrics.diversity_health.warnings.map((warning, idx) => (
                          <Text key={idx} style={{ fontSize: 13 }}>
                            <WarningFilled style={{ color: '#faad14', marginRight: 8 }} />
                            {warning}
                          </Text>
                        ))}
                      </Space>
                    }
                    type="warning"
                    showIcon={false}
                  />
                )}

                {/* Conclusion */}
                <Alert
                  message="結論"
                  description={
                    metrics.diversity_health.is_real_diversity ? (
                      <Space direction="vertical" size={4}>
                        <Text strong style={{ color: '#389e0d' }}>
                          <CheckCircleFilled style={{ marginRight: 8 }} />
                          多樣性為【真實多樣性】
                        </Text>
                        <Text style={{ color: '#52c41a' }}>
                          Big5, Risk Profile 等核心維度分布良好
                        </Text>
                      </Space>
                    ) : (
                      <Space direction="vertical" size={4}>
                        <Text strong style={{ color: '#cf1322' }}>
                          <CloseCircleFilled style={{ marginRight: 8 }} />
                          可能存在【假多樣性】
                        </Text>
                        <Text style={{ color: '#f5222d' }}>
                          需要增加 Core traits 的變異
                        </Text>
                      </Space>
                    )
                  }
                  type={metrics.diversity_health.is_real_diversity ? 'success' : 'error'}
                  showIcon={false}
                />

                {/* Last Updated */}
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    最後更新: {lastUpdated?.toLocaleTimeString('zh-TW')}
                    {autoRefresh && ' (每 10 秒自動刷新)'}
                  </Text>
                </Card>
              </Space>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default PPVDashboard;
