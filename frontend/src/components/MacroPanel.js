import React, { useState } from 'react';

// ── 색상 상수 ──────────────────────────────────────────────
const C = {
  bg:        '#080810',
  bgCard:    '#0d0d1f',
  bgHover:   '#111128',
  border:    '#2a2a48',
  borderDim: '#1a1a32',
  text:      '#f0f0ff',
  textMid:   '#e0e0ff',
  textDim:   '#c0c0e8',
  textFaint: '#9090c8',
  up:        '#e06040',
  dn:        '#4a8fe8',
  neutral:   '#e0b030',
  us:        '#6aabff',
  kr:        '#5ed898',
  jp:        '#cc70ff',
  de:        '#e0b030',
  gb:        '#ff7878',
};

const COUNTRY_COLOR = { US: C.us, KR: C.kr, JP: C.jp, DE: C.de, GB: C.gb };
const COUNTRY_FLAG  = { US: '🇺🇸', KR: '🇰🇷', JP: '🇯🇵', DE: '🇩🇪', GB: '🇬🇧' };

// ── 유틸 ──────────────────────────────────────────────────
const fmt  = (v, d = 3) => v != null ? parseFloat(v).toFixed(d) + '%' : '—';
const fmtT = (v) => v != null ? '$' + (v / 1e6).toFixed(2) + 'T' : '—';
const fmtRRP = (v) => {
  if (v == null) return '—';
  if (v < 0.1) return `$${(v * 1000).toFixed(0)}M`;
  return `$${v.toFixed(2)}B`;
};
const fmtChg = (v) => {
  if (v == null) return null;
  const abs = Math.abs(v);
  const sign = v > 0 ? '+' : '';
  if (abs >= 1e6) return `${sign}$${(v / 1e6).toFixed(3)}T`;
  if (abs >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}B`;
  return `${sign}$${v.toFixed(0)}M`;
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
  width = 520, height = 110,
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
    showUS && { color: C.us,  label: 'US (현재)', dash: false },
    showUS && usPast && comparePeriod !== 'none' && { color: C.us, label: `US ${periodLabel(comparePeriod)} 전`, dash: true },
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
              fontSize={7.5} textAnchor="end">{v.toFixed(2)}</text>
          </g>
        );
      })}
      {/* X축 레이블 */}
      {TENOR_LABELS.map((lbl, i) => (
        <text key={lbl} x={cx(i)} y={height - 8}
          fill={C.textDim} fontSize={7.5} textAnchor="middle" fontWeight={500}>{lbl}</text>
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

// ── 연준 유동성 미니 차트 ──────────────────────────────────
function FedMiniChart({ history, color, width = 220, height = 52 }) {
  if (!history?.length) return null;
  const data = history.slice(-26);
  const vals = data.map(h => h.value);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV || 1;

  const PAD_L = 4, PAD_R = 4, PAD_T = 4, PAD_B = 16;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const cx = (i) => PAD_L + (i / (data.length - 1)) * W;
  const cy = (v) => PAD_T + H - ((v - minV) / range) * H;
  const d  = data.map((h, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(h.value).toFixed(1)}`).join(' ');

  const startDate = data[0]?.date?.slice(2, 7);
  const endDate   = data[data.length - 1]?.date?.slice(2, 7);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 52 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
      <circle cx={cx(data.length - 1)} cy={cy(vals[vals.length - 1])} r={2.5} fill={color} />
      {startDate && (
        <text x={PAD_L} y={height - 2} fill="#a0a0d0" fontSize={7.5}>{startDate}</text>
      )}
      {endDate && (
        <text x={width - PAD_R} y={height - 2} fill="#a0a0d0" fontSize={7.5} textAnchor="end">{endDate}</text>
      )}
    </svg>
  );
}

// ── 순유동성 히스토리 계산 ─────────────────────────────────
function calcNetLiqHistory(walclH, tgaH, rrpH) {
  if (!walclH?.length || !tgaH?.length) return null;
  const tgaMap = Object.fromEntries(tgaH.map(h => [h.date, h.value]));
  const rrpByWk = {};
  if (rrpH) {
    rrpH.forEach(h => {
      const wk = h.date.slice(0, 7);
      if (!rrpByWk[wk] || h.date > rrpByWk[wk].date) rrpByWk[wk] = h;
    });
  }
  return walclH.map(w => {
    const tga = tgaMap[w.date];
    if (tga == null) return null;
    const rrpBillions = rrpByWk[w.date.slice(0, 7)]?.value ?? 0;
    const rrpMillions = rrpBillions * 1000;
    return { date: w.date, value: w.value - tga - rrpMillions };
  }).filter(Boolean);
}

// ── 스프레드 미니 라인차트 ─────────────────────────────────
function SpreadMiniChart({ s10History, s2History, color, width = 160, height = 36 }) {
  if (!s10History?.length || !s2History?.length) return null;
  const s2Map = Object.fromEntries(s2History.map(h => [h.date, h.value]));
  const spreads = s10History
    .map(h => ({ date: h.date, value: s2Map[h.date] != null ? h.value - s2Map[h.date] : null }))
    .filter(h => h.value != null)
    .slice(-45);
  if (spreads.length < 3) return null;

  const vals = spreads.map(s => s.value);
  const maxV = Math.max(...vals) + 0.1;
  const minV = Math.min(...vals) - 0.1;
  const range = maxV - minV || 1;
  const PAD = 4;
  const W = width - PAD * 2;
  const H = height - PAD * 2;
  const cx = (i) => PAD + (i / (spreads.length - 1)) * W;
  const cy = (v) => PAD + H - ((v - minV) / range) * H;
  const d  = spreads.map((s, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(s.value).toFixed(1)}`).join(' ');
  const zeroY = cy(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }}>
      {zeroY >= PAD && zeroY <= height - PAD && (
        <line x1={PAD} y1={zeroY} x2={width - PAD} y2={zeroY}
          stroke="#3a3a5a" strokeWidth={0.5} strokeDasharray="3 2" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.2} opacity={0.85} />
      <circle cx={cx(spreads.length - 1)} cy={cy(vals[vals.length - 1])} r={2} fill={color} />
    </svg>
  );
}

// ── 글로벌 10Y 수평바 ─────────────────────────────────────
const GLOBAL_ORDER = ['GB', 'US', 'KR', 'DE', 'JP'];

function GlobalHorizontalChart({ series }) {
  const entries = GLOBAL_ORDER
    .map(c => series[c])
    .filter(v => v && !v.error && v.latest?.value);
  if (!entries.length) return <div className="mp-chart-empty">데이터 없음</div>;

  const maxVal    = Math.max(...entries.map(e => e.latest.value));
  const prevDate  = entries[0]?.history?.slice(-2, -1)[0]?.date?.slice(0, 7);
  const currDate  = entries[0]?.latest?.date?.slice(0, 7);

  return (
    <div className="mp-global-horiz">
      <div className="mp-global-compare-header">
        <span className="mp-global-ch-curr">{currDate}</span>
        <span style={{ flex: 1 }} />
        {prevDate && <span className="mp-global-ch-prev">vs {prevDate}</span>}
        <span className="mp-global-ch-us">vs 미국</span>
        <span className="mp-global-ch-pr">vs 기준금리</span>
      </div>

      {entries.map(info => {
        const color  = COUNTRY_COLOR[info.country] || '#888';
        const barPct = (info.latest.value / (maxVal * 1.08)) * 100;
        const prev   = info.history?.slice(-2, -1)[0]?.value;
        const chg    = prev != null ? info.latest.value - prev : null;

        return (
          <div key={info.country} className="mp-global-hrow">
            <div className="mp-global-hcountry">
              <span style={{ fontSize: 15 }}>{COUNTRY_FLAG[info.country]}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color }}>{info.label}</span>
            </div>
            <div className="mp-global-hbar-wrap">
              <div className="mp-global-hbar-track">
                <div className="mp-global-hbar-fill" style={{ width: `${barPct}%`, background: color }} />
              </div>
              <span className="mp-global-hval" style={{ color }}>{fmt(info.latest.value, 3)}</span>
            </div>
            <div className="mp-global-hchg">
              {chg != null
                ? <span style={{ color: chg > 0 ? C.up : C.dn, fontSize: 11, fontWeight: 600 }}>
                    {chg > 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}
                  </span>
                : <span style={{ color: C.textFaint }}>—</span>}
            </div>
            <div className="mp-global-hvs">
              {info.vs_us != null
                ? <span style={{
                    color: info.country === 'US' ? C.textFaint : info.vs_us > 0 ? C.up : C.dn,
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {info.country === 'US' ? '—' : (info.vs_us > 0 ? '+' : '') + info.vs_us.toFixed(2)}
                  </span>
                : <span style={{ color: C.textFaint }}>—</span>}
            </div>
            <div className="mp-global-hpr">
              {info.vs_policy != null
                ? <div>
                    <span style={{
                      color: info.vs_policy > 0 ? C.dn : C.up,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {info.vs_policy > 0 ? '+' : ''}{info.vs_policy.toFixed(2)}
                    </span>
                    {info.policy_rate && (
                      <div style={{ fontSize: 9, color: C.textFaint }}>
                        PR {info.policy_rate.value.toFixed(2)}%
                      </div>
                    )}
                  </div>
                : <span style={{ color: C.textFaint }}>—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 커브 유사도 컴포넌트 ──────────────────────────────────
const SIM_TENOR_KEYS = ['DGS1', 'DGS2', 'DGS5', 'DGS10', 'DGS20', 'DGS30'];
const SIM_TENOR_LBLS = ['1Y',   '2Y',   '5Y',   '10Y',   '20Y',   '30Y'  ];

// ── 예상 커브 SVG 차트 ─────────────────────────────────────
function SimilarityCurveChart({ currentLevels, fwd1m, fwd3m, width = 520, height = 200 }) {
  // currentLevels: { '1Y': 3.73, '2Y': 3.87, ... }
  // fwd1m / fwd3m: { 'DGS1': { change: 0.39 }, ... }

  const current = SIM_TENOR_LBLS.map(lbl => currentLevels[lbl] ?? null);

  const predicted1m = SIM_TENOR_KEYS.map((k, i) => {
    const base = currentLevels[SIM_TENOR_LBLS[i]];
    const chg  = fwd1m?.[k]?.change;
    return base != null && chg != null ? base + chg : null;
  });

  const predicted3m = SIM_TENOR_KEYS.map((k, i) => {
    const base = currentLevels[SIM_TENOR_LBLS[i]];
    const chg  = fwd3m?.[k]?.change;
    return base != null && chg != null ? base + chg : null;
  });

  const allVals = [...current, ...predicted1m, ...predicted3m].filter(v => v != null);
  if (!allVals.length) return <div className="mp-chart-empty">데이터 없음</div>;

  const maxV = Math.max(...allVals) + 0.2;
  const minV = Math.max(0, Math.min(...allVals) - 0.2);
  const range = maxV - minV || 1;

  const PAD_L = 38, PAD_R = 12, PAD_T = 20, PAD_B = 24;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const cx = (i) => PAD_L + (i / (SIM_TENOR_LBLS.length - 1)) * W;
  const cy = (v) => PAD_T + H - ((v - minV) / range) * H;

  const pathD = (vals) => {
    const pts = vals.map((v, i) => v != null ? [cx(i), cy(v)] : null).filter(Boolean);
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  };

  const gridVals = Array.from({ length: 5 }, (_, i) => minV + (i / 4) * range);

  const curves = [
    { vals: current,     color: C.us,      label: 'US 현재',    dash: false,  dotR: 3   },
    { vals: predicted1m, color: C.neutral, label: '1M 예상',     dash: '6 3',  dotR: 2.5 },
    { vals: predicted3m, color: C.up,      label: '3M 예상',     dash: '3 3',  dotR: 2.5 },
  ].filter(c => c.vals.some(v => v != null));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {/* 그리드 */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={cy(v)} x2={width - PAD_R} y2={cy(v)}
            stroke={C.borderDim} strokeWidth={0.5} />
          <text x={PAD_L - 4} y={cy(v) + 3.5} fill={C.textFaint}
            fontSize={6.5} textAnchor="end">{v.toFixed(2)}</text>
        </g>
      ))}
      {/* X축 레이블 */}
      {SIM_TENOR_LBLS.map((lbl, i) => (
        <text key={lbl} x={cx(i)} y={height - 6}
          fill={C.textDim} fontSize={6.5} textAnchor="middle" fontWeight={400}>{lbl}</text>
      ))}
      {/* 커브 선 */}
      {curves.map(c => (
        <path key={c.label} d={pathD(c.vals)} fill="none"
          stroke={c.color} strokeWidth={c.dash ? 1.5 : 2}
          strokeDasharray={c.dash || undefined}
          opacity={c.dash ? 0.75 : 1} />
      ))}
      {/* 포인트 */}
      {curves.map(c =>
        c.vals.map((v, i) => v != null ? (
          <circle key={`${c.label}-${i}`}
            cx={cx(i)} cy={cy(v)} r={c.dotR}
            fill={c.color} opacity={c.dash ? 0.8 : 1} />
        ) : null)
      )}
      {/* 범례 */}
      {curves.map((c, i) => (
        <g key={c.label} transform={`translate(${PAD_L + i * 90}, 8)`}>
          <line x1={0} y1={0} x2={16} y2={0}
            stroke={c.color} strokeWidth={c.dash ? 1.5 : 2}
            strokeDasharray={c.dash || undefined} />
          <text x={20} y={3.5} fill={c.color} fontSize={8}>{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

function CurveSimilarityPanel({ similarity, usCurve }) {
  const [activePeriod, setActivePeriod] = useState('1m'); // 유사 시점 탐색 기간
  const [activeMatch,  setActiveMatch]  = useState(0);
  const [tableView,    setTableView]    = useState('1m'); // 수치 표시 기간 (독립)

  if (!similarity) {
    return (
      <div className="sim-empty">
        <span>커브 유사도 데이터 준비 중</span>
        <span style={{ fontSize: 10, color: C.textFaint, marginTop: 4 }}>
          파이프라인 첫 실행 후 생성됩니다
        </span>
      </div>
    );
  }

  const data    = similarity[activePeriod];
  if (!data) return null;

  const matches = data.matches || [];
  const insight = data.insight;
  const match   = matches[activeMatch];

  // 현재 커브 레벨
  const currentLevels = {};
  SIM_TENOR_KEYS.forEach((k, i) => {
    const val = usCurve?.series?.[k]?.latest?.value;
    if (val != null) currentLevels[SIM_TENOR_LBLS[i]] = val;
  });

  // 3개 유사 시점 평균 예상 커브
  const avgFwd1m = (() => {
    if (!matches.length) return null;
    const result = {};
    SIM_TENOR_KEYS.forEach(k => {
      const vals = matches.map(m => m.forward_1m?.[k]?.change).filter(v => v != null);
      if (vals.length) result[k] = { change: parseFloat((vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(3)) };
    });
    return Object.keys(result).length ? result : null;
  })();
  const avgFwd3m = (() => {
    if (!matches.length) return null;
    const result = {};
    SIM_TENOR_KEYS.forEach(k => {
      const vals = matches.map(m => m.forward_3m?.[k]?.change).filter(v => v != null);
      if (vals.length) result[k] = { change: parseFloat((vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(3)) };
    });
    return Object.keys(result).length ? result : null;
  })();

  return (
    <div className="sim-root">

      {/* ── 헤더: 기간 탭 + 패턴명 ── */}
      <div className="sim-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="sim-title">
            {insight?.pattern_description || '커브 패턴 분석'}
          </span>
          <div className="mp-tab-group mp-tab-group--sm">
            {[{ id: '1m', label: '1M 무브먼트 탐색' }, { id: '3m', label: '3M 무브먼트 탐색' }].map(o => (
              <button key={o.id}
                className={`mp-tab ${activePeriod === o.id ? 'active' : ''}`}
                onClick={() => { setActivePeriod(o.id); setActiveMatch(0); }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {data.computed_at && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {data.data_as_of && (
              <span style={{ fontSize: 9, color: C.textFaint }}>
                데이터 기준: {data.data_as_of}
              </span>
            )}
            <span style={{ fontSize: 9, color: C.textFaint }}>
              갱신: {(() => {
                const d = new Date(data.computed_at);
                const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                return `${kst.toISOString().slice(0, 10)} ${kst.toISOString().slice(11, 16)} KST`;
              })()}
            </span>
          </div>
        )}
      </div>

      {/* 판정 기준 안내 */}
      <div style={{ fontSize: 10, color: '#bf5fff', marginBottom: 6, textShadow: '0 0 8px #bf5fff66' }}>
        🇺🇸 미국 국채 수익률 커브(1Y·2Y·5Y·10Y·20Y·30Y)의 {data.label} 무브먼트 벡터 기준 코사인 유사도
      </div>

      {/* 탐색 기준 친절 설명 */}
      <div className="sim-search-basis">
        아래 유사 시점들은 <strong>최근 {activePeriod === '1m' ? '1개월' : '3개월'}간</strong> 테너별 금리 커브의 변화 패턴과 역사적으로 가장 유사했던 시점을 20년 데이터에서 AI가 포착한 것입니다.
      </div>

      {/* ── 평균 예상 커브 (메인) + 우측 수치 테이블 ── */}
      {matches.length > 0 && avgFwd1m && (
        <>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6, fontWeight: 600 }}>
            ◈ 유사 시점 {matches.length}개 평균 예상 커브
          </div>
          <div className="sim-main-layout">
            {/* 좌: 커브 차트 */}
            <div className="sim-chart-box sim-chart-box--main">
              <SimilarityCurveChart
                currentLevels={currentLevels}
                fwd1m={avgFwd1m}
                fwd3m={avgFwd3m}
              />
            </div>
            {/* 우: 만기별 수치 테이블 */}
            <div className="sim-fwd-table">
              <div className="sim-fwd-table-header">
                <span style={{ color: C.textDim, fontSize: 10, fontWeight: 600 }}>테너별 변화량 (%p)</span>
                <div className="mp-tab-group mp-tab-group--sm">
                  {[{ id: '1m', label: 'fwd 1M' }, { id: '3m', label: 'fwd 3M' }].map(o => (
                    <button key={o.id}
                      className={`mp-tab ${tableView === o.id ? 'active' : ''}`}
                      onClick={() => setTableView(o.id)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 헤더 행 */}
              <div className="sim-tbl-row sim-tbl-row--head">
                <span className="sim-tbl-label">시점</span>
                <span className="sim-tbl-date">+1M</span>
                <span className="sim-tbl-date">+3M</span>
                {SIM_TENOR_LBLS.map(lbl => (
                  <span key={lbl} className="sim-tbl-val">{lbl}</span>
                ))}
              </div>
              {/* 개별 시점 행 */}
              {matches.map((m, idx) => {
                const fwd = tableView === '1m' ? m.forward_1m : m.forward_3m;
                const end1m = m.forward_1m?.[SIM_TENOR_KEYS[0]]?.end_date?.slice(2, 10) || '';
                const end3m = m.forward_3m?.[SIM_TENOR_KEYS[0]]?.end_date?.slice(2, 10) || '';
                return (
                  <div key={m.date} className="sim-tbl-row">
                    <span className="sim-tbl-label">
                      <span style={{ color: '#f0f0ff', fontWeight: 700 }}>#{idx + 1}</span>
                      <span style={{ color: '#ff8c00', fontWeight: 700 }}> {m.date.slice(2, 10)}</span>
                    </span>
                    <span className="sim-tbl-date" style={{ color: C.neutral }}>{end1m}</span>
                    <span className="sim-tbl-date" style={{ color: C.up }}>{end3m}</span>
                    {SIM_TENOR_KEYS.map(k => {
                      const chg = fwd?.[k]?.change;
                      return (
                        <span key={k} className="sim-tbl-val" style={{
                          color: chg == null ? C.textFaint : chg > 0 ? C.up : chg < 0 ? C.dn : C.textDim,
                          fontWeight: 600,
                        }}>
                          {chg == null ? '—' : (chg > 0 ? '+' : '') + chg.toFixed(2)}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
              {/* 평균 행 */}
              {(() => {
                const avgFwd = tableView === '1m' ? avgFwd1m : avgFwd3m;
                return (
                  <div className="sim-tbl-row sim-tbl-row--avg">
                    <span className="sim-tbl-label" style={{ color: C.neutral, fontWeight: 700 }}>평균</span>
                    <span className="sim-tbl-date"></span>
                    <span className="sim-tbl-date"></span>
                    {SIM_TENOR_KEYS.map(k => {
                      const chg = avgFwd?.[k]?.change;
                      return (
                        <span key={k} className="sim-tbl-val" style={{
                          color: chg == null ? C.textFaint : chg > 0 ? C.up : chg < 0 ? C.dn : C.textDim,
                          fontWeight: 700,
                        }}>
                          {chg == null ? '—' : (chg > 0 ? '+' : '') + chg.toFixed(2)}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── 유사 시점 선택 탭 ── */}
      {matches.length > 0 && (
        <div style={{ fontSize: 10, color: C.textDim, margin: '8px 0 4px', fontWeight: 600 }}>
          ◈ 개별 유사 시점 상세
        </div>
      )}
      {matches.length > 0 && (
        <div className="sim-match-tabs">
          {matches.map((m, idx) => {
            const im = insight?.matches?.[idx];
            return (
              <button key={m.date}
                className={`sim-match-tab ${activeMatch === idx ? 'active' : ''}`}
                onClick={() => setActiveMatch(idx)}>
                <span className="sim-mt-rank">#{idx + 1}</span>
                <span className="sim-mt-date">{m.date}</span>
                {im?.macro_context && (
                  <span className="sim-mt-ctx">{im.macro_context?.slice(0, 40)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 예상 커브 차트 ── */}
      {match && (
        <>
          <div className="sim-chart-box">
            <SimilarityCurveChart
              currentLevels={currentLevels}
              fwd1m={match.forward_1m}
              fwd3m={match.forward_3m}
            />
          </div>

          {/* 상세 설명 카드 */}
          {insight?.matches?.[activeMatch] && (() => {
            const im = insight.matches[activeMatch];
            return (
              <div className="sim-detail-card">
                {im.why_similar && (
                  <div className="sim-detail-block">
                    <div className="sim-detail-label">◈ 유사성 근거</div>
                    <div className="sim-detail-text">{im.why_similar}</div>
                  </div>
                )}
                {im.macro_context && (
                  <div className="sim-detail-block">
                    <div className="sim-detail-label">◈ 당시 매크로 배경</div>
                    <div className="sim-detail-text">{im.macro_context}</div>
                  </div>
                )}
                <div className="sim-detail-fwd-row">
                  {im.after_1m_detail && (
                    <div className="sim-detail-block sim-detail-block--half">
                      <div className="sim-detail-label" style={{ color: C.neutral }}>
                        ◈ 이후 1개월 실제 변화
                      </div>
                      <div className="sim-detail-text">{im.after_1m_detail}</div>
                    </div>
                  )}
                  {im.after_3m_detail && (
                    <div className="sim-detail-block sim-detail-block--half">
                      <div className="sim-detail-label" style={{ color: C.up }}>
                        ◈ 이후 3개월 실제 변화
                      </div>
                      <div className="sim-detail-text">{im.after_3m_detail}</div>
                    </div>
                  )}
                </div>
                {im.bond_lesson && (
                  <div className="sim-detail-block">
                    <div className="sim-detail-label" style={{ color: C.kr }}>
                      ◈ 채권운용 교훈
                    </div>
                    <div className="sim-detail-text">{im.bond_lesson}</div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {matches.length === 0 && (
        <div className="sim-no-match">
          유사도 70% 이상 시점 없음 — 현재 패턴이 역사적으로 드문 경우
        </div>
      )}

      {/* ── 종합 시사점 ── */}
      {(insight?.current_implication || insight?.implication) && (
        <div className="sim-implication">
          <span className="sim-impl-label">◎ 종합 채권운용 시사점</span>
          <span className="sim-impl-text">
            {insight.current_implication || insight.implication}
          </span>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function MacroPanel({ yieldCurve, fedBalance, curveSimilarity }) {
  const [showUS,  setShowUS]  = useState(true);
  const [showKR,  setShowKR]  = useState(true);
  const [comparePeriod, setComparePeriod] = useState('1m');
  const [curveView, setCurveView] = useState('combined'); // 'combined' | 'global'

  const usCurve   = yieldCurve?.us_curve;
  const krCurve   = yieldCurve?.kr_curve;
  const global10y = yieldCurve?.global_10y;
  const fed       = fedBalance;

  const walcl  = fed?.series?.WALCL;
  const tga    = fed?.series?.WTREGEN;
  const rrp    = fed?.series?.RRPONTSYD;
  const resv   = fed?.series?.WRESBAL;
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

      {/* ── 섹션 1: 커브 유사도 (메인) ── */}
      <div className="mp-section--card">
        <div className="mp-section-header">
          <span className="mp-sim-main-title">미국 금리 커브 움직임에 기반한 근 미래 유망 시나리오 진단</span>
          <span style={{ fontSize: 10, color: C.textFaint }}>
            20년 history 대비 · 매일 06:30 KST 갱신
          </span>
        </div>
        <CurveSimilarityPanel similarity={curveSimilarity} usCurve={usCurve} />
      </div>

      {/* ── 섹션 2: 수익률 커브 ── */}
      <div className="mp-section mp-section--card" style={{ maxWidth: 700 }}>
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
                  US
                </button>
                <button
                  className={`mp-toggle ${showKR ? 'active' : ''}`}
                  style={showKR ? { borderColor: C.kr, color: C.kr, background: `${C.kr}18` } : {}}
                  onClick={() => setShowKR(v => !v)}>
                  KR
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
                      KR {kr10.toFixed(3)}% · US {us10.toFixed(3)}%
                    </span>
                  </div>
                );
              })()
            }

            {/* 스프레드 게이지 + 미니차트 */}
            {usCurve?.spreads && (
              <div className="mp-spread-row">
                {[
                  { label: '미국 10Y-2Y', key: '2Y10Y', s2key: 'DGS2',   range: [-2, 3], color: C.us },
                  { label: '미국 10Y-3M', key: '3M10Y', s2key: 'DGS3MO', range: [-2, 3], color: C.us },
                  { label: '버터플라이',  key: 'butterfly', s2key: null,  range: [-1, 1], color: C.neutral },
                ].map(({ label, key, s2key, range, color }) => (
                  <div key={key} className="mp-gauge-wrap">
                    <SpreadGauge label={label} value={usCurve.spreads[key]?.value} range={range} color={color} />
                    {s2key && usCurve.series?.DGS10?.history && usCurve.series?.[s2key]?.history && (
                      <SpreadMiniChart
                        s10History={usCurve.series.DGS10.history}
                        s2History={usCurve.series[s2key].history}
                        color={color}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 글로벌 10Y */}
        {curveView === 'global' && global10y && (
          <GlobalHorizontalChart series={global10y.series} />
        )}
      </div>

      {/* ── 섹션 2: 하단 2컬럼 ── */}
      <div className="mp-bottom-row">

        {/* 금리 지표 */}
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

              {(() => {
                const netLiqHistory = calcNetLiqHistory(
                  walcl.history,
                  tga?.history,
                  rrp?.history,
                );
                const netLiqLatest = netLiqHistory?.[netLiqHistory.length - 1]?.value;
                return (
                  <div className="mp-fed-item">
                    <div className="mp-fed-label">순유동성</div>
                    <div className="mp-fed-val" style={{ color: C.kr }}>
                      {netLiqLatest ? fmtT(netLiqLatest) : fmtT(netLiq?.value)}
                    </div>
                    {netLiqHistory && <FedMiniChart history={netLiqHistory} color={C.kr} />}
                    <div className="mp-fed-formula">WALCL − TGA − RRP</div>
                    {tga?.latest && rrp?.latest && (
                      <div className="mp-fed-detail">
                        TGA {fmtT(tga.latest.value)} · RRP {fmtRRP(rrp.latest.value)}
                      </div>
                    )}
                  </div>
                );
              })()}

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
