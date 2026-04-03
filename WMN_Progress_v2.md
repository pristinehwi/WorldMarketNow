# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v2.0
> 마지막 업데이트: 2026-04-03
> 다음 세션 시작 시 이 파일을 Claude에게 전달할 것.

---

## 1. 개발 환경

| 항목 | 내용 |
|------|------|
| GitHub Repo | https://github.com/pristinehwi/WorldMarketNow (Public) |
| 배포 예정 | https://pristinehwi.github.io/WorldMarketNow |
| 로컬 경로 | `C:\WORK\AI_development\WorldMarketNow_Project\WorldMarketNow` |
| 프론트엔드 | `./frontend` (React, `npm start` → localhost:3000) |
| 백엔드 | Google Apps Script (WorldMarketNow 프로젝트) |
| 브랜치 | main |

---

## 2. API 키 현황 (GAS Script Properties에 저장됨)

| 속성명 | 용도 | 상태 |
|--------|------|------|
| `FRED_API_KEY` | 미국 거시경제 지표 | ✅ 등록완료 |
| `FINNHUB_API_KEY` | 가격/지수/환율 | ✅ 등록완료 |
| `BOK_API_KEY` | 한국은행 ECOS | ✅ 등록완료 |
| `CLAUDE_API_KEY` | Claude API 4-콜 | ✅ 등록완료 |
| `GITHUB_TOKEN` | GitHub JSON push | ✅ 등록완료 |

---

## 3. GAS 파일 현황

| 파일명 | 역할 | 상태 |
|--------|------|------|
| `data_collector.gs` | 5개 소스 데이터 수집 | ✅ 완성 (v1.2) |
| `claude_api.gs` | 4-콜 Claude API 아키텍처 | ✅ 완성 (v1.0) |
| `github_push.gs` | GitHub JSON push + `runPipeline()` | ✅ 완성 (v1.0) |
| `test_apis.gs` | API 연결 테스트용 | ✅ (개발용, 유지) |

### 핵심 함수
- **`runPipeline()`** — 전체 파이프라인 실행 (데이터수집 → 4콜 → GitHub push)
- 30분 트리거: **미등록** (서비스 오픈 시 등록 예정, 지금은 수동 실행)
- 출력 파일: `data/latest.json`, `data/archive/YYYYMMDD_HHmm.json`

### 데이터 소스
```
가격/지수/환율:     Finnhub (12개 심볼: SPY/QQQ/DIA/EWJ/FXI/EWG/TLT/IEF/GLD/USO/UUP/SOXX)
거시경제:          FRED (6개: FEDFUNDS/T10Y2Y/DTWEXBGS/UNRATE/CPIAUCSL/T10YIE)
한국 시장:         한국은행 ECOS KeyStatisticList (환율/금리/통화량 등 7개)
뉴스:             RSS 9개 소스 (Bloomberg/FT/NYT/CNBC/Investing.com/MarketWatch/WashingtonPost)
경제캘린더:        FRED release dates (향후 7일)
```

---

## 4. React 프론트엔드 현황

### 파일 구조
```
frontend/src/
├── App.js                    ✅ 완성
├── App.css                   ✅ 완성
├── components/
│   ├── HeadlineZone.js       ✅ 완성 (타이핑 애니메이션)
│   ├── DagGraph.js           ✅ 완성
│   │   ├── viewBox 동적 리스케일링 (노드 잘림 없음)
│   │   ├── 조상 체인 역추적 + 순차 점등 애니메이션
│   │   ├── 노드 클릭 팝업 (출처/값 표시)
│   │   ├── 호버 효과
│   │   └── 줌/패닝 (D3 zoom)
│   ├── Timeline.js           ✅ 완성
│   │   ├── 프리퀀시 탭 필터링 (당일/주간/월간 토글)
│   │   └── 이벤트 클릭 → DAG 연동
│   ├── SidePanel.js          ✅ 완성
│   └── GeoMap.js             🔶 기초 구현 (배치 문제 미해결)
└── hooks/
    └── useMarketData.js      ✅ 완성 (GitHub raw JSON fetch, 30분 자동갱신)
```

### 데이터 흐름
```
GitHub raw JSON
→ useMarketData.js (fetch)
→ App.js (상태관리)
→ HeadlineZone / DagGraph / Timeline / SidePanel / GeoMap
```

---

## 5. MVP 진도율

| 우선순위 | 항목 | 진도 | 비고 |
|----------|------|------|------|
| 1 | GAS 데이터 파이프라인 + GitHub 연동 | ✅ 100% | |
| 2 | 4-콜 Claude API 아키텍처 | ✅ 100% | |
| 3 | React 기본 레이아웃 (PC) | ✅ 95% | |
| 4 | DAG 인과 그래프 (D3.js) | ✅ 95% | 줌/패닝/팝업/애니메이션 완성 |
| 5 | 타임라인 구현 | ✅ 90% | 필터링 + DAG 연동 완성 |
| 6 | 타임라인 ↔ DAG 연동 애니메이션 | ✅ 90% | 조상 체인 순차 점등 완성 |
| 7 | 지정학 지도 (Leaflet) | 🔶 50% | 감지/렌더링은 되나 배치 문제 미해결 |
| 8 | GitHub Pages 배포 | ⬜ 0% | |
| 9 | 모바일 별도 UX | ⬜ 0% | |
| 10 | 통합 테스트 + 버그수정 | ⬜ 0% | |

**전체 진도율: 약 65%**

---

## 6. 알려진 이슈

| 이슈 | 내용 | 우선도 |
|------|------|--------|
| GeoMap 배치 | 지도가 DAG 오버레이로 안 뜨고 아래로 밀림. `position: absolute` + `main-zone` 기준 배치 시도했으나 미해결. 다음 세션에서 재시도 필요 | 높음 |
| DAG 노드 크기 | 라벨 길면 원 밖으로 삐져나올 수 있음 | 중 |
| node_modules | `.gitignore`에 포함되어 있으나 확인 필요 | 낮음 |

---

## 7. 다음 세션 작업 목록

### 최우선
- [ ] **GeoMap 배치 문제 해결** — DAG 하단 오버레이로 제대로 띄우기
- [ ] **GitHub Pages 배포** — `npm run build` + gh-pages 설정

### 그 다음
- [ ] **모바일 UX** — 스레드 카드 리스트 + 탭 구조
- [ ] **30분 트리거 등록** — 서비스 오픈 직전
- [ ] **통합 테스트 + 버그수정**

---

## 8. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발 세션입니다.
진도 현황: WMN_Progress_v2.md
현재 완료된 것: GAS 백엔드 + React 프론트 (DAG/Timeline/SidePanel 완성)
오늘 작업할 것: GeoMap 배치 문제 해결 + GitHub Pages 배포
알려진 이슈: GeoMap이 absolute 오버레이로 안 뜨는 문제 — main-zone 기준 배치 재시도 필요
```
