# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v4.1
> 마지막 업데이트: 2026-04-06 (개발_3 세션)
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

### COMMON_RULES 핵심 (v4.2 기준)
1. ETF명 티커 병기 필수
2. JSON만 출력, 마크다운 금지
3. **시장별 시간축 인과 규칙**:
   - US ETF (market=US, data_as_of=US_prev_close): 전일 미국 장 마감 확정값. 현재진행형 표현 금지.
   - KR/JP 지수: 당일 장 기준. US ETF보다 시간적으로 후행.
   - 인과 방향: US ETF → KR/JP 지수 (O) / KR/JP → US ETF (X, 시간 역전 금지)
   - 브리핑 텍스트: "전일 미국 장 마감 기준 EWY -2.65% 확정 → 당일 KOSPI +1.36% 방어" 형식
   - 같은 시장·시간대 동시 움직임 자산 간 직접 인과 화살표 금지. 공통 원인 노드에서 각각 뻗어나오는 구조로 표현.
     예: "AI기대감 → SOXX", "AI기대감 → XLK" (O) / "SOXX → XLK (상대우위)" (X)
4. 노드 label 10자 이내
5. value 형식 프리퀀시별 기저→평가 가격
6. timestamp HH:MM 또는 null
7. 스레드 간 주제 중복 금지
8. 한국 종착 노드 50% 이하

### callClaude 함수 제어문자 처리
```javascript
const cleaned = raw
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```\s*$/i, '')
  .replace(/[\x00-\x1F\x7F]/g, ' ')  // 제어문자 제거
  .trim();
```

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ 등록됨 |
| `runPipeline` | 분 타이머 30분 | 상시 | ⬜ 미등록 |

### 데이터 소스
```
현재가:          Finnhub (60개 ETF 심볼) — market=US, data_as_of=US_prev_close 태깅
1d/1w/1m 변동률: Alpha Vantage (25개 심볼) — Script Properties 캐시
글로벌 지수:     Yahoo Finance 비공식 (closes 배열 기준 변동률, 수정 완료)
                 한국: ^KS11(market=KR), ^KQ11(market=KR)
                 미국: ^GSPC, ^IXIC, ^DJI, ^VIX (market=US)
                 일본: ^N225 (market=JP) / 유럽: ^FTSE, ^GDAXI (market=EU)
거시경제:        FRED (6개 지표)
한국 시장:       한국은행 ECOS (9개 지표)
뉴스:           RSS 23개 소스 (최근 24시간)
경제캘린더:      FRED release dates (향후 7일)
```

### 알려진 이슈
- **VIXY Finnhub limit**: 간헐적 API limit. 무시해도 무방.
- **Alpha Vantage 하루 25콜**: UTC 자정(KST 09:00) 리셋.
- **QQQ 등 candle null 심볼 value 미표시**: WEEKLY 스레드에서 change_1w=null일 때 현재가도 안 보이는 DagGraph.js 렌더링 버그. 내일 candle 캐시 검증 후 확인/수정.

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
│   │                            ⚠️ null value 미표시 버그 확인 필요
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
| 시장별 시간축 인과 규칙 | ✅ 100% | market/data_as_of 태깅 + COMMON_RULES 3번 |
| 동시발생 자산 간 인과 금지 규칙 | ✅ 100% | COMMON_RULES 3번 ⑤항 추가 |
| React PC 레이아웃 | ✅ 100% | |
| DAG 인과 그래프 | ✅ 95% | null value 렌더링 버그 잔존 |
| 타임라인 | ✅ 100% | |
| GeoMap | ✅ 100% | |
| GitHub Pages 배포 | ✅ 100% | |
| Alpha Vantage candle 캐시 | ✅ 90% | 코드 완성, 실데이터 검증 필요 |
| `collectCandleData()` 트리거 | ✅ 100% | 등록 완료 (6am~7am KST) |
| `runPipeline()` 트리거 | ⬜ 0% | 내일 candle 검증 후 등록 |
| **모바일 UI 점검** | ⬜ 0% | **🔴 실기기 접속 점검 필요** |
| 통합 테스트 | ⬜ 0% | 트리거 등록 후 |
| 브리핑 연동 탭 | ⬜ 0% | 별도 세션 |

**전체 진도율: 약 93%**

---

## 6. 남은 작업 상세

### 🔴 최우선 (내일 KST 09:00 이후)

#### 1. `collectCandleData()` 실데이터 검증
- GAS 에디터 → `collectCandleData` 선택 → Run (약 5~6분)
- 확인: `📦 candle 캐시 저장 완료: 성공 25개, 실패 0개`

#### 2. `runPipeline()` 트리거 등록
- candle 성공 확인 후 즉시 등록
- GAS 트리거 → 함수: `runPipeline` / 분 타이머 / 30분마다
- 등록 후 `data/latest.json`에서 `change_1w`, `change_1m` null 여부 확인

#### 3. DAG null value 렌더링 버그 수정
- WEEKLY 스레드에서 `change_1w=null`인 심볼(QQQ 등)의 현재가가 노드에 미표시되는 문제
- `DagGraph.js` value 렌더링 로직 점검
- candle 캐시 들어오면 자연 해결될 수 있으나, null 케이스 방어 로직 추가 필요

### 🔴 모바일 UI 점검

**실기기(안드로이드/아이폰)에서 https://pristinehwi.github.io/WorldMarketNow 직접 접속하여 확인**

- DAG: 노드 크기/폰트 가독성, 터치 줌/패닝
- HeadlineZone 탭: 스와이프/탭 전환 UX
- Timeline: 모바일 섹션 레이아웃
- SidePanel: 접힘/펼침 동작
- GeoMap: 터치 드래그
- 전체 폰트 크기 (기관투자자 대상 → 가독성 최우선)

### 🟡 그 다음

#### 4. 통합 테스트
- candle 캐시 반영 후 WEEKLY/MONTHLY 스레드 형식 확인
- 시간축 인과 방향 + 동시발생 자산 처리 브리핑 텍스트 검토

#### 5. 브리핑 연동 탭 (별도 세션)
- RSS 브리핑 GAS 코드 현황 파악 (코드 붙여넣기 필요)
- `briefing.json` 스키마 설계 → GAS push 추가 → React 탭 신규 작성

---

## 7. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_4 세션입니다.
진도 현황: WMN_Progress_v4.md (첨부)
현재 완료: 3콜 아키텍처 v4.2 + KOSPI/KOSDAQ 변동률 수정 +
           시장별 시간축 인과 규칙 + 동시발생 자산 인과 금지 규칙
오늘 작업 (우선순위 순):
  1. collectCandleData() 실데이터 검증 (KST 09:00 이후)
  2. runPipeline() 트리거 등록
  3. DAG null value 렌더링 버그 확인/수정
  4. 모바일 UI 점검
  5. 브리핑 연동 탭 작업 시작 (RSS 브리핑 GAS 코드 붙여넣기 필요)
```
