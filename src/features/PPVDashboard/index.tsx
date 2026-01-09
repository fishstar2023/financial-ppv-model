import React, { useState, useEffect, useCallback } from 'react';

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
    if (score >= 0.8) return '#22c55e';
    if (score >= 0.6) return '#eab308';
    if (score >= 0.4) return '#f97316';
    return '#ef4444';
  };

  const getStatusEmoji = (status) => {
    if (status.includes('HEALTHY')) return '🟢';
    if (status.includes('MODERATE')) return '🟡';
    if (status.includes('WARNING')) return '🟠';
    return '🔴';
  };

  const renderProgressBar = (value, label) => {
    const color = getStatusColor(value);
    return (
      <div style={{ marginBottom: 12 }} key={label}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color }}>{(value * 100).toFixed(0)}%</span>
        </div>
        <div style={{
          height: 8,
          background: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${value * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>
    );
  };

  const renderBig5Chart = () => {
    if (!metrics?.trait_summary) return null;

    const big5Keys = ['big5_openness', 'big5_conscientiousness', 'big5_extraversion', 'big5_agreeableness', 'big5_neuroticism'];
    const labels = ['O', 'C', 'E', 'A', 'N'];
    const fullLabels = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];

    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
        {big5Keys.map((key, idx) => {
          const trait = metrics.trait_summary[key];
          if (!trait || trait.type !== 'continuous') return null;

          const mean = trait.mean || 50;
          const std = trait.std || 0;
          const height = (mean / 100) * 100;

          return (
            <div key={key} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 100,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>
                  {mean.toFixed(0)}
                </div>
                <div style={{
                  width: 30,
                  height: `${height}%`,
                  background: `linear-gradient(to top, #3b82f6, #60a5fa)`,
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
                    background: '#94a3b8'
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }} title={fullLabels[idx]}>
                {labels[idx]}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDecisionStylePie = () => {
    if (!metrics?.trait_summary?.decision_primary) return null;

    const dist = metrics.trait_summary.decision_primary.distribution || {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const colors = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'];

    let cumulative = 0;
    const segments = Object.entries(dist).map(([style, value], idx) => {
      const start = cumulative;
      cumulative += (value / total) * 360;
      return { style, value, start, end: cumulative, color: colors[idx % colors.length] };
    });

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
        <div style={{ fontSize: 11 }}>
          {segments.map((seg, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, background: seg.color, borderRadius: 2 }} />
              <span>{seg.style}: {(seg.value * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: 24,
      maxWidth: 1200,
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            PPV 多樣性監測儀表板
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
            Persona Personality Variance - 即時多樣性監測
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 14
            }}
          >
            <option value="all">全部 Personas</option>
            <option value="vietnam">Vietnam Interview</option>
            <option value="vietnam2">Observer Notes</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自動刷新
          </label>

          <button
            onClick={fetchMetrics}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {loading ? '載入中...' : '刷新'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#dc2626',
          marginBottom: 24
        }}>
          錯誤: {error}
        </div>
      )}

      {metrics && (
        <>
          {/* Status Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 24
          }}>
            <div style={{
              padding: 20,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>
                {getStatusEmoji(metrics.diversity_health.status)}
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: getStatusColor(metrics.diversity_health.overall_score)
              }}>
                {(metrics.diversity_health.overall_score * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>整體健康度</div>
            </div>

            <div style={{
              padding: 20,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
                {metrics.total_personas}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>受訪者總數</div>
            </div>

            <div style={{
              padding: 20,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
                {metrics.combined_metrics.ess}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                ESS ({(metrics.combined_metrics.ess_ratio * 100).toFixed(0)}%)
              </div>
            </div>

            <div style={{
              padding: 20,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>
                {metrics.combined_metrics.mean_min_distance.toFixed(3)}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>Mean Min-Distance</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Component Scores */}
              <div style={{
                padding: 20,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                  組件分數
                </h3>
                {Object.entries(metrics.diversity_health.component_scores).map(([key, value]) => (
                  renderProgressBar(value, key.toUpperCase())
                ))}
              </div>

              {/* Big5 Distribution */}
              <div style={{
                padding: 20,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                  Big5 人格特質分布
                </h3>
                {renderBig5Chart()}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  marginTop: 12,
                  fontSize: 11,
                  color: '#666'
                }}>
                  <span>μ = 平均值</span>
                  <span>| = 標準差</span>
                </div>
              </div>

              {/* Entropy Analysis */}
              <div style={{
                padding: 20,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                  熵分析
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>
                      {metrics.core_metrics.min_entropy.toFixed(3)}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>最小熵</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>
                      {metrics.core_metrics.mean_entropy.toFixed(3)}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>平均熵</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      {metrics.core_metrics.entropy_threshold_met ? '✅' : '❌'}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>閾值達標</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Decision Style */}
              <div style={{
                padding: 20,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                  決策風格分布
                </h3>
                {renderDecisionStylePie()}
              </div>

              {/* Warnings */}
              {metrics.diversity_health.warnings.length > 0 && (
                <div style={{
                  padding: 20,
                  background: '#fffbeb',
                  borderRadius: 12,
                  border: '1px solid #fcd34d'
                }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
                    警告
                  </h3>
                  {metrics.diversity_health.warnings.map((warning, idx) => (
                    <div key={idx} style={{ fontSize: 13, marginBottom: 8, color: '#92400e' }}>
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {/* Conclusion */}
              <div style={{
                padding: 20,
                background: metrics.diversity_health.is_real_diversity ? '#f0fdf4' : '#fef2f2',
                borderRadius: 12,
                border: `1px solid ${metrics.diversity_health.is_real_diversity ? '#86efac' : '#fecaca'}`
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
                  結論
                </h3>
                <div style={{ fontSize: 14 }}>
                  {metrics.diversity_health.is_real_diversity ? (
                    <>
                      <div style={{ color: '#166534', fontWeight: 600 }}>
                        ✅ 多樣性為【真實多樣性】
                      </div>
                      <div style={{ color: '#15803d', marginTop: 4 }}>
                        Big5, Risk Profile 等核心維度分布良好
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: '#991b1b', fontWeight: 600 }}>
                        ❌ 可能存在【假多樣性】
                      </div>
                      <div style={{ color: '#b91c1c', marginTop: 4 }}>
                        需要增加 Core traits 的變異
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Last Updated */}
              <div style={{
                padding: 12,
                background: '#f3f4f6',
                borderRadius: 8,
                fontSize: 12,
                color: '#6b7280',
                textAlign: 'center'
              }}>
                最後更新: {lastUpdated?.toLocaleTimeString('zh-TW')}
                {autoRefresh && ' (每 10 秒自動刷新)'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PPVDashboard;
