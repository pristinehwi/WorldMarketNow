# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v5.0
> 마지막 업데이트: 2026-04-08 (개발_5 세션 최종)
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
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v4.3 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup | v2.0 | ✅ |

> ⚠️ GAS 코드는 GitHub 레포에 없음 (구글 서버에만 존재). 백업 필요시 수동 복붙.

### 핵심 함수
- **`runPipeline()`** — 전체 파이프라인 (3콜 구조)
- **`collectCandleData()`** — Alpha Vantage 25개 심볼 → Script Properties 캐시 저장
- **`collectIndices()`** — Yahoo Finance 글로벌 지수 수집
- **`getCandleCache()`** — Script Properties에서 candle 캐시 읽기
- **`testPipeline_NoGitHub()`** — GitHub push 없이 3콜만 테스트
- **`testIndices()`** — 지수 수집 단독 테스트

### Claude API 3콜 아키텍처 (v4.3)
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | Haiku | 시장 인식 + 스레드 결정 | 2048 |
| 1번 | Sonnet | DAG 생성 + 자체검토 통합 | 8000 |
| 2번 | Haiku | 최종 확정 + 브리핑 | 6000 |

예상 비용: **월 ~$50**

### COMMON_RULES 현황 (v4.3 기준)
```
1. ETF명 티커 병기 필수
2. JSON만 출력, 마크다운 금지
3. 시간축 인과 규칙 (market/data_as_of 기반)
   - US ETF → KR/JP 지수 (O) / 역방향 (X)
   - 동시발생 자산 간 직접 인과 화살표 금지 → 공통 원인 노드 명시
   - US ETF 브리핑: "전일 미국 장 마감 기준" 확정 표현 사용
4. 노드 label 10자 이내
5. value 형식 "[MM/DD] $기저가→[MM/DD] $평가가 (변동률%)"
6. timestamp HH:MM 또는 null
7. 스레드 간 주제 중복 금지
8. 한국 종착 노드 50% 이하
9. headline/title 띄어쓰기 준수
10. layer_summary.layer1은 "전일 미국: XXX / 당일 아시아: YYY" 형식. vs 표현 금지.
11. edge label 6자 이내
```

### 프리퀀시 체계 (v4.3 변경)
| 구분 | 이전 | 현재 | 비고 |
|------|------|------|------|
| 단기 | OVERNIGHT | **NOW** | 장중/장후/어느 시장이든 무관한 최신 흐름 |
| 중기 | WEEKLY | WEEKLY | 동일 |
| 장기 | MONTHLY | MONTHLY | 동일 |

> 프론트엔드는 `OVERNIGHT` fallback 처리 포함 (구 데이터 호환)

### fetchCandles() 반환 필드 (v4.3 추가)
```javascript
return {
  change_1d, change_1w, change_1m,
  price_1d_ago, price_1w_ago, price_1m_ago,
  date_current,   // 추가
  date_1d_ago,    // 추가
  date_1w_ago,    // 추가
  date_1m_ago,    // 추가
};
```
- `idx_1w`: 5→4 수정 (기저일 3/30→3/31 기준)

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ 등록됨 |
| `runPipeline` | 분 타이머 30분 | 상시 | ⬜ 미등록 |

### 알려진 이슈
- **VIXY Finnhub limit**: 간헐적. 무시해도 무방.
- **Alpha Vantage 25콜/일**: UTC 자정(KST 09:00) 리셋.
- **수평 edge 펄스 두께**: 수평선 펄스가 대각선 대비 얇아 보이는 현상 잔존. SVG `line`/`path` 모두 시도했으나 미해결. 추후 곡선 path 방식으로 재시도 예정.

---

## 4. React 프론트엔드 현황

```
frontend/src/
├── App.js                    ✅ v4
├── App.css                   ✅ v3
├── components/
│   ├── HeadlineZone.js       ✅ v4  (NOW 레이블, 탭 강조 애니메이션)
│   ├── DagGraph.js           ✅ v6  (edge pulse 무한반복, 노드 트랜지션, 미니차트, 화살표 수정)
│   ├── Timeline.js           ✅ v3  (히트맵, 주파수 범례, NOW fallback)
│   ├── SidePanel.js          ✅ v2  (NOW fallback)
│   └── GeoMap.js             🗑️ 제거됨
└── hooks/
    └── useMarketData.js      ✅
```

---

## 5. 개발_5 세션 완료 항목

### GAS 백엔드
- [x] `collectCandleData()` 25개 전부 성공 확인
- [x] `runPipeline()` 정상 작동 확인
- [x] `fetchCandles()` 날짜 필드 추가 (`date_current/1d/1w/1m`)
- [x] `idx_1w` 5→4 수정 (기저일 정확도 개선)
- [x] COMMON_RULES 10번 추가 (layer_summary 시간축 분리)
- [x] COMMON_RULES 11번 추가 (edge label 6자 이내)
- [x] 프리퀀시 `OVERNIGHT` → `NOW` 전면 교체 (claude_api.gs v4.3)

### React 프론트엔드
- [x] GeoMap 완전 제거
- [x] **A: edge 펄스 무한반복** — 모든 edge 균일 적용, 수평선 버그 해결(0.5px 오프셋)
- [x] **B: 스레드 전환 노드 트랜지션** — 아래서 올라오며 페이드인
- [x] **C: 노드 클릭 미니 차트** — sparkline 팝업, 모바일 중앙 고정
- [x] **D: 히트맵** — 주파수 색 통일, ▲▼ 화살표 강도 표시
- [x] SidePanel flex 레이아웃 (DAG 짤림 해결)
- [x] edge 화살표 수정 (refX 60→8, 노드 경계 기준 끝점)
- [x] edge label 동적 폰트 크기 (연결 노드 fs 평균)
- [x] 노드 크기 동적 계산 (autoScale: 노드 수 기반)
- [x] Timeline 주파수 범례 추가
- [x] HeadlineZone 선택 탭 강조 (1.5배 크기, 깜빡이는 테두리)
- [x] NOW/OVERNIGHT fallback 처리 (구 데이터 호환)
- [x] "주간(Weekly) 흐름" / "월간(Monthly) 흐름" 레이블
- [x] thread-group 양쪽 가로선
- [x] GitHub push + GitHub Pages 배포 완료

---

## 6. 남은 작업

### 🔴 최우선
1. **`runPipeline()` 30분 트리거 등록** — candle 캐시 검증 완료됐으니 등록 가능
2. **모바일 UI 점검** — 실기기에서 https://pristinehwi.github.io/WorldMarketNow 접속
   - DAG 노드 가독성, 터치 줌/패닝
   - HeadlineZone 탭 스와이프 UX
   - Timeline, SidePanel 터치 동작

### 🟡 그 다음
3. **통합 테스트** — `runPipeline()` NOW/WEEKLY/MONTHLY 스레드 형식 전체 확인
4. **브리핑 연동 탭** (별도 세션)
   - RSS 브리핑 GAS 코드 붙여넣기 필요
   - `briefing.json` 스키마 설계 → GAS push → React 탭 신규 작성

### 🔵 인과 구조 고도화 (별도 설계 세션)
**A. 시계열 선행/후행 구조화** ← 우선순위 1
- 장중 데이터를 시간대별로 쪼개서 "미국 오전 → 오후 → 유럽 → 아시아" 흐름 명시

**B. 뉴스 이벤트 하이브리드 활용** ← 우선순위 3
- 가격 데이터가 DAG 뼈대, 뉴스는 edge label/briefing에서 "왜"를 설명하는 보조 레이어

**C. 인과 vs 상관 분리 레이어** ← 우선순위 2
- edge 타입을 `causal` / `correlative` / `contextual`로 구분
- 프론트에서 실선/점선 등으로 시각적 구분

### 🔧 기술 부채
- **수평 edge 펄스 두께 미해결** — 곡선 path 방식 재시도 필요
- **DagGraph.js ESLint warnings** — `useCallback`, `animFrameRef` 등 미사용 변수 정리
- **WMN_Progress_v4.md 삭제** — 완료 후 제거

---

## 7. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_6 세션입니다.
진도 현황: WMN_Progress_v5.md (첨부)
현재 완료: 프론트 WOW factor (pulse/transition/minichart/heatmap) + NOW 레이블 + GitHub Pages 배포
오늘 작업 (우선순위 순):
  1. runPipeline() 30분 트리거 등록
  2. 모바일 UI 점검
  3. 통합 테스트 (NOW/WEEKLY/MONTHLY 스레드 확인)
  4. 브리핑 연동 탭 or 인과 구조 고도화 설계 중 선택
```
