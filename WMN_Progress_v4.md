# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v4.2
> 마지막 업데이트: 2026-04-06 (개발_3 세션 최종)
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

### COMMON_RULES 현황 (GAS 저장 기준)
```
1. ETF명 티커 병기 필수
2. JSON만 출력, 마크다운 금지
3. 시간축 인과 규칙 (market/data_as_of 기반)
   - US ETF → KR/JP 지수 (O) / 역방향 (X)
   - 동시발생 자산 간 직접 인과 화살표 금지 → 공통 원인 노드 명시
   - US ETF 브리핑: "전일 미국 장 마감 기준" 확정 표현 사용
4. 노드 label 10자 이내
5. value 형식 프리퀀시별 기저→평가 가격
6. timestamp HH:MM 또는 null
7. 스레드 간 주제 중복 금지
8. 한국 종착 노드 50% 이하
9. headline/title 띄어쓰기 준수 (글자 수 절약 위한 생략 금지)
```

### callClaude 제어문자 처리
```javascript
const cleaned = raw
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```\s*$/i, '')
  .replace(/[\x00-\x1F\x7F]/g, ' ')
  .trim();
```

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ 등록됨 |
| `runPipeline` | 분 타이머 30분 | 상시 | ⬜ 미등록 |

### 데이터 소스
```
현재가:          Finnhub (60개 ETF) — market=US, data_as_of=US_prev_close 태깅
1d/1w/1m 변동률: Alpha Vantage (25개 심볼) — Script Properties 캐시
글로벌 지수:     Yahoo Finance (closes 배열 기준 변동률, 수정 완료)
                 한국(market=KR), 미국(market=US), 일본(market=JP), 유럽(market=EU)
거시경제:        FRED (6개 지표)
한국 시장:       한국은행 ECOS (9개 지표)
뉴스:           RSS 23개 소스 (최근 24시간)
경제캘린더:      FRED release dates (향후 7일)
```

### 알려진 이슈
- **VIXY Finnhub limit**: 간헐적. 무시해도 무방.
- **Alpha Vantage 25콜/일**: UTC 자정(KST 09:00) 리셋.
- **candle null 심볼 value 미표시**: WEEKLY 스레드에서 change_1w=null일 때 현재가도 미표시. DagGraph.js 방어 로직 필요. 내일 candle 캐시 후 자연 해결 여부 확인.

---

## 4. React 프론트엔드 현황

```
frontend/src/
├── App.js                    ✅ v3
├── App.css                   ✅ v2.1
├── components/
│   ├── HeadlineZone.js       ✅ v3
│   ├── DagGraph.js           ✅ v5  ⚠️ null value 미표시 버그 잔존
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
| 글로벌 지수 수집 | ✅ 100% | 변동률 수정 완료 |
| 시장별 시간축 인과 규칙 | ✅ 100% | market/data_as_of 태깅 완료 |
| React PC 레이아웃 | ✅ 100% | |
| DAG 인과 그래프 | ✅ 95% | null value 버그 잔존 |
| 타임라인 | ✅ 100% | |
| GeoMap | ✅ 100% | |
| GitHub Pages 배포 | ✅ 100% | |
| Alpha Vantage candle 캐시 | ✅ 90% | 실데이터 검증 필요 |
| `collectCandleData()` 트리거 | ✅ 100% | 6am~7am KST 등록 완료 |
| `runPipeline()` 트리거 | ⬜ 0% | 내일 candle 검증 후 |
| **모바일 UI 점검** | ⬜ 0% | **🔴 실기기 점검 필요** |
| 통합 테스트 | ⬜ 0% | 트리거 등록 후 |
| 브리핑 연동 탭 | ⬜ 0% | 별도 세션 |
| **인과 구조 고도화** | ⬜ 0% | **🔵 별도 설계 세션 필요** |

**전체 진도율: 약 93%**

---

## 6. 남은 작업 상세

### 🔴 최우선 (내일 KST 09:00 이후)

#### 1. `collectCandleData()` 실데이터 검증
- GAS → `collectCandleData` 실행 (약 5~6분)
- 확인: `📦 candle 캐시 저장 완료: 성공 25개, 실패 0개`

#### 2. `runPipeline()` 트리거 등록
- 함수: `runPipeline` / 분 타이머 / 30분마다
- 등록 후 `change_1w`, `change_1m` null 여부 확인

#### 3. DAG null value 렌더링 버그 확인
- candle 캐시 들어온 후 WEEKLY/MONTHLY 노드 value 정상 표시 여부 확인
- 여전히 미표시 시 `DagGraph.js` 방어 로직 추가

### 🔴 모바일 UI 점검
실기기에서 https://pristinehwi.github.io/WorldMarketNow 직접 접속:
- DAG 노드 가독성, 터치 줌/패닝
- HeadlineZone 탭 스와이프 UX
- Timeline, SidePanel, GeoMap 터치 동작
- 전체 폰트 크기 (기관투자자 대상 가독성)

### 🟡 그 다음

#### 4. 통합 테스트
- OVERNIGHT/WEEKLY/MONTHLY 스레드 형식 전체 확인
- 시간축 인과 방향 + 동시발생 자산 처리 브리핑 텍스트 검토

#### 5. 브리핑 연동 탭 (별도 세션)
- RSS 브리핑 GAS 코드 붙여넣기 필요
- `briefing.json` 스키마 설계 → GAS push 추가 → React 탭 신규 작성

### 🔵 인과 구조 고도화 (별도 설계 세션)

현재 인과 추론의 한계: 상관관계를 인과관계처럼 포장하는 수준.
근본 원인: 같은 날 데이터를 한꺼번에 던지니 시간 순서 정보 부재.

**고도화 방향 3가지:**

**A. 시계열 선행/후행 구조화**
- 장중 데이터를 시간대별로 쪼개서 "미국 오전 → 오후 → 유럽 → 아시아" 흐름 명시
- 현재 market/data_as_of 태깅이 그 첫 단계 — 더 세분화 필요

**B. 뉴스 이벤트 하이브리드 활용**
- 뉴스를 DAG 루트로 강제하는 건 부작용 있음:
  - 뉴스 없는 날 DAG 루트 소실
  - 뉴스 자체가 가격의 결과인 경우 인과 역전
  - RSS 딜레이로 인한 구조 왜곡
  - 뉴스 방향성 오판 (이란 협상 진전 → 유가 상승 vs 하락)
- 따라서: 가격 데이터가 DAG 뼈대, 뉴스는 edge label/briefing에서 "왜"를 설명하는 보조 레이어로 활용 (하이브리드)

**C. 인과 vs 상관 분리 레이어**
- edge 타입을 `causal` / `correlative` / `contextual`로 구분
- Claude가 명시적으로 선언하게 프롬프트 구조화
- 프론트에서 실선/점선 등으로 시각적 구분

**우선순위:** A → C → B 순으로 접근 권장.
A는 현재 파이프라인 확장으로 구현 가능, C는 프롬프트+프론트 동시 수정 필요, B는 가장 복잡.

---

## 7. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_4 세션입니다.
진도 현황: WMN_Progress_v4.md (첨부)
현재 완료: 3콜 아키텍처 v4.2 + 시간축 인과 규칙 + GitHub Pages 배포
오늘 작업 (우선순위 순):
  1. collectCandleData() 실데이터 검증 (KST 09:00 이후)
  2. runPipeline() 트리거 등록
  3. DAG null value 버그 확인/수정
  4. 모바일 UI 점검
  5. 브리핑 연동 탭 또는 인과 고도화 설계 중 선택
참고: RSS 브리핑 GAS 코드 별도 대화에서 찾아 붙여넣기 필요
```
