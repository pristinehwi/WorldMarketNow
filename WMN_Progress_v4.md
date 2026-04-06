# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v4.0
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
| `CLAUDE_API_KEY` | Claude API 3콜 | ✅ |
| `GITHUB_TOKEN` | GitHub JSON push | ✅ |
| `ALPHA_VANTAGE_KEY` | 일봉 historical (1d/1w/1m) | ✅ MQQ7W2GWSWAE1X6R |

---

## 3. GAS 파일 현황

| 파일명 | 역할 | 버전 | 상태 |
|--------|------|------|------|
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 수집 | v4.3 | ✅ |
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v4.2 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup | v2.0 | ✅ |

> ⚠️ GAS 코드는 GitHub 레포에 없음 (구글 서버에만 존재). 백업 필요시 수동 복붙.

### 핵심 함수
- **`runPipeline()`** — 전체 파이프라인 (3콜 구조)
- **`collectCandleData()`** — Alpha Vantage 25개 심볼 → Script Properties 캐시 저장
- **`collectIndices()`** — Yahoo Finance 글로벌 지수 수집 (KOSPI/KOSDAQ 변동률 수정 완료)
- **`getCandleCache()`** — Script Properties에서 candle 캐시 읽기
- **`testPipeline_NoGitHub()`** — GitHub push 없이 3콜만 테스트
- **`testIndices()`** — 지수 수집 단독 테스트

### Claude API 3콜 아키텍처 (v4.2)
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | Haiku | 시장 인식 + 스레드 결정 | 2048 |
| 1번 | Sonnet | DAG 생성 + 자체검토 통합 | 8000 |
| 2번 | Haiku | 최종 확정 + 브리핑 | 6000 |

예상 비용: **월 ~$50**

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ 등록됨 |
| `runPipeline` | 분 타이머 30분 | 상시 | ⬜ 미등록 |

### 데이터 소스
```
현재가:          Finnhub (60개 ETF 심볼, quote API)
1d/1w/1m 변동률: Alpha Vantage (25개 핵심 심볼) — Script Properties 캐시
글로벌 지수:     Yahoo Finance 비공식 (closes 배열 기준 변동률 계산)
                 한국: ^KS11(KOSPI), ^KQ11(KOSDAQ)
                 미국: ^GSPC, ^IXIC, ^DJI, ^VIX
                 일본: ^N225, 유럽: ^FTSE, ^GDAXI
                 한국 fallback: 네이버금융
거시경제:        FRED (6개 지표)
한국 시장:       한국은행 ECOS (9개 지표)
뉴스:           RSS 23개 소스
경제캘린더:      FRED release dates (향후 7일)
```

### Alpha Vantage 캐시 구조
```
매일 06:00~07:00 KST 트리거 → collectCandleData()
  → 25개 심볼 × 13초 sleep = 약 325초
  → Script Properties 'CANDLE_CACHE'에 JSON 저장

30분마다 트리거 → runPipeline()
  → Finnhub quote + getCandleCache() 읽기
  → collectIndices() 지수 수집
  → Claude 3콜 → GitHub push
```

### 알려진 이슈
- **VIXY Finnhub limit**: 간헐적 API limit. 무시해도 무방.
- **Alpha Vantage 하루 25콜**: UTC 자정(KST 09:00) 리셋.

---

## 4. React 프론트엔드 현황

### 파일 구조
```
frontend/src/
├── App.js                    ✅ v3
├── App.css                   ✅ v2.1
├── components/
│   ├── HeadlineZone.js       ✅ v3 (탭 구조, LIVE 인디케이터)
│   ├── DagGraph.js           ✅ v5 (2줄 value 렌더링, 색상 구분)
│   ├── Timeline.js           ✅ v2
│   ├── SidePanel.js          ✅
│   └── GeoMap.js             ✅
└── hooks/
    └── useMarketData.js      ✅
```

---

## 5. 진도율

| 항목 | 진도 | 비고 |
|------|------|------|
| GAS 데이터 파이프라인 | ✅ 100% | |
| 3콜 Claude API | ✅ 100% | v4.2 Haiku+Sonnet |
| 글로벌 지수 수집 | ✅ 100% | KOSPI/KOSDAQ 변동률 수정 완료 |
| React PC 레이아웃 | ✅ 100% | |
| DAG 인과 그래프 | ✅ 100% | |
| 타임라인 | ✅ 100% | |
| GeoMap | ✅ 100% | |
| GitHub Pages 배포 | ✅ 100% | |
| 모바일 UX | ✅ 80% | 세부 다듬기 필요 |
| Alpha Vantage candle 캐시 | ✅ 90% | 코드 완성, 실데이터 검증 필요 |
| `collectCandleData()` 트리거 | ✅ 100% | 등록 완료 |
| `runPipeline()` 트리거 | ⬜ 0% | 내일 candle 검증 후 등록 |
| 통합 테스트 | ⬜ 0% | 트리거 등록 후 |
| 브리핑 연동 탭 | ⬜ 0% | 별도 세션 |

**전체 진도율: 약 93%**

---

## 6. 남은 작업 상세

### 🔴 최우선 (내일 KST 09:00 이후)

#### 1. `collectCandleData()` 실데이터 검증
- GAS 에디터 → `collectCandleData` 선택 → Run
- 약 5~6분 소요 (25개 × 13초)
- 확인 사항:
  - 로그에 `✅ SPY: 1d=x%, 1w=x%, 1m=x%` 형태로 찍히는지
  - `📦 candle 캐시 저장 완료: 성공 25개, 실패 0개` 확인
  - 실패 심볼 있으면 원인 파악 (rate limit vs 심볼 오류)

#### 2. `runPipeline()` 트리거 등록
- candle 캐시 성공 확인 후 즉시 등록
- GAS 트리거 → 추가:
  - 함수: `runPipeline`
  - 이벤트 소스: 시간 기반
  - 유형: 분 타이머 → 30분마다
- 등록 후 `data/latest.json`에 `change_1w`, `change_1m` 값이 null이 아닌지 확인
- 웹페이지에서 WEEKLY/MONTHLY 스레드 정상 표시 확인

### 🟡 그 다음

#### 3. 통합 테스트
- 실데이터 기반 DAG 품질 검토
- 확인 사항:
  - OVERNIGHT: `$prev→$current (change_1d%)` 형식 정상
  - WEEKLY: `$price_1w_ago→$current (change_1w%)` 형식 정상
  - MONTHLY: `$price_1m_ago→$current (change_1m%)` 형식 정상
  - 노드 label 10자 이내 준수
  - 한국 종착 노드 50% 이하
- 웹페이지(https://pristinehwi.github.io/WorldMarketNow)에서 DAG 시각화 확인

#### 4. 브리핑 연동 탭 (별도 세션 — '지금 세계는' 개발_4)
- **선결 조건:** RSS 브리핑 GAS 코드 현황 파악 (별도 대화에서 코드 붙여넣기)
- **작업 범위:**
  1. RSS 브리핑 GAS 출력 구조 파악
  2. `briefing.json` 스키마 설계 (테마별 요약 구조)
  3. RSS 브리핑 GAS에 `data/briefing.json` → GitHub push 추가
  4. React 브리핑 탭 컴포넌트 신규 작성
  5. `useMarketData.js`에 `briefing.json` fetch 추가
  6. 탭 UI: 테마별 카드, 기사 링크, 요약 텍스트 표시

### 🟢 나중에

#### 5. 모바일 세부 다듬기
- DAG 노드 크기 모바일 최적화
- 터치 인터랙션 개선

---

## 7. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_4 세션입니다.
진도 현황: WMN_Progress_v4.md (첨부)
현재 완료: 3콜 아키텍처 v4.2 + KOSPI/KOSDAQ 변동률 수정 + GitHub Pages 배포
오늘 작업 (우선순위 순):
  1. collectCandleData() 실데이터 검증 (KST 09:00 이후 실행)
  2. runPipeline() 트리거 등록
  3. 브리핑 연동 탭 작업 시작 (RSS 브리핑 GAS 코드 붙여넣기 필요)
```
