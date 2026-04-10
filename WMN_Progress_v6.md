# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v6.0
> 마지막 업데이트: 2026-04-09 (개발_6 세션)
> 다음 세션 시작 시 이 파일을 Claude에게 전달할 것.

---

## 1. 개발 환경

| 항목 | 내용 |
|------|------|
| GitHub Repo | https://github.com/pristinehwi/WorldMarketNow (Public) |
| 배포 URL | https://pristinehwi.github.io/WorldMarketNow |
| 로컬 경로 | `C:\WORK\AI_development\WorldMarketNow_Project\WorldMarketNow` |
| 프론트엔드 | `./frontend` (React, `npm start` → localhost:3000) |
| 백엔드 | Google Apps Script (WorldMarketNow 프로젝트) |
| 브랜치 | main |

---

## 2. API 키 현황 (GAS Script Properties)

| 속성명 | 용도 | 상태 |
|--------|------|------|
| `FRED_API_KEY` | 미국 거시경제 지표 | ✅ |
| `FINNHUB_API_KEY` | 현재가/quote | ✅ |
| `BOK_API_KEY` | 한국은행 ECOS | ✅ |
| `CLAUDE_API_KEY` | Claude API 3콜 | ✅ |
| `GITHUB_TOKEN` | GitHub JSON push | ✅ |
| `ALPHA_VANTAGE_KEY` | 일봉 historical | ✅ |

---

## 3. GAS 파일 현황

| 파일명 | 역할 | 버전 | 상태 |
|--------|------|------|------|
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 수집 | v4.3+ | ✅ |
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v4.5 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup | v2.1 | ✅ |

### Claude API 3콜 아키텍처 (v4.5)
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | **Sonnet** | 시장 인식 + 스레드 결정 | 4096 |
| 1번 | Sonnet | DAG 생성 + 자체검토 통합 | 8000 |
| 2번 | Haiku | 최종 확정 + 브리핑 | 6000 |

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ 등록됨 |
| `runPipeline` | 분 타이머 30분 | 상시 | ⬜ **미등록** |

### GitHub push 파일 구조
- `data/latest.json` — Claude 3콜 결과 (threads, headline, layer_summary)
- `data/prices.json` — ETF 가격 데이터 (date 필드 포함)
- `data/archive/YYYYMMDD_HHmm.json` — 14일 보관

---

## 4. COMMON_RULES 현황 (v4.5)

| 번호 | 규칙 요약 | 상태 |
|------|----------|------|
| 1 | ETF 노드 티커 병기 필수 | ✅ |
| 2 | JSON만 출력, 마크다운 금지 | ✅ |
| 3 | 시장별 시간축 인과 규칙 | ✅ |
| 4 | 노드 label 10자 이내 | ✅ |
| 5 | value 날짜 필드 기준 형식 (date_current/1d/1w/1m_ago) | ✅ v4.5 신규 |
| 6 | timestamp HH:MM 또는 null | ✅ |
| 7 | 스레드 간 주제 중복 금지 | ✅ |
| 8 | 한국 종착 노드 50% 이하 | ✅ |
| 9 | headline/title 띄어쓰기 | ✅ |
| 10 | layer_summary layer1 형식 + 60자 이내 | ✅ |
| 11 | edge label 6자 이내 | ✅ |
| 12 | 동일 미국 시간대 ETF 간 직접 인과 금지 | ✅ |
| 13 | 전일 급등 후 조정 = "급등후조정"/"차익실현" | ✅ |
| 14 | 개념 노드 related_news (프리퀀시별 기준 차등) | ✅ v4.5 신규 |
| 15 | WEEKLY/MONTHLY DAG 2단계 이상 인과 체인 | ✅ v4.5 신규 |

### 14번 related_news 프리퀀시별 기준
- NOW: 최근 24시간 직접 관련 뉴스 1~2개
- WEEKLY: Fed/BIS/IMF/ECB 정책·거시 소스만 허용
- MONTHLY: `related_news: []` 고정, value에 15자 이내 압축

---

## 5. 데이터 파이프라인 개선 (개발_6)

### `collectPrices()` 날짜 필드 추가
```javascript
date_current: candles ? candles.date_current : null,
date_1d_ago:  candles ? candles.date_1d_ago  : null,
date_1w_ago:  candles ? candles.date_1w_ago  : null,
date_1m_ago:  candles ? candles.date_1m_ago  : null,
```

### `collectIndices()` 날짜 필드 추가
```javascript
const timestamps = res?.chart?.result?.[0]?.timestamp || [];
const date_current = timestamps.length >= 1
  ? Utilities.formatDate(new Date(timestamps[timestamps.length-1]*1000), 'Asia/Seoul', 'yyyy-MM-dd') : null;
const date_1d_ago = timestamps.length >= 2
  ? Utilities.formatDate(new Date(timestamps[timestamps.length-2]*1000), 'Asia/Seoul', 'yyyy-MM-dd') : null;
const date_1w_ago = timestamps.length >= 5
  ? Utilities.formatDate(new Date(timestamps[0]*1000), 'Asia/Seoul', 'yyyy-MM-dd') : null;
```

### `github_push.gs` `generated_at` 덮어쓰기
```javascript
const finalOutput = {
  ...call2,
  generated_at: new Date().toISOString(), // GAS 실행 시각으로 강제 덮어쓰기
  meta: { ... }
};
```

---

## 6. React 프론트엔드 현황

```
frontend/src/
├── App.js                    ✅ v5 (BuiltBy 컴포넌트 추가)
├── App.css                   ✅ v4
├── components/
│   ├── HeadlineZone.js       ✅ v5 (무한 타이핑 루프, Last Refresh Time)
│   ├── DagGraph.js           ✅ v8 (막대그래프 팝업, 개념노드 팝업, 날짜 분리, ETF_FULLNAME)
│   ├── Timeline.js           ✅ v4 (NOW 탭 수정, 주간(Weekly)/월간(Monthly) 흐름)
│   └── SidePanel.js          ✅ v2
└── hooks/
    └── useMarketData.js      ✅ v2 (prices.json 동시 fetch)
```

---

## 7. 개발_6 세션 완료 항목

### GAS 백엔드
- [x] 0번 콜 Haiku → **Sonnet** 교체 (JSON 파싱 안정성)
- [x] `collectPrices()` date 필드 4개 추가
- [x] `collectIndices()` date_current/1d/1w 필드 추가
- [x] `generated_at` GAS 실행 시각으로 강제 덮어쓰기 (이중 변환 버그 수정)
- [x] `prices.json` 별도 push
- [x] COMMON_RULES v4.5 (규칙 12~15 추가, 5번 날짜 원칙 전면 개정)

### React 프론트엔드
- [x] **미니차트 팝업** 전면 개편 — 수직 막대그래프 (전체 자산 상대위치 비교)
- [x] **개념 노드 팝업** — 가격 노드/개념 노드 분기, related_news 표시
- [x] **ETF_FULLNAME** 테이블 (60개 공식 명칭)
- [x] **headline 무한 타이핑 루프** (쓰고→대기→지우고→반복)
- [x] **Last Refresh Time** 깜빡임 애니메이션 (노란색)
- [x] **"built by hwi"** 우하단 고정 (클릭 시 이메일 복사)
- [x] **title 변경** `React App` → `World Market Now`
- [x] **NOW 탭** Timeline에 추가 (OVERNIGHT 대신)
- [x] **노드 value 날짜 분리 렌더링** (날짜 형광빨강, 가격/변동률 별도 줄)
- [x] **"↩ 전체 인과흐름 복귀" 버튼** (activeTimeEvent 활성 시)
- [x] **"주간(Weekly) 흐름" / "월간(Monthly) 흐름"** 레이블
- [x] **thread-group 양쪽 가로선**
- [x] **briefing 텍스트** 색상 밝게 (#d0d0e8)
- [x] GitHub push + GitHub Pages 배포 완료

---

## 8. 남은 작업

### 🔴 최우선
1. **`runPipeline()` 30분 트리거 등록** ← 아직 미등록!

### 🟡 그 다음
2. **모바일 UI 점검** — 실기기 접속 테스트
3. **통합 테스트** — 미국 장 개장 중 시간대 (KST 23:30~익일 06:00) 데이터 확인

### 🔵 기술 부채
- DagGraph.js ESLint 경고 정리 (미사용 변수)
- 수평 edge 펄스 두께 미해결
- WEEKLY KOSPI 기저일 오차 (Yahoo 5일치 데이터 한계)

### 🔵 v2 기획
- **뉴스 DB 축적** — GAS에서 매일 헤드라인을 GitHub에 append (30일치 축적)
  → WEEKLY/MONTHLY related_news 품질 개선용
- **브리핑 연동 탭** — RSS 브리핑 GAS 연동
- **인과 구조 고도화** — causal/correlative/contextual edge 분리

---

## 9. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_7 세션입니다.
진도 현황: WMN_Progress_v6.md (첨부)
완료: 개발_6 전체 (미니차트, 개념노드, 날짜필드, COMMON_RULES v4.5)
오늘 작업 (우선순위):
  1. runPipeline() 30분 트리거 등록
  2. 모바일 UI 점검
  3. 미국 장 개장 시간대 데이터 확인
  4. v2 기획 논의 (뉴스 DB 축적 or 브리핑 연동 탭)
```
