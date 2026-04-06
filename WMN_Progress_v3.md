# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v3.1
> 마지막 업데이트: 2026-04-06
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
| `CLAUDE_API_KEY` | Claude API 4콜 | ✅ |
| `GITHUB_TOKEN` | GitHub JSON push | ✅ |
| `ALPHA_VANTAGE_KEY` | 일봉 historical (1d/1w/1m) | ✅ MQQ7W2GWSWAE1X6R |

---

## 3. GAS 파일 현황

| 파일명 | 역할 | 버전 | 상태 |
|--------|------|------|------|
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 수집 | v4.3 | ✅ |
| `claude_api.gs` | 4-콜 Claude API 아키텍처 | v4.1 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup | v2.0 | ✅ |

### 핵심 함수
- **`runPipeline()`** — 전체 파이프라인
- **`collectCandleData()`** — Alpha Vantage 25개 심볼 → Script Properties 캐시 저장 (매일 새벽 트리거용)
- **`collectIndices()`** — Yahoo Finance 비공식 API로 글로벌 지수 수집
- **`getCandleCache()`** — Script Properties에서 candle 캐시 읽기
- **`testCandle()`** — SPY candle 단독 테스트
- 트리거: **미등록** (candle 캐시 검증 후 등록 예정)

### 데이터 소스
```
현재가:          Finnhub (60개 ETF 심볼, quote API)
1d/1w/1m 변동률: Alpha Vantage (25개 핵심 심볼) — Script Properties 캐시 구조
글로벌 지수:     Yahoo Finance 비공식
                 한국: ^KS11(KOSPI), ^KQ11(KOSDAQ)
                 미국: ^GSPC(S&P500), ^IXIC(NASDAQ), ^DJI(Dow), ^VIX
                 일본: ^N225(닛케이225)
                 유럽: ^FTSE(FTSE100), ^GDAXI(DAX)
                 한국 fallback: 네이버금융
거시경제:        FRED (6개 지표)
한국 시장:       한국은행 ECOS (9개 지표)
뉴스:           RSS 23개 소스
경제캘린더:      FRED release dates (향후 7일)
```

### Alpha Vantage 캐시 구조
```
매일 새벽 1회 트리거 → collectCandleData()
  → 25개 심볼 × 13초 sleep = 약 325초
  → Script Properties 'CANDLE_CACHE'에 JSON 저장

30분마다 트리거 → runPipeline()
  → Finnhub quote + getCandleCache() 읽기
  → collectIndices() 지수 수집
  → Claude 4콜 → GitHub push
```

### 알려진 이슈
- **KOSPI/KOSDAQ 변동률 이상**: Yahoo Finance `chartPreviousClose` 기준 오류. 수정 필요.
- **VIXY Finnhub limit**: 간헐적 API limit. 무시해도 무방.
- **Alpha Vantage 하루 25콜**: UTC 자정(KST 09:00) 리셋. 테스트 시 할당량 주의.

---

## 4. React 프론트엔드 현황

### 파일 구조
```
frontend/src/
├── App.js                    ✅ v3
├── App.css                   ✅ v2.1 (통합 완성본)
├── components/
│   ├── HeadlineZone.js       ✅ v3 (탭 구조, LIVE 인디케이터, 프리퀀시 정렬)
│   ├── DagGraph.js           ✅ v5 (2줄 value 렌더링, 상승/하락 색상 구분)
│   ├── Timeline.js           ✅ v2 (프리퀀시 그룹 섹션, 시간축 시각화)
│   ├── SidePanel.js          ✅
│   └── GeoMap.js             ✅
└── hooks/
    └── useMarketData.js      ✅
```

### DAG 노드 value 형식
```
OVERNIGHT: "$58.97→$59.25" (9px) + "(+0.47%)" (10px, 초록/빨강)
WEEKLY:    "$56.12→$59.25" (9px) + "(+5.56%)" (10px)
MONTHLY:   "$52.34→$59.25" (9px) + "(+13.19%)" (10px)
지수 노드:  "5,460 (+3.47%)" 단일 줄
change_1w/1m null이면: 현재가만 표시, 등락 금지
```

---

## 5. Claude API 4콜 아키텍처 (v4.1)

### COMMON_RULES 핵심
- ETF명 티커 병기 필수 (예: `유로화ETF(FXE)`)
- indices 지수 노드는 지수명 그대로 (예: `KOSPI`, `S&P500`)
- 프리퀀시별 기저→평가 가격 형식 (OVERNIGHT/WEEKLY/MONTHLY)
- change_1w/1m null이면 등락 표시 금지
- 노드 label 10자 이내
- 스레드 4~6개 (OVERNIGHT 최대 4, WEEKLY 최소 1, MONTHLY 최소 1)
- 주말/공휴일 모드: 뉴스/발언 중심, WEEKLY/MONTHLY 비중 높임

---

## 6. 진도율

| 항목 | 진도 | 비고 |
|------|------|------|
| GAS 데이터 파이프라인 | ✅ 100% | |
| 4콜 Claude API | ✅ 100% | v4.1 |
| 글로벌 지수 수집 | ✅ 100% | Yahoo Finance, 변동률 이상 수정 필요 |
| React PC 레이아웃 | ✅ 100% | 디자인 격상 완료 |
| DAG 인과 그래프 | ✅ 100% | 2줄 렌더링, 색상 구분 |
| 타임라인 | ✅ 100% | 섹션 그룹, 시간축 시각화 |
| GeoMap | ✅ 100% | |
| GitHub Pages 배포 | ✅ 100% | |
| 모바일 UX | ✅ 80% | 탭구조 완성, 세부 다듬기 필요 |
| Alpha Vantage candle 캐시 | ✅ 90% | 코드 완성, 실데이터 검증 필요 |
| 30분 트리거 등록 | ⬜ 0% | candle 검증 후 |
| KOSPI/KOSDAQ 변동률 수정 | ⬜ 0% | |
| 메일링 브리핑 연동 | ⬜ 0% | 별도 탭, 나중에 |
| 통합 테스트 | ⬜ 0% | |

**전체 진도율: 약 88%**

---

## 7. 남은 작업 목록

### 🔴 최우선
- [ ] **candle 캐시 실데이터 검증** — KST 09:00 이후 `collectCandleData()` 실행, 25개 심볼 change_1w/1m 정상 확인
- [ ] **트리거 등록**
  - 매일 새벽 01:00 KST: `collectCandleData()`
  - 30분마다: `runPipeline()`

### 🟡 그 다음
- [ ] **KOSPI/KOSDAQ 변동률 이상 수정** — Yahoo Finance `chartPreviousClose` 파라미터 조정
- [ ] **통합 테스트** — 실데이터 기반 DAG 품질 검토

### 🟢 나중에
- [ ] **메일링 브리핑 연동** — 아침 해외언론 RSS + AI브리핑 결과를 사이트로
  - 메일링 GAS에 `data/briefing.json` GitHub push 추가
  - 프론트엔드 브리핑 탭 추가
- [ ] **모바일 세부 다듬기**

---

## 8. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발 세션입니다.
진도 현황: WMN_Progress_v3.md
현재 완료: GAS 백엔드 v4.3 + React 프론트 전면 개선 + GitHub Pages 배포
오늘 작업: candle 캐시 실데이터 검증 + 트리거 등록
핵심 이슈: KOSPI/KOSDAQ Yahoo Finance 변동률 이상 수정 필요
```
