# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v10.0
> 마지막 업데이트: 2026-05-09 (개발_12 세션 완료)
> 다음 세션 시작 시 이 파일을 Claude에게 전달할 것.

---

## 1. 개발 환경

| 항목 | 내용 |
|------|------|
| GitHub Repo | https://github.com/pristinehwi/WorldMarketNow (Public) |
| 배포 URL | https://pristinehwi.github.io/WorldMarketNow |
| 로컬 경로 | `C:\WORK\AI_development\WorldMarketNow_Project\WorldMarketNow` |
| 프론트엔드 | `./frontend` (React) |
| 백엔드 | Google Apps Script (WorldMarketNow 프로젝트) |
| 브랜치 | main |
| 프론트 배포 | **`git push origin main`만 사용** (`npm run deploy` 영구 금지) |

---

## 2. API 키 현황 (GAS Script Properties)

### WorldMarketNow GAS
| 속성명 | 용도 | 상태 |
|--------|------|------|
| `FRED_API_KEY` | 미국 거시경제 지표 | ✅ |
| `FINNHUB_API_KEY` | 현재가/quote | ✅ |
| `BOK_API_KEY` | 한국은행 ECOS | ✅ |
| `CLAUDE_API_KEY` | Claude API 3콜 + 번역 + 유사도 해석 | ✅ |
| `GITHUB_TOKEN` | GitHub JSON push | ✅ |
| `ALPHA_VANTAGE_KEY` | 일봉 historical | ✅ |
| `MARKET_HOLIDAYS` | 시장별 공휴일 테이블 (JSON) | ✅ |

---

## 3. GAS 파일 현황

### WorldMarketNow GAS
| 파일명 | 역할 | 버전 | 상태 |
|--------|------|------|------|
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 + 수익률 커브 + 글로벌 기준금리 수집 | v4.9 | ✅ |
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v5.0 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup + 이벤트 로그 번역/누적 + curve_similarity | v2.6 | ✅ |
| `curve_similarity.gs` | 커브 무브먼트 유사도 계산 + Sonnet 해석 | v1.0 | ✅ (신규) |

### Claude API 아키텍처
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | Sonnet (`claude-sonnet-4-20250514`) | 시장 인식 + 스레드 결정 + 세션 판단 | 3000 |
| 1번 | Sonnet | DAG 생성 — 철학 기반 프롬프트 | 9000 |
| 2번 | Haiku (`claude-haiku-4-5-20251001`) | 최종 확정 + 브리핑 생성 | 6000 |
| 번역 | Haiku | 이벤트 로그 헤드라인 배치 번역 | 2000 |
| 유사도 해석 | Sonnet | 커브 무브먼트 유사도 + 채권 시사점 | 4000 |

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ |
| `runPipeline` | 시간 타이머 | **1시간마다** (개발_12에서 변경) | ✅ |
| Morning Mailing | Day timer | 매일 1회 | ✅ |

### 블랙아웃 스케줄 (KST 기준)
| 시간대 | 상태 |
|--------|------|
| 평일 00:00~06:30 | ✅ 실행 (미국 장) |
| 평일 06:30~09:01 | ⏸️ 스킵 |
| 평일 09:01~16:01 | ✅ 실행 (한국 장) |
| 평일 16:01~17:00 | ⏸️ 스킵 |
| 평일 17:00~22:31 | ✅ 실행 (유럽 장) |
| 평일 22:31~24:00 | ✅ 실행 (미국 장 개장) |
| 토 09:00~월 09:00 | ⏸️ 스킵 (주말) |

### curve_similarity 실행 조건
- **KST 06:00~08:00 사이에만 실행** (하루 1회)
- 20년 history (5200일) 기반 코사인 유사도 계산
- Sonnet 해석 생성 (1M + 3M 각각, max_tokens 4000)
- 결과: `data/curve_similarity.json` push

### GitHub push 파일 구조
```
data/
├── latest.json
├── prices.json
├── yield_curve.json         ← v4.9 신규 (미국 커브 130일 + 한국 커브 + 글로벌 10Y + 기준금리)
├── fed_balance.json         ← v4.9 신규 (연준 대차대조표 5개 시리즈)
├── curve_similarity.json    ← v1.0 신규 (무브먼트 유사도 1M/3M + Sonnet 해석)
├── event_log.json           ← 이벤트 로그 (90일 보관)
├── archive/                 — 14일 보관
└── briefing/                — 2년 보관
    ├── index.json
    └── YYYY-MM-DD.html
```

### ⚠️ 긴급 알림 — Morning Mailing 모델 교체 필요
- **대상**: Morning Mailing GAS (아카이브/비아카이브 두 버전 모두)
- **교체**: `"claude-sonnet-4-5"` → `"claude-sonnet-4-6"`
- **Retirement: 2026-06-15** (이후 API 오류 발생)
- **비용 변동 없음** ($3/$15 per M tokens)
- WMN 내부 GAS (`claude_api.gs`, `curve_similarity.gs`)는 이미 `claude-sonnet-4-20250514` 사용 중 ✅

---

## 4. 프론트엔드 현황

```
frontend/src/
├── App.js                    ✅ v2.0 (5탭 네비게이션 — PC 상단탭/모바일 하단탭)
├── App.css                   ✅ (탭바 + MacroPanel + 유사도 패널 스타일 포함)
├── components/
│   ├── HeadlineZone.js       ✅
│   ├── DagGraph.js           ✅ v11+ (호버 툴팁 PC only)
│   ├── Timeline.js           ✅
│   ├── SidePanel.js          ✅
│   ├── ArchiveCompare.js     ✅ (시간축 비교 + 브리핑 아카이브 서브탭)
│   ├── EventLog.js           ✅ (embedded 모드 지원)
│   └── MacroPanel.js         ✅ v4.0 (신규 — 매크로·금리 대시보드)
└── hooks/
    └── useMarketData.js      ✅ (yield_curve + fed_balance + curve_similarity fetch 포함)
```

### 5탭 네비게이션 구조
| 탭 | 내용 |
|----|------|
| DAG 메인 | 기존 인과 DAG + 타임라인 + 사이드패널 |
| 매크로·금리 | MacroPanel (신규) |
| 이벤트 로그 | EventLog (embedded) |
| 아카이브 | ArchiveCompare (서브탭: ⏱ 시간축 비교 / 📰 Daily Intelligence) |
| About | Placeholder (미구현) |

---

## 5. MacroPanel 현황 (v4.0 신규)

### 섹션 구성
1. **🇺🇸 미국 커브 무브먼트 유사도 검색** (메인 최상단)
   - "미국 금리 커브 움직임에 기반한 근 미래 유망 시나리오 진단" 타이틀
   - 1M / 3M 무브먼트 탐색 탭 (유사 시점 자체가 바뀜)
   - 3개 유사 시점 평균 예상 커브 (차트 + 수치 테이블 2열)
   - 수치 테이블: 각 시점의 +1M/+3M end_date + 테너별 변화량 + 평균 행
   - fwd 1M / fwd 3M 수치 전환 탭 (tableView state — 탐색 기간과 독립)
   - 개별 유사 시점 탭 클릭 → 예상 커브 + 상세 설명 카드
   - 상세 설명: 유사성 근거 / 당시 매크로 배경 / 1M 이후 / 3M 이후 / 채권운용 교훈
   - 종합 채권운용 시사점 (Sonnet 생성)
   - 탐색 기준 설명 박스 ("최근 N개월간 ... AI가 포착")

2. **수익률 커브** (섹션 2, max-width 700px)
   - 한/미 커브 통합 뷰 (US/KR 토글)
   - 비교 기간: 단독/+1주/+2주/+1M/+3M
   - 글로벌 10Y 탭: 수평바 UI + vs 전월 / vs 미국 / vs 기준금리

3. **금리 지표 + 연준 유동성** (섹션 3, 2열)
   - 미국 주요 금리 (10Y/2Y/1Y/3M, 1M 전 대비)
   - 총자산 / 순유동성 (히스토리 계산) / 은행준비금 미니차트 + 날짜

### 데이터 수집 현황 (v4.9 신규)

#### 미국 수익률 커브 (FRED, 일별)
| 시리즈 | 만기 | limit |
|--------|------|-------|
| DGS1MO~DGS30 | 10개 만기 | **5200일 (20년)** |

#### 한국 수익률 커브 (BOK ECOS 817Y002, 일별)
| 항목코드 | 만기 |
|---------|------|
| 010190000 | 1년 |
| 010200000 | 3년 |
| 010200001 | 5년 |
| 010210000 | 10년 |
| 010220000 | 20년 |
| 010230000 | 30년 |
- 주기 코드: `D` (DD 아님 — 중요)
- 수집 범위: 최근 90일

#### 글로벌 10Y + 기준금리 (FRED OECD, 월별)
| 국가 | 10Y 시리즈 | 기준금리 시리즈 |
|------|-----------|---------------|
| US | DGS10 (일별→월평균) | FEDFUNDS |
| KR | IRLTLT01KRM156N | BOK ECOS KeyStatisticList |
| JP | IRLTLT01JPM156N | — (미수집) |
| DE | IRLTLT01DEM156N | ECBDFR |
| GB | IRLTLT01GBM156N | IUDSOIA |

#### 연준 대차대조표 (FRED)
| 시리즈 | 내용 | 단위 |
|--------|------|------|
| WALCL | 총자산 | millions_usd |
| WSHOMCB | 국채 보유 | millions_usd |
| WSHOMCBS | MBS 보유 (미구현, WSHOMCBW → 오류) | — |
| WRESBAL | 은행 준비금 | millions_usd |
| RRPONTSYD | ON RRP 잔고 | **billions_usd** (주의) |
| WTREGEN | TGA 잔고 | millions_usd |
- 순유동성 = WALCL - WTREGEN - (RRPONTSYD × 1000)

---

## 6. 커브 무브먼트 유사도 알고리즘 (curve_similarity.gs v1.0)

### 설계
- **대상**: 미국 국채 6개 만기 (DGS1, DGS2, DGS5, DGS10, DGS20, DGS30)
- **인터벌**: 1M(21 영업일) / 3M(63 영업일) 두 가지
- **알고리즘**: 코사인 유사도 (시작-끝 delta 벡터 기반)
- **검색 범위**: 20년 history (5200일) 슬라이딩 윈도우
- **임계값**: 유사도 0.7 이상만 채택
- **중복 제거**: 30일 이내 시점은 하나만 (dedup)
- **출력**: 상위 3개 시점 + 이후 1M/3M 커브 변화 + Sonnet 해석

### Sonnet 해석 출력 구조
```json
{
  "pattern_description": "패턴명 (15자)",
  "matches": [{
    "rank": 1,
    "date": "YYYY-MM-DD",
    "why_similar": "수치 기반 유사성 근거 (2~3문장)",
    "macro_context": "당시 매크로 배경 (3~4문장)",
    "after_1m_detail": "이후 1개월 실제 변화 (수치 포함)",
    "after_3m_detail": "이후 3개월 실제 변화 (수치 포함)",
    "bond_lesson": "채권운용 교훈 (2~3문장)"
  }],
  "current_implication": "종합 시사점 (3~4문장)"
}
```

### ⚠️ 알려진 한계 — 추후 고도화 과제
- **현재**: 시작점-끝점 delta 벡터만 비교 (path shape 미반영)
- **한계**: 동일한 delta라도 경로가 다른 패턴을 구별 못 함
  - 예: "꾸준한 상승 +0.15%p" vs "급등 후 하락하여 결과적 +0.15%p"
- **고도화 방향**: 인터벌 길이를 AI가 결정 + 경로 유사도(DTW) 도입
- **데이터 요건**: 90일 주별 스냅샷 수집 구조 변경 필요

---

## 7. COMMON_RULES 현황 (v5.0)

| 번호 | 규칙 요약 | 상태 |
|------|----------|------|
| 1~13 | 인과 방향, ETF 표기, 날짜 형식, 동일 세션 인과 금지 등 | ✅ |
| 14 | related_news 배열 — 프리퀀시별 기준 | ✅ |
| 15 | WEEKLY/MONTHLY DAG 2단계 이상 인과 체인 의무 | ✅ |
| 16 | MONTHLY origin 노드 — 구조적 배경만 허용 | ✅ |
| 17 | 한국 기관투자자 특화 인과 경로 (WGBI/수출사이클/환율) | ✅ |
| 18 | NOW 스레드 날짜 정합성 원칙 | ✅ |
| 19 | 스레드 프리퀀시-주제 매칭 원칙 | ✅ |

---

## 8. 데이터 수집 현황

### FRED 매크로 지표 (14개, data_collector.gs v4.9)
(v9 대비 변경 없음 — 별도 collectYieldCurve()로 금리 시리즈 분리)

### EVENT_TARGETS (~95개)
(v9 대비 변경 없음)

---

## 9. 누적 개발 완료 항목

### 개발_1~11 (v9 MD 참조)

### 개발_12 (2026-05-08~09)

#### GAS 백엔드
- [x] `data_collector.gs` v4.8→v4.9
  - `collectYieldCurve()` v2: 미국 커브 limit=5200, 글로벌 10Y + 기준금리 수집
  - `collectKoreaYieldCurve()` 신규: BOK ECOS 817Y002 6개 만기 일별 (주기코드 `D`)
  - `computeCommonDates()`, `computeKrCommonDates()` 신규
  - 기준금리: FEDFUNDS/ECBDFR/IUDSOIA/KR BOK 수집 완료, JP 미수집
  - 글로벌 10Y에 `vs_policy`, `vs_us` 파생값 추가
- [x] `curve_similarity.gs` v1.0 신규
  - 코사인 유사도 기반 커브 무브먼트 유사 시점 탐색
  - 1M + 3M 두 기간, 상위 3개 시점
  - Sonnet 해석 (max_tokens 4000) — 상세 필드 구조
  - `data_as_of` 필드 추가 (데이터 기준일 명시)
- [x] `github_push.gs` v2.5→v2.6
  - `pushYieldCurveAndFedBalance()`: yield_curve 130일 trim + kr_curve + curve_similarity
  - curve_similarity: **KST 06:00~08:00 윈도우에만 실행** (하루 1회)
  - `runPipeline()`: 블랙아웃 체크 후 sleep(60000) → Sonnet 호출 순서 수정
- [x] **트리거 변경**: 6시간 → **1시간** 단위

#### 프론트엔드
- [x] `App.js` v2.0: 5탭 네비게이션 (PC 상단탭/모바일 하단탭)
  - 기존 floating 버튼 전부 제거
  - MacroPanel/AboutPanel placeholder → MacroPanel 실구현
- [x] `App.css`: 탭바 + MacroPanel v3 + 유사도 패널 스타일
- [x] `EventLog.js`: `embedded` prop 추가 (overlay 제거)
- [x] `ArchiveCompare.js`: `embedded` prop + 브리핑 서브탭 (📰 Daily Intelligence, 최신순)
- [x] `MacroPanel.js` v4.0 신규 (전체 구현)
  - 섹션 1: 커브 무브먼트 유사도 패널 (메인)
  - 섹션 2: 수익률 커브 (한/미/글로벌)
  - 섹션 3: 금리 지표 + 연준 유동성
- [x] `useMarketData.js`: yield_curve + fed_balance + curve_similarity fetch 추가

---

## 10. 현재 완성도 평가

**전체 완성도: 약 94%**

| 영역 | 완성도 | 비고 |
|------|--------|------|
| 데이터 파이프라인 | 99% | 금리 커브 전체 완성 |
| Claude 인과 분석 | 85% | v5.0 철학 기반 |
| 프론트엔드 UI | 93% | 5탭 + MacroPanel 완성 |
| 매크로·금리 패널 | 85% | 유사도/커브/유동성 완성. 실질금리 분해 미완 |
| 이벤트 로그 | 80% | 수집/번역/누적 완성 |
| 배포/운영 | 99% | 1시간 트리거 최적화 |
| 모바일 UX | 70% | 하단 탭바 완성, 일부 패널 개선 필요 |

---

## 11. 알려진 이슈

- VIXY Finnhub API limit 지속 — 파이프라인 영향 없음
- 한국 종착 노드 비율 위반 간헐적 발생 — 허용
- WEEKLY `date_1w_ago` 하루 오차 — 보류
- GeoMap.js 고아 상태 — 결정 필요
- 이벤트 로그 백필 데이터 링크 없음 — 구조적 한계
- `WSHOMCBS` (MBS): 현재 `WSHOMCBW` 오류 상태 — 수정 필요
- 일본 기준금리 (`IRSTJP01M156N`) 미수집 — JP `vs_policy` 컬럼 `—` 표시
- `FEDFUNDS` 3.64%: FRED 월평균값이라 실제 목표금리(4.25~4.50%)와 차이 — 허용

---

## 12. 미결 과제 리스트

### 🔴 긴급
- [ ] **Morning Mailing 모델 교체** — `claude-sonnet-4-5` → `claude-sonnet-4-6` (Retirement 2026-06-15)

### 🟡 단기 (5월)
- [ ] **About/방법론 페이지** — 데이터 소스, 3콜 아키텍처, 인과 구조 생성 방법론
- [ ] **NEWS_FEEDS 정리** — Bloomberg Mkt / FT 제거 (차단됨)
- [ ] **KRX 외국인 수급 데이터** — `collectKorea()`에 추가
- [ ] **WSHOMCBS MBS 수집** — WSHOMCBW → WSHOMCBS 수정

### 🟡 중기 (6월~7월)
- [ ] **causal_log 누적 시작** — 인과 구조 고도화 기반
- [ ] **인과 사전 (Causal Dictionary)** — causal_log 누적 후 활성화
- [ ] **이벤트 로그 ↔ DAG 연결** — 이벤트 발생 날짜의 아카이브 DAG로 점프
- [ ] **토픽별 흐름 뷰** — 특정 노드(KOSPI, 실질금리)의 시간축 변화 추적
- [ ] **GAS 트리거 5개 윈도우** — 1시간 단위 대신 정밀 윈도우 (W1~W5)로 고도화 (선택)

### 🔵 장기 (8월~9월)
- [ ] **커브 유사도 고도화** — 인터벌 AI 결정 + 경로 유사도(DTW) 도입
  - 현재 delta 벡터 → 경로(path) 전체 비교로 전환
  - 인터벌 길이를 Sonnet이 시장 상황 보고 결정하는 구조
  - 데이터 요건: 90일 주별 커브 스냅샷 수집 구조 필요
- [ ] **모바일 DAG 가독성** — 노드 크기, 폰트, 레이아웃 최적화
- [ ] **접근 제한** — 초대제 또는 기관 이메일 도메인
- [ ] **발표용 시나리오** — "AI가 이걸 맞췄다" 스토리 발굴

---

## 13. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_13 세션입니다.
진도 현황: WMN_Progress_v10.md (첨부)

완료 (개발_12):
  - data_collector.gs v4.9 (수익률 커브 20년 + 한국 커브 + 글로벌 기준금리)
  - curve_similarity.gs v1.0 (커브 무브먼트 유사도 + Sonnet 해석)
  - github_push.gs v2.6 (curve_similarity 06~08시 윈도우, 트리거 1시간)
  - MacroPanel.js v4.0 (유사도 패널 메인 + 수익률 커브 + 연준 유동성)
  - App.js v2.0 (5탭 네비게이션)
  - ArchiveCompare 브리핑 서브탭

다음 우선순위:
  1. Morning Mailing 모델 교체 (claude-sonnet-4-5 → claude-sonnet-4-6, Retirement 6/15)
  2. About/방법론 페이지
  3. causal_log 누적 시작
  4. WSHOMCBS MBS 수정
```
