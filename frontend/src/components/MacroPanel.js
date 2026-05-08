import React, { useState, useEffect, useRef } from 'react';

// ── 색상 상수 ──────────────────────────────────────────────
const C = {
  bg:        '#080810',
  bgCard:    '#0d0d1f',
  bgHover:   '#111128',
  border:    '#1e1e38',
  borderDim: '#141428',
  text:      '#f0f0ff',
  textMid:   '#9090c0',
  textDim:   '#4a4a7a',
  up:        '#d85a30',
  dn:        '#3a7fd8',
  neutral:   '#c9a227',
  us:        '#5b8dee',
  kr:        '#52b788',
  jp:        '#bf5fff',
  de:        '#c9a227',
  gb:        '#ff6b6b',
};

const COUNTRY_COLOR = { US: C.us, KR: C.kr, JP: C.jp, DE: C.de, GB: C.gb };
const COUNTRY_FLAG  = { US: '🇺🇸', KR: '🇰🇷', JP: '🇯🇵', DE: '🇩🇪', GB: '🇬🇧' };

// ── 유틸 ──────────────────────────────────────────────────
const fmt = (v, d = 3) => v != null ? parseFloat(v).toFixed(d) + '%' : '—';
const fmtT = (v) => v != null ? (v / 1e6).toFixed(2) + 'T' : '—'; // millions → trillions

function DeltaBadge({ now, prev, unit = '%' }) {
  if (now == null || prev == null) return null;
  const d = parseFloat(now) - parseFloat(prev);
  const isUp = d > 0;
  return (
    <span className="mp-delta" style={{ color: isUp ? C.up : C.dn }}>
      {isUp ? '▲' : '▼'} {Math.abs(d).toFixed(2)}{unit}
    </span>
  );
}

// ── SVG 커브 차트 ──────────────────────────────────────────
function CurveChart({ series, dates, width = 480, height = 160 }) {
  if (!series || !dates || !dates.length) return (
    <div className="mp-chart-empty">데이터 준비 중</div>
  );

  // 각 국가별로 해당 날짜의 값 추출
  const points = Object.entries(series).map(([country, info]) => {
    if (info.error || !info.history?.length) return null;
    const matched = dates.map(d => {
      const found = info.history.find(h => h.date === d || h.date.slice(0, 7) === d.slice(0, 7));
      return found ? found.value : null;
    }).filter(v => v != null);
    if (!matched.length) return null;
    return { country, value: matched[matched.length - 1], color: COUNTRY_COLOR[country] || '#888' };
  }).filter(Boolean);

  if (!points.length) return <div className="mp-chart-empty">데이터 없음</div>;

  const maxV = Math.max(...points.map(p => p.value)) * 1.1;
  const minV = Math.max(0, Math.min(...points.map(p => p.value)) * 0.9);
  const range = maxV - minV || 1;

  const barW = Math.floor((width - 60) / points.length) - 8;
  const barX = (i) => 40 + i * (barW + 8);
  const barH = (v) => Math.max(4, ((v - minV) / range) * (height - 40));
  const barY = (v) => height - 20 - barH(v);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {/* 그리드 */}
      {[0.25, 0.5, 0.75, 1].map(r => {
        const y = height - 20 - r * (height - 40);
        const v = (minV + r * range).toFixed(2);
        return (
          <g key={r}>
            <line x1={36} y1={y} x2={width - 8} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={32} y={y + 4} fill={C.textDim} fontSize={9} textAnchor="end">{v}</text>
          </g>
        );
      })}
      {/* 바 */}
      {points.map((p, i) => (
        <g key={p.country}>
          <rect
            x={barX(i)} y={barY(p.value)}
            width={barW} height={barH(p.value)}
            fill={p.color} opacity={0.8} rx={2}
          />
          <text x={barX(i) + barW / 2} y={barY(p.value) - 4}
            fill={p.color} fontSize={9} textAnchor="middle" fontWeight={600}>
            {p.value.toFixed(2)}
          </text>
          <text x={barX(i) + barW / 2} y={height - 6}
            fill={C.textMid} fontSize={9} textAnchor="middle">
            {COUNTRY_FLAG[p.country]} {p.country}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── 수익률 커브 SVG (선 그래프) ────────────────────────────
function YieldCurveChart({ series, dateKey, compareKeys, width = 480, height = 180 }) {
  // series: { DGS1MO: { latest, one_month_ago, three_months_ago, history }, ... }
  // dateKey: 'latest' | 'one_month_ago' | 'three_months_ago'
  // compareKeys: 추가 비교선들

  const TENORS = ['DGS1MO','DGS3MO','DGS6MO','DGS1','DGS2','DGS5','DGS7','DGS10','DGS20','DGS30'];
  const TENOR_LABELS = ['1M','3M','6M','1Y','2Y','5Y','7Y','10Y','20Y','30Y'];

  const extractCurve = (key) => TENORS.map(t => series[t]?.[key]?.value ?? null);

  const curves = [
    { key: dateKey, label: dateKey === 'latest' ? '현재' : dateKey === 'one_month_ago' ? '1개월 전' : '3개월 전', color: C.us, dash: false },
    ...(compareKeys || []).map((k, i) => ({
      key: k,
      label: k === 'one_month_ago' ? '1M 전' : '3M 전',
      color: [C.neutral, C.textMid][i] || C.textMid,
      dash: true,
    })),
  ].map(c => ({ ...c, values: extractCurve(c.key) }))
   .filter(c => c.values.some(v => v != null));

  if (!curves.length) return <div className="mp-chart-empty">데이터 없음</div>;

  const allVals = curves.flatMap(c => c.values.filter(v => v != null));
  const maxV = Math.max(...allVals) + 0.3;
  const minV = Math.max(0, Math.min(...allVals) - 0.3);
  const range = maxV - minV || 1;

  const PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 24;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const cx = (i) => PAD_L + (i / (TENORS.length - 1)) * W;
  const cy = (v) => PAD_T + H - ((v - minV) / range) * H;

  const pathD = (vals) => {
    const pts = vals.map((v, i) => v != null ? [cx(i), cy(v)] : null).filter(Boolean);
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  };

  const gridVals = Array.from({ length: 5 }, (_, i) => minV + (i / 4) * range);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {/* 그리드 */}
      {gridVals.map((v, i) => {
        const y = cy(v);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={PAD_L - 4} y={y + 3} fill={C.textDim} fontSize={8} textAnchor="end">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {/* X축 레이블 */}
      {TENOR_LABELS.map((lbl, i) => (
        <text key={lbl} x={cx(i)} y={height - 4} fill={C.textDim} fontSize={8} textAnchor="middle">
          {lbl}
        </text>
      ))}
      {/* 커브 선 */}
      {curves.map(c => (
        <path
          key={c.key}
          d={pathD(c.values)}
          fill="none"
          stroke={c.color}
          strokeWidth={c.dash ? 1 : 1.8}
          strokeDasharray={c.dash ? '4 3' : undefined}
          opacity={c.dash ? 0.6 : 1}
        />
      ))}
      {/* 현재 커브 포인트 */}
      {curves[0]?.values.map((v, i) => v != null ? (
        <circle key={i} cx={cx(i)} cy={cy(v)} r={2.5} fill={C.us} />
      ) : null)}
      {/* 범례 */}
      {curves.map((c, i) => (
        <g key={c.key} transform={`translate(${PAD_L + i * 72}, ${PAD_T - 2})`}>
          <line x1={0} y1={0} x2={14} y2={0} stroke={c.color} strokeWidth={c.dash ? 1 : 1.8}
            strokeDasharray={c.dash ? '4 3' : undefined} />
          <text x={18} y={3} fill={c.color} fontSize={8}>{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── 연준 유동성 미니 차트 ──────────────────────────────────
function FedMiniChart({ history, color, width = 200, height = 50 }) {
  if (!history?.length) return null;
  const vals = history.slice(-26).map(h => h.value);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV || 1;
  const cx = (i) => (i / (vals.length - 1)) * width;
  const cy = (v) => height - 4 - ((v - minV) / range) * (height - 8);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 40 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
      <circle cx={cx(vals.length - 1)} cy={cy(vals[vals.length - 1])} r={2.5} fill={color} />
    </svg>
  );
}

// ── 스프레드 게이지 ────────────────────────────────────────
function SpreadGauge({ label, value, range = [-2, 3], color }) {
  if (value == null) return null;
  const min = range[0], max = range[1];
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isInverted = value < 0;
  return (
    <div className="mp-gauge">
      <div className="mp-gauge-label">{label}</div>
      <div className="mp-gauge-track">
        <div className="mp-gauge-zero" style={{ left: `${((0 - min) / (max - min)) * 100}%` }} />
        <div className="mp-gauge-fill" style={{
          width: `${Math.abs(pct - ((0 - min) / (max - min)) * 100)}%`,
          left: isInverted ? `${pct}%` : `${((0 - min) / (max - min)) * 100}%`,
          background: isInverted ? C.up : color || C.dn,
        }} />
      </div>
      <div className="mp-gauge-value" style={{ color: isInverted ? C.up : color || C.dn }}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}%p
        {isInverted && <span style={{ fontSize: 9, marginLeft: 4, color: C.up }}>역전</span>}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function MacroPanel({ yieldCurve, fedBalance }) {
  const [curveView, setCurveView]     = useState('us');    // 'us' | 'kr' | 'global'
  const [compareMode, setCompareMode] = useState('1m');    // '1m' | '3m' | 'none'
  const [usDateIdx, setUsDateIdx]     = useState(null);    // null = latest
  const [krDateIdx, setKrDateIdx]     = useState(null);

  // ── 데이터 추출 ──
  const usCurve   = yieldCurve?.us_curve;
  const krCurve   = yieldCurve?.kr_curve;
  const global10y = yieldCurve?.global_10y;
  const fed       = fedBalance;

  // 날짜 목록 (US)
  const usCommonDates = (() => {
    if (!usCurve?.series) return [];
    const sets = Object.values(usCurve.series)
      .filter(s => !s.error && s.history?.length)
      .map(s => new Set(s.history.map(h => h.date)));
    if (!sets.length) return [];
    let common = [...sets[0]];
    for (let i = 1; i < sets.length; i++) common = common.filter(d => sets[i].has(d));
    return common.sort().reverse().slice(0, 30);
  })();

  const krCommonDates = krCurve?.common_dates
    ? [...krCurve.common_dates].reverse().slice(0, 30)
    : [];

  // 선택 날짜 기준 커브 데이터
  const getUsCurveForDate = (dateOrNull) => {
    if (!usCurve?.series) return {};
    if (!dateOrNull) return usCurve.series; // latest 사용
    const TENORS = ['DGS1MO','DGS3MO','DGS6MO','DGS1','DGS2','DGS5','DGS7','DGS10','DGS20','DGS30'];
    const result = {};
    TENORS.forEach(t => {
      const s = usCurve.series[t];
      if (!s || s.error) return;
      const found = s.history?.find(h => h.date === dateOrNull);
      if (found) result[t] = { ...s, latest: { value: found.value, date: found.date } };
    });
    return result;
  };

  // 순유동성 계산
  const netLiq = fed?.net_liquidity;
  const walcl  = fed?.series?.WALCL;
  const tga    = fed?.series?.WTREGEN;
  const rrp    = fed?.series?.RRPONTSYD;
  const resv   = fed?.series?.WRESBAL;

  // 글로벌 10Y 공통 날짜
  const globalCommonDates = global10y?.common_dates || [];
  const globalLatestDate  = globalCommonDates[globalCommonDates.length - 1];

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

  const compareKeys = compareMode === 'none' ? [] :
    compareMode === '1m' ? ['one_month_ago'] : ['one_month_ago', 'three_months_ago'];

  return (
    <div className="mp-root">

      {/* ── 상단 헤더 ── */}
      <div className="mp-header">
        <span className="mp-header-title">매크로·금리 패널</span>
        <span className="mp-header-sub">
          {usCurve?.series?.DGS10?.latest?.date
            ? `미국 ${usCurve.series.DGS10.latest.date}`
            : ''
          }
          {krCurve?.common_dates?.slice(-1)[0]
            ? ` · 한국 ${krCurve.common_dates.slice(-1)[0]}`
            : ''
          }
        </span>
      </div>

      {/* ── 섹션 1: 수익률 커브 ── */}
      <div className="mp-section">
        <div className="mp-section-header">
          <span className="mp-section-title">수익률 커브</span>
          {/* 커브 뷰 선택 */}
          <div className="mp-tab-group">
            {[
              { id: 'us',     label: '🇺🇸 미국' },
              { id: 'kr',     label: '🇰🇷 한국' },
              { id: 'global', label: '🌍 글로벌 10Y' },
            ].map(v => (
              <button key={v.id}
                className={`mp-tab ${curveView === v.id ? 'active' : ''}`}
                onClick={() => setCurveView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* 미국 커브 */}
        {curveView === 'us' && usCurve && (
          <div className="mp-curve-container">
            <div className="mp-curve-controls">
              {/* 날짜 선택 */}
              <select className="mp-select"
                value={usDateIdx ?? ''}
                onChange={e => setUsDateIdx(e.target.value || null)}>
                <option value="">최신 ({usCurve.series?.DGS10?.latest?.date})</option>
                {usCommonDates.slice(1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {/* 비교 모드 */}
              <div className="mp-tab-group mp-tab-group--sm">
                {[
                  { id: 'none', label: '단독' },
                  { id: '1m',   label: '+1M 전' },
                  { id: '3m',   label: '+3M 전' },
                ].map(m => (
                  <button key={m.id}
                    className={`mp-tab ${compareMode === m.id ? 'active' : ''}`}
                    onClick={() => setCompareMode(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <YieldCurveChart
              series={usDateIdx ? getUsCurveForDate(usDateIdx) : usCurve.series}
              dateKey="latest"
              compareKeys={compareKeys}
            />
            {/* 스프레드 요약 */}
            <div className="mp-spread-row">
              <SpreadGauge label="10Y-2Y" value={usCurve.spreads?.['2Y10Y']?.value} range={[-2, 3]} color={C.us} />
              <SpreadGauge label="10Y-3M" value={usCurve.spreads?.['3M10Y']?.value} range={[-2, 3]} color={C.us} />
              <SpreadGauge label="버터플라이" value={usCurve.spreads?.butterfly?.value} range={[-1, 1]} color={C.neutral} />
            </div>
          </div>
        )}

        {/* 한국 커브 */}
        {curveView === 'kr' && krCurve && (
          <div className="mp-curve-container">
            <div className="mp-curve-controls">
              <select className="mp-select"
                value={krDateIdx ?? ''}
                onChange={e => setKrDateIdx(e.target.value || null)}>
                <option value="">최신 ({krCurve.common_dates?.slice(-1)[0]})</option>
                {krCommonDates.slice(1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="mp-tab-group mp-tab-group--sm">
                {[{ id: 'none', label: '단독' }, { id: '1m', label: '+1M 전' }, { id: '3m', label: '+3M 전' }]
                  .map(m => (
                    <button key={m.id}
                      className={`mp-tab ${compareMode === m.id ? 'active' : ''}`}
                      onClick={() => setCompareMode(m.id)}>
                      {m.label}
                    </button>
                  ))}
              </div>
            </div>
            {/* 한국 커브 SVG — tenor 기반 재구성 */}
            <KrCurveChart series={krCurve.series} dateKey={krDateIdx} compareKeys={compareKeys} />

            {/* 한미 금리차 */}
            {usCurve?.series?.DGS10?.latest && krCurve.series?.[10]?.latest && (() => {
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
                    KR {kr10.toFixed(3)}% · US {us10.toFixed(3)}%
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* 글로벌 10Y */}
        {curveView === 'global' && global10y && (
          <div className="mp-curve-container">
            <div className="mp-global-meta">
              공통 기준월: <span style={{ color: C.neutral }}>{globalLatestDate || '—'}</span>
              <span style={{ color: C.textDim, marginLeft: 8, fontSize: 11 }}>
                (OECD 월별 — 약 2개월 지연)
              </span>
            </div>
            <CurveChart series={global10y.series} dates={globalCommonDates} />
            {/* 국가별 상세 수치 */}
            <div className="mp-global-table">
              {Object.entries(global10y.series)
                .filter(([, v]) => !v.error && v.latest)
                .sort((a, b) => b[1].latest.value - a[1].latest.value)
                .map(([country, info]) => {
                  const color = COUNTRY_COLOR[country] || '#888';
                  const prev = info.history?.slice(-2, -1)[0]?.value;
                  return (
                    <div key={country} className="mp-global-row">
                      <span className="mp-global-flag">{COUNTRY_FLAG[country] || ''}</span>
                      <span className="mp-global-country" style={{ color }}>{info.label}</span>
                      <span className="mp-global-val" style={{ color }}>{fmt(info.latest.value)}</span>
                      <DeltaBadge now={info.latest.value} prev={prev} />
                      <span className="mp-global-date">{info.latest.date?.slice(0, 7)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* ── 섹션 2: 실질금리 + 신용스프레드 ── */}
      <div className="mp-section mp-section--row">
        {/* 실질금리 분해 */}
        <div className="mp-card mp-card--half">
          <div className="mp-card-title">실질금리 분해 (미국 10Y)</div>
          {usCurve?.series?.DGS10?.latest && (() => {
            const nom  = usCurve.series.DGS10.latest.value;
            const prev = usCurve.series.DGS10.one_month_ago?.value;
            // DFII10, T10YIE는 macroSummary에서 — props로 받을 수 없으면 근사
            return (
              <div className="mp-decomp">
                <div className="mp-decomp-row">
                  <span className="mp-decomp-label">명목 10Y</span>
                  <span className="mp-decomp-val">{fmt(nom)}</span>
                  <DeltaBadge now={nom} prev={prev} />
                </div>
                <div className="mp-decomp-note">
                  실질금리·기대인플레 세부 분해는<br />
                  FRED DFII10 / T10YIE 연동 예정
                </div>
              </div>
            );
          })()}
        </div>

        {/* 연준 유동성 */}
        <div className="mp-card mp-card--half">
          <div className="mp-card-title">연준 유동성</div>
          {walcl && (
            <div className="mp-fed-grid">
              <div className="mp-fed-item">
                <div className="mp-fed-label">총자산 (WALCL)</div>
                <div className="mp-fed-val">{fmtT(walcl.latest?.value)}</div>
                <FedMiniChart history={walcl.history} color={C.us} />
                <DeltaBadge now={walcl.latest?.value} prev={walcl.history?.slice(-2,-1)[0]?.value} unit="M" />
              </div>
              {netLiq && (
                <div className="mp-fed-item">
                  <div className="mp-fed-label">순유동성</div>
                  <div className="mp-fed-val" style={{ color: C.kr }}>
                    {fmtT(netLiq.value)}
                  </div>
                  <div className="mp-fed-formula">WALCL − TGA − RRP</div>
                  {tga?.latest && rrp?.latest && (
                    <div className="mp-fed-detail">
                      TGA {fmtT(tga.latest.value)} · RRP {(rrp.latest.value / 1000).toFixed(1)}B
                    </div>
                  )}
                </div>
              )}
              {resv?.latest && (
                <div className="mp-fed-item">
                  <div className="mp-fed-label">은행 준비금</div>
                  <div className="mp-fed-val">{fmtT(resv.latest.value)}</div>
                  <FedMiniChart history={resv.history} color={C.neutral} />
                  <div className="mp-fed-detail" style={{
                    color: resv.latest.value < 3000000 ? C.up : C.textDim,
                    fontSize: 10,
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

// ── 한국 커브 차트 (tenor 기반) ────────────────────────────
function KrCurveChart({ series, dateKey, compareKeys, width = 480, height = 180 }) {
  const TENORS = [1, 3, 5, 10, 20, 30];
  const LABELS = ['1Y', '3Y', '5Y', '10Y', '20Y', '30Y'];

  const extractCurve = (historyKey) => TENORS.map(t => {
    const s = series?.[t];
    if (!s || s.error) return null;
    if (historyKey === 'latest') return s.latest?.value ?? null;
    if (historyKey === 'one_month_ago') return s.one_month_ago?.value ?? null;
    if (historyKey === 'three_months_ago') return s.three_months_ago?.value ?? null;
    // 날짜 직접 지정
    return s.history?.find(h => h.date === historyKey)?.value ?? null;
  });

  const curves = [
    { key: dateKey || 'latest', label: !dateKey ? '현재' : dateKey, color: C.kr, dash: false },
    ...(compareKeys || []).map((k, i) => ({
      key: k, label: k === 'one_month_ago' ? '1M 전' : '3M 전',
      color: [C.neutral, C.textMid][i], dash: true,
    })),
  ].map(c => ({ ...c, values: extractCurve(c.key) }))
   .filter(c => c.values.some(v => v != null));

  if (!curves.length) return <div className="mp-chart-empty">한국 커브 데이터 없음</div>;

  const allVals = curves.flatMap(c => c.values.filter(v => v != null));
  const maxV = Math.max(...allVals) + 0.3;
  const minV = Math.max(0, Math.min(...allVals) - 0.3);
  const range = maxV - minV || 1;

  const PAD_L = 36, PAD_R = 12, PAD_T = 18, PAD_B = 24;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const cx = (i) => PAD_L + (i / (TENORS.length - 1)) * W;
  const cy = (v) => PAD_T + H - ((v - minV) / range) * H;
  const pathD = (vals) => {
    const pts = vals.map((v, i) => v != null ? [cx(i), cy(v)] : null).filter(Boolean);
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  };

  const gridVals = Array.from({ length: 5 }, (_, i) => minV + (i / 4) * range);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {gridVals.map((v, i) => {
        const y = cy(v);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={PAD_L - 4} y={y + 3} fill={C.textDim} fontSize={8} textAnchor="end">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {LABELS.map((lbl, i) => (
        <text key={lbl} x={cx(i)} y={height - 4} fill={C.textDim} fontSize={8} textAnchor="middle">
          {lbl}
        </text>
      ))}
      {curves.map(c => (
        <path key={c.key} d={pathD(c.values)} fill="none"
          stroke={c.color} strokeWidth={c.dash ? 1 : 1.8}
          strokeDasharray={c.dash ? '4 3' : undefined} opacity={c.dash ? 0.6 : 1} />
      ))}
      {curves[0]?.values.map((v, i) => v != null ? (
        <circle key={i} cx={cx(i)} cy={cy(v)} r={2.5} fill={C.kr} />
      ) : null)}
      {curves.map((c, i) => (
        <g key={c.key} transform={`translate(${PAD_L + i * 72}, 8)`}>
          <line x1={0} y1={0} x2={14} y2={0} stroke={c.color}
            strokeWidth={c.dash ? 1 : 1.8} strokeDasharray={c.dash ? '4 3' : undefined} />
          <text x={18} y={3} fill={c.color} fontSize={8}>{c.label}</text>
        </g>
      ))}
    </svg>
  );
}
