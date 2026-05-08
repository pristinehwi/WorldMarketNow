import React, { useState } from 'react';

// ── 색상 상수 ──────────────────────────────────────────────
const C = {
  bg:        '#080810',
  bgCard:    '#0d0d1f',
  bgHover:   '#111128',
  border:    '#2a2a48',
  borderDim: '#1a1a32',
  text:      '#f0f0ff',
  textMid:   '#c8c8f0',
  textDim:   '#a0a0d0',
  textFaint: '#7070a8',
  up:        '#e06040',
  dn:        '#4a8fe8',
  neutral:   '#e0b030',
  us:        '#6a9eff',
  kr:        '#5ecf95',
  jp:        '#cc70ff',
  de:        '#e0b030',
  gb:        '#ff7878',
};

const COUNTRY_COLOR = { US: C.us, KR: C.kr, JP: C.jp, DE: C.de, GB: C.gb };
const COUNTRY_FLAG  = { US: '🇺🇸', KR: '🇰🇷', JP: '🇯🇵', DE: '🇩🇪', GB: '🇬🇧' };

// ── 유틸 ──────────────────────────────────────────────────
const fmt  = (v, d = 3) => v != null ? parseFloat(v).toFixed(d) + '%' : '—';
const fmtT = (v) => v != null ? (v / 1e6).toFixed(2) + 'T' : '—';
const fmtRRP = (v) => {
  if (v == null) return '—';
  if (v < 0.1) return `${(v * 1000).toFixed(0)}M`;
  return `${v.toFixed(2)}B`;
};
const fmtChg = (v) => {
  if (v == null) return null;
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${v > 0 ? '+' : ''}${(v / 1e6).toFixed(3)}T`;
  if (abs >= 1e3) return `${v > 0 ? '+' : ''}${(v / 1e3).toFixed(1)}B`;
  return `${v > 0 ? '+' : ''}${v.toFixed(0)}M`;
};

function DeltaBadge({ now, prev }) {
  if (now == null || prev == null) return null;
  const d = parseFloat(now) - parseFloat(prev);
  const isUp = d > 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: isUp ? C.up : C.dn, marginLeft: 6 }}>
      {isUp ? '▲' : '▼'} {Math.abs(d).toFixed(2)}%
    </span>
  );
}

// ── 통합 한/미 커브 차트 (공통 만기 기준) ─────────────────
const COMMON_TENORS = [1, 3, 5, 10, 20, 30];
const TENOR_LABELS  = ['1Y', '3Y', '5Y', '10Y', '20Y', '30Y'];
const US_TENOR_MAP  = { 1: 'DGS1', 3: 'DGS5', 5: 'DGS5', 10: 'DGS10', 20: 'DGS20', 30: 'DGS30' };
// 미국 공통만기 매핑: 3Y → DGS2 근사, 실제 키
const US_KEY_MAP = {
  1:  'DGS1',
  3:  'DGS2',   // 3Y 없으므로 2Y 근사 표시
  5:  'DGS5',
  10: 'DGS10',
  20: 'DGS20',
  30: 'DGS30',
};

function CombinedCurveChart({
  usSeries, krSeries,
  showUS, showKR,
  comparePeriod,
  width = 520, height = 130,
}) {
  if (!usSeries && !krSeries) return <div className="mp-chart-empty">데이터 없음</div>;

  // 히스토리 기반 과거값 추출 (US: date 기반, KR: date 기반)
  const getPastUS = (tenor, period) => {
    const key = US_KEY_MAP[tenor];
    const s = usSeries?.[key];
    if (!s?.history?.length) return null;
    const idx = { '1w': -6, '2w': -11, '1m': -22, '3m': -65 }[period];
    const h = s.history;
    const target = h[Math.max(0, h.length + idx)];
    return target?.value ?? null;
  };
  const getPastKR = (tenor, period) => {
    const s = krSeries?.[tenor];
    if (!s?.history?.length) return null;
    const idx = { '1w': -6, '2w': -11, '1m': -22, '3m': -65 }[period];
    const h = s.history;
    const target = h[Math.max(0, h.length + idx)];
    return target?.value ?? null;
  };

  // 현재 커브 포인트
  const usNow = COMMON_TENORS.map(t => usSeries?.[US_KEY_MAP[t]]?.latest?.value ?? null);
  const krNow = COMMON_TENORS.map(t => krSeries?.[t]?.latest?.value ?? null);

  // 과거 커브
  const usPast = comparePeriod !== 'none'
    ? COMMON_TENORS.map(t => getPastUS(t, comparePeriod))
    : null;
  const krPast = comparePeriod !== 'none'
    ? COMMON_TENORS.map(t => getPastKR(t, comparePeriod))
    : null;

  const allVals = [
    ...(showUS ? usNow : []),
    ...(showKR ? krNow : []),
    ...(showUS && usPast ? usPast : []),
    ...(showKR && krPast ? krPast : []),
  ].filter(v => v != null);

  if (!allVals.length) return <div className="mp-chart-empty">데이터 없음</div>;

  const maxV = Math.max(...allVals) + 0.25;
  const minV = Math.max(0, Math.min(...allVals) - 0.25);
  const range = maxV - minV || 1;

  const PAD_L = 38, PAD_R = 12, PAD_T = 24, PAD_B = 28;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const cx = (i) => PAD_L + (i / (COMMON_TENORS.length - 1)) * W;
  const cy = (v) => PAD_T + H - ((v - minV) / range) * H;

  const pathD = (vals) => {
    const pts = vals.map((v, i) => v != null ? [cx(i), cy(v)] : null).filter(Boolean);
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  };

  const gridVals = Array.from({ length: 5 }, (_, i) => minV + (i / 4) * range);

  // 범례
  const legends = [
    showUS && { color: C.us,  label: '미국 (현재)', dash: false },
    showUS && usPast && comparePeriod !== 'none' && { color: C.us, label: `미국 ${periodLabel(comparePeriod)} 전`, dash: true },
    showKR && { color: C.kr,  label: '한국 (현재)', dash: false },
    showKR && krPast && comparePeriod !== 'none' && { color: C.kr, label: `한국 ${periodLabel(comparePeriod)} 전`, dash: true },
  ].filter(Boolean);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {/* 그리드 */}
      {gridVals.map((v, i) => {
        const y = cy(v);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y}
              stroke={C.borderDim} strokeWidth={0.5} />
            <text x={PAD_L - 5} y={y + 3.5} fill={C.textDim}
              fontSize={10} textAnchor="end">{v.toFixed(2)}</text>
          </g>
        );
      })}
      {/* X축 레이블 */}
      {TENOR_LABELS.map((lbl, i) => (
        <text key={lbl} x={cx(i)} y={height - 8}
          fill={C.textDim} fontSize={11} textAnchor="middle" fontWeight={500}>{lbl}</text>
      ))}
      {/* 과거 커브 */}
      {showUS && usPast && (
        <path d={pathD(usPast)} fill="none"
          stroke={C.us} strokeWidth={1} strokeDasharray="5 3" opacity={0.45} />
      )}
      {showKR && krPast && (
        <path d={pathD(krPast)} fill="none"
          stroke={C.kr} strokeWidth={1} strokeDasharray="5 3" opacity={0.45} />
      )}
      {/* 현재 커브 */}
      {showUS && (
        <>
          <path d={pathD(usNow)} fill="none" stroke={C.us} strokeWidth={2} />
          {usNow.map((v, i) => v != null && (
            <circle key={i} cx={cx(i)} cy={cy(v)} r={3} fill={C.us} />
          ))}
        </>
      )}
      {showKR && (
        <>
          <path d={pathD(krNow)} fill="none" stroke={C.kr} strokeWidth={2} />
          {krNow.map((v, i) => v != null && (
            <circle key={i} cx={cx(i)} cy={cy(v)} r={3} fill={C.kr} />
          ))}
        </>
      )}
      {/* 범례 */}
      {legends.map((lg, i) => (
        <g key={i} transform={`translate(${PAD_L + i * 80}, ${PAD_T - 10})`}>
          <line x1={0} y1={0} x2={16} y2={0}
            stroke={lg.color} strokeWidth={lg.dash ? 1 : 2}
            strokeDasharray={lg.dash ? '5 3' : undefined}
            opacity={lg.dash ? 0.55 : 1} />
          <text x={20} y={3.5} fill={lg.color} fontSize={8.5}>{lg.label}</text>
        </g>
      ))}
    </svg>
  );
}

function periodLabel(p) {
  return { '1w': '1주', '2w': '2주', '1m': '1개월', '3m': '3개월' }[p] || p;
}

// ── 스프레드 게이지 ────────────────────────────────────────
function SpreadGauge({ label, value, range = [-2, 3], color }) {
  if (value == null) return null;
  const min = range[0], max = range[1];
  const zeroPct = ((0 - min) / (max - min)) * 100;
  const valPct  = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isInv = value < 0;
  return (
    <div className="mp-gauge">
      <div className="mp-gauge-label">{label}</div>
      <div className="mp-gauge-track">
        <div className="mp-gauge-zero" style={{ left: `${zeroPct}%` }} />
        <div className="mp-gauge-fill" style={{
          width:  `${Math.abs(valPct - zeroPct)}%`,
          left:   isInv ? `${valPct}%` : `${zeroPct}%`,
          background: isInv ? C.up : (color || C.dn),
        }} />
      </div>
      <div className="mp-gauge-value" style={{ color: isInv ? C.up : (color || C.dn) }}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}%p
        {isInv && <span style={{ fontSize: 9, marginLeft: 4 }}>역전</span>}
      </div>
    </div>
  );
}

// ── 연준 유동성 미니 차트 (시작/끝 날짜 포함) ──────────────
function FedMiniChart({ history, color, width = 220, height = 52 }) {
  if (!history?.length) return null;
  const data = history.slice(-26);
  const vals = data.map(h => h.value);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV || 1;

  const PAD_L = 4, PAD_R = 4, PAD_T = 4, PAD_B = 14;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const cx = (i) => PAD_L + (i / (data.length - 1)) * W;
  const cy = (v) => PAD_T + H - ((v - minV) / range) * H;
  const d  = data.map((h, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(h.value).toFixed(1)}`).join(' ');

  const startDate = data[0]?.date?.slice(2, 7);   // "YY-MM"
  const endDate   = data[data.length - 1]?.date?.slice(2, 7);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 52 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.85} />
      <circle cx={cx(data.length - 1)} cy={cy(vals[vals.length - 1])} r={2.5} fill={color} />
      {startDate && (
        <text x={PAD_L} y={height - 2} fill={C.textFaint} fontSize={7.5}>{startDate}</text>
      )}
      {endDate && (
        <text x={width - PAD_R} y={height - 2} fill={C.textFaint} fontSize={7.5} textAnchor="end">{endDate}</text>
      )}
    </svg>
  );
}

// ── 글로벌 10Y 바 차트 ────────────────────────────────────
function GlobalBarChart({ series, width = 400, height = 140 }) {
  const points = Object.entries(series)
    .filter(([, v]) => !v.error && v.latest?.value)
    .sort((a, b) => b[1].latest.value - a[1].latest.value)
    .map(([country, info]) => ({
      country, value: info.latest.value, color: COUNTRY_COLOR[country] || '#888'
    }));

  if (!points.length) return <div className="mp-chart-empty">데이터 없음</div>;

  const maxV = Math.max(...points.map(p => p.value)) * 1.08;
  const minV = Math.max(0, Math.min(...points.map(p => p.value)) * 0.92);
  const range = maxV - minV || 1;

  const PAD_L = 8, PAD_R = 8, PAD_T = 8, PAD_B = 32;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;
  const barW = Math.floor(W / points.length) - 10;
  const barX = (i) => PAD_L + i * (W / points.length) + 5;
  const barH = (v) => Math.max(4, ((v - minV) / range) * H);
  const barY = (v) => PAD_T + H - barH(v);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {[0.25, 0.5, 0.75, 1].map(r => {
        const y = PAD_T + H - r * H;
        const v = (minV + r * range).toFixed(2);
        return (
          <g key={r}>
            <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y}
              stroke={C.borderDim} strokeWidth={0.5} />
            <text x={PAD_L - 2} y={y + 3} fill={C.textFaint} fontSize={8} textAnchor="end">{v}</text>
          </g>
        );
      })}
      {points.map((p, i) => (
        <g key={p.country}>
          <rect x={barX(i)} y={barY(p.value)} width={barW} height={barH(p.value)}
            fill={p.color} opacity={0.75} rx={2} />
          <text x={barX(i) + barW / 2} y={barY(p.value) - 5}
            fill={p.color} fontSize={9.5} textAnchor="middle" fontWeight={600}>
            {p.value.toFixed(2)}
          </text>
          <text x={barX(i) + barW / 2} y={height - 16}
            fill={C.textMid} fontSize={11} textAnchor="middle">{COUNTRY_FLAG[p.country]}</text>
          <text x={barX(i) + barW / 2} y={height - 4}
            fill={C.textDim} fontSize={8.5} textAnchor="middle">{p.country}</text>
        </g>
      ))}
    </svg>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function MacroPanel({ yieldCurve, fedBalance }) {
  const [showUS,  setShowUS]  = useState(true);
  const [showKR,  setShowKR]  = useState(true);
  const [comparePeriod, setComparePeriod] = useState('1m');
  const [curveView, setCurveView] = useState('combined'); // 'combined' | 'global'

  const usCurve   = yieldCurve?.us_curve;
  const krCurve   = yieldCurve?.kr_curve;
  const global10y = yieldCurve?.global_10y;
  const fed       = fedBalance;

  const walcl = fed?.series?.WALCL;
  const tga   = fed?.series?.WTREGEN;
  const rrp   = fed?.series?.RRPONTSYD;
  const resv  = fed?.series?.WRESBAL;
  const netLiq = fed?.net_liquidity;

  const globalLatestDate = global10y?.common_dates?.slice(-1)[0];

  if (!yieldCurve && !fedBalance) {
    return (
      <div className="macro-placeholder">
        <div className="macro-placeholder-inner">
          <div className="macro-placeholder-icon">◎</div>
          <div className="macro-placeholder-title">데이터 로딩 중</div>
          <div className="macro-placeholder-desc">yield_curve.json · fed_balance.json</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-root">

      {/* ── 헤더 ── */}
      <div className="mp-header">
        <span className="mp-header-title">매크로·금리 패널</span>
        <span className="mp-header-sub">
          {usCurve?.series?.DGS10?.latest?.date && `미국 ${usCurve.series.DGS10.latest.date}`}
          {krCurve?.common_dates?.slice(-1)[0] && ` · 한국 ${krCurve.common_dates.slice(-1)[0]}`}
          {globalLatestDate && ` · 글로벌 ${globalLatestDate}`}
        </span>
      </div>

      {/* ── 섹션 1: 수익률 커브 ── */}
      <div className="mp-section mp-section--card">
        <div className="mp-section-header">
          <span className="mp-section-title">수익률 커브</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 뷰 전환 */}
            <div className="mp-tab-group">
              <button className={`mp-tab ${curveView === 'combined' ? 'active' : ''}`}
                onClick={() => setCurveView('combined')}>한/미 커브</button>
              <button className={`mp-tab ${curveView === 'global' ? 'active' : ''}`}
                onClick={() => setCurveView('global')}>🌍 글로벌 10Y</button>
            </div>
          </div>
        </div>

        {/* 한/미 통합 커브 */}
        {curveView === 'combined' && (
          <>
            <div className="mp-curve-controls">
              {/* 국가 토글 */}
              <div className="mp-toggle-group">
                <button
                  className={`mp-toggle ${showUS ? 'active' : ''}`}
                  style={showUS ? { borderColor: C.us, color: C.us, background: `${C.us}18` } : {}}
                  onClick={() => setShowUS(v => !v)}>
                  🇺🇸 미국
                </button>
                <button
                  className={`mp-toggle ${showKR ? 'active' : ''}`}
                  style={showKR ? { borderColor: C.kr, color: C.kr, background: `${C.kr}18` } : {}}
                  onClick={() => setShowKR(v => !v)}>
                  🇰🇷 한국
                </button>
              </div>
              {/* 비교 기간 */}
              <div className="mp-tab-group mp-tab-group--sm">
                {[
                  { id: 'none', label: '단독' },
                  { id: '1w',  label: '+1주' },
                  { id: '2w',  label: '+2주' },
                  { id: '1m',  label: '+1M' },
                  { id: '3m',  label: '+3M' },
                ].map(o => (
                  <button key={o.id}
                    className={`mp-tab ${comparePeriod === o.id ? 'active' : ''}`}
                    onClick={() => setComparePeriod(o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mp-chart-box">
              <CombinedCurveChart
                usSeries={usCurve?.series}
                krSeries={krCurve?.series}
                showUS={showUS}
                showKR={showKR}
                comparePeriod={comparePeriod}
              />
            </div>

            {/* 한미 금리차 */}
            {showUS && showKR &&
              usCurve?.series?.DGS10?.latest &&
              krCurve?.series?.[10]?.latest && (() => {
                const us10 = usCurve.series.DGS10.latest.value;
                const kr10 = krCurve.series[10].latest.value;
                const diff = (kr10 - us10).toFixed(2);
                return (
                  <div className="mp-kr-us-spread">
                    <span className="mp-kus-label">한미 10Y 금리차</span>
                    <span className="mp-kus-value" style={{ color: diff >= 0 ? C.up : C.dn }}>
                      {diff >= 0 ? '+' : ''}{diff}%p
                    </span>
                    <span className="mp-kus-detail">
                      🇰🇷 {kr10.toFixed(3)}% · 🇺🇸 {us10.toFixed(3)}%
                    </span>
                  </div>
                );
              })()
            }

            {/* 스프레드 게이지 */}
            {usCurve?.spreads && (
              <div className="mp-spread-row">
                <SpreadGauge label="미국 10Y-2Y" value={usCurve.spreads['2Y10Y']?.value} range={[-2, 3]} color={C.us} />
                <SpreadGauge label="미국 10Y-3M" value={usCurve.spreads['3M10Y']?.value} range={[-2, 3]} color={C.us} />
                <SpreadGauge label="버터플라이" value={usCurve.spreads.butterfly?.value} range={[-1, 1]} color={C.neutral} />
              </div>
            )}
          </>
        )}

        {/* 글로벌 10Y */}
        {curveView === 'global' && global10y && (
          <>
            <div className="mp-global-meta">
              공통 기준월: <span style={{ color: C.neutral }}>{globalLatestDate || '—'}</span>
              <span style={{ color: C.textFaint, marginLeft: 8, fontSize: 10 }}>OECD 월별 · 약 2개월 지연</span>
            </div>
            <div className="mp-chart-box">
              <GlobalBarChart series={global10y.series} />
            </div>
            <div className="mp-global-table">
              {Object.entries(global10y.series)
                .filter(([, v]) => !v.error && v.latest)
                .sort((a, b) => b[1].latest.value - a[1].latest.value)
                .map(([country, info]) => {
                  const color = COUNTRY_COLOR[country] || '#888';
                  const prev = info.history?.slice(-2, -1)[0]?.value;
                  return (
                    <div key={country} className="mp-global-row">
                      <span style={{ fontSize: 15 }}>{COUNTRY_FLAG[country] || ''}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color }}>{info.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmt(info.latest.value)}</span>
                      <span style={{ fontSize: 10, color: C.textDim }}>{info.latest.date?.slice(0, 7)}</span>
                      {prev && (
                        <span style={{ fontSize: 10, color: info.latest.value > prev ? C.up : C.dn }}>
                          {info.latest.value > prev ? '▲' : '▼'} {Math.abs(info.latest.value - prev).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* ── 섹션 2: 하단 2컬럼 ── */}
      <div className="mp-bottom-row">

        {/* 실질금리 */}
        <div className="mp-card">
          <div className="mp-card-title">금리 지표 (미국)</div>
          {usCurve?.series && (
            <div className="mp-rate-grid">
              {[
                { label: '10Y', key: 'DGS10' },
                { label: '2Y',  key: 'DGS2'  },
                { label: '1Y',  key: 'DGS1'  },
                { label: '3M',  key: 'DGS3MO'},
              ].map(({ label, key }) => {
                const s = usCurve.series[key];
                if (!s?.latest) return null;
                return (
                  <div key={key} className="mp-rate-item">
                    <span className="mp-rate-label">{label}</span>
                    <span className="mp-rate-val">{fmt(s.latest.value)}</span>
                    <DeltaBadge now={s.latest.value} prev={s.one_month_ago?.value} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 연준 유동성 */}
        <div className="mp-card">
          <div className="mp-card-title">연준 유동성</div>
          {walcl && (
            <div className="mp-fed-grid">
              <div className="mp-fed-item">
                <div className="mp-fed-label">총자산 (WALCL)</div>
                <div className="mp-fed-val">{fmtT(walcl.latest?.value)}</div>
                <FedMiniChart history={walcl.history} color={C.us} />
                {walcl.changes?.week != null && (
                  <div className="mp-fed-chg" style={{ color: walcl.changes.week > 0 ? C.up : C.dn }}>
                    {fmtChg(walcl.changes.week)} (주간)
                  </div>
                )}
              </div>

              {netLiq && (
                <div className="mp-fed-item">
                  <div className="mp-fed-label">순유동성</div>
                  <div className="mp-fed-val" style={{ color: C.kr }}>{fmtT(netLiq.value)}</div>
                  <div className="mp-fed-formula">WALCL − TGA − RRP</div>
                  {tga?.latest && rrp?.latest && (
                    <div className="mp-fed-detail">
                      TGA {fmtT(tga.latest.value)}<br />
                      RRP {fmtRRP(rrp.latest.value)}
                    </div>
                  )}
                </div>
              )}

              {resv?.latest && (
                <div className="mp-fed-item">
                  <div className="mp-fed-label">은행 준비금</div>
                  <div className="mp-fed-val">{fmtT(resv.latest.value)}</div>
                  <FedMiniChart history={resv.history} color={C.neutral} />
                  <div className="mp-fed-chg" style={{
                    color: resv.latest.value < 3000000 ? C.up : C.textDim,
                  }}>
                    {resv.latest.value < 3000000 ? '⚠ 임계 수준 접근' : '정상 수준'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
