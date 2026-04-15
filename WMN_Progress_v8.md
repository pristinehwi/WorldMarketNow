# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v8.0
> 마지막 업데이트: 2026-04-15 (개발_9 세션 완료)
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
| 프론트 배포 | `cd frontend && npm run deploy` (로컬 수동) |

---

## 2. API 키 현황 (GAS Script Properties)

### WorldMarketNow GAS
| 속성명 | 용도 | 상태 |
|--------|------|------|
| `FRED_API_KEY` | 미국 거시경제 지표 | ✅ |
| `FINNHUB_API_KEY` | 현재가/quote | ✅ |
| `BOK_API_KEY` | 한국은행 ECOS | ✅ |
| `CLAUDE_API_KEY` | Claude API 3콜 | ✅ |
| `GITHUB_TOKEN` | GitHub JSON push | ✅ |
| `ALPHA_VANTAGE_KEY` | 일봉 historical | ✅ |

### RSS 메일링 GAS
| 속성명 | 용도 | 상태 |
|--------|------|------|
| `GITHUB_TOKEN` | 브리핑 HTML GitHub push | ✅ |

---

## 3. GAS 파일 현황

### WorldMarketNow GAS
| 파일명 | 역할 | 버전 | 상태 |
|--------|------|------|------|
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 수집 | v4.4+ | ✅ |
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v4.8 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup + 블랙아웃 | v2.3 | ✅ |

### RSS 메일링 GAS
| 파일명 | 역할 | 상태 |
|--------|------|------|
| `fetchAndSendNews()` | 뉴스 수집 + Claude 분류/요약 + 메일 발송 | ✅ |
| `briefing_github.gs` | 브리핑 HTML 생성 + GitHub push + index.json 관리 | ✅ |

### Claude API 3콜 아키텍처 (v4.8)
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | **Sonnet** | 시장 인식 + 스레드 결정 + 세션 판단 | 3000 |
| 1번 | Sonnet | DAG 생성 + 자체검토 통합 + 세션 주입 | 9000 |
| 2번 | Haiku | 최종 확정 + 브리핑 (strip→call→merge) | 6000 |

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ |
| `runPipeline` | 시간 타이머 | **2시간마다** | ✅ |
| `fetchAndSendNews` (메일링) | Day timer | 매일 1회 | ✅ |

### 비용 현황 (2시간 트리거 기준)
| 항목 | 값 |
|------|---|
| 회당 비용 (실측) | ~$0.21 |
| 하루 실행 횟수 (블랙아웃 제외) | ~9~10회 |
| 월간 비용 (평일 22일) | ~$41 (~6만원) |

### 블랙아웃 스케줄 (KST 기준) — v2.3
| 시간대 | 상태 |
|--------|------|
| 평일 00:00~06:30 | ✅ 실행 (미국 장) |
| 평일 06:30~09:01 | ⏸️ 스킵 |
| 평일 09:01~16:01 | ✅ 실행 (한국 장) |
| 평일 16:01~17:00 | ⏸️ 스킵 |
| 평일 17:00~22:31 | ✅ 실행 (유럽 장) |
| 평일 22:31~24:00 | ✅ 실행 (미국 장 개장) |
| 토 09:00~월 09:00 | ⏸️ 스킵 (주말) |

### GitHub push 파일 구조
```
data/
├── latest.json
├── prices.json
├── archive/             — 14일 보관
└── briefing/            — 2년 보관
    ├── index.json
    └── YYYY-MM-DD.html
```

### GitHub Actions
| 파일 | 역할 | 상태 |
|------|------|------|
| `.github/workflows/deploy-briefing.yml` | briefing push 시 자동 gh-pages 배포 | ✅ (CI=false, npm install) |

---

## 4. COMMON_RULES 현황 (v4.8)

| 번호 | 규칙 요약 | 상태 |
|------|----------|------|
| 1~16 | 인과 방향, ETF 표기, 날짜 형식 등 기존 규칙 | ✅ |
| 17 | nodes detail 필드 — 30자 이내 한 문장 | ✅ |
| 18 | edges rationale 필드 — 30자 이내 한 문장 | ✅ |
| 19 | 스레드 프리퀀시-주제 매칭 원칙 | ✅ |
| 추가 | US_intraday 처리 원칙 | ✅ |
| Step2 | NOW/WEEKLY 프리퀀시별 value 기간 자체검토 강화 | ✅ |

### NOW 정의 4구간
| 세션 | KST 시간 | NOW 스레드 구성 원칙 |
|------|---------|-------------------|
| 아시아장중 | 09:00~15:30 | 전일 미국 장 → 당일 아시아 장 반응 |
| 유럽장중 | 17:00~22:30 | 아시아 마감 배경 + 유럽 장중 전면 |
| 미국장중 | 22:30~익일06:00 | US ETF 전면, 한국 종착 노드 불필요 |
| 장외 | 06:00~09:00, 15:30~17:00 | 최근 마감 시장 종합 |

---

## 5. React 프론트엔드 현황

```
frontend/src/
├── App.js                    ✅ v7 (BriefingPanel, Daily Intelligence Archive)
├── App.css                   ✅ v6
├── components/
│   ├── HeadlineZone.js       ✅ v6
│   ├── DagGraph.js           ✅ v11 (노드 패딩/lineHeight 개선)
│   ├── Timeline.js           ✅ v4
│   └── SidePanel.js          ✅ v2
└── hooks/
    └── useMarketData.js      ✅ v3
```

---

## 6. 누적 개발 완료 항목 전체

### 개발_1~8 (이전 세션)
- GAS 백엔드 전체 구축 (데이터 수집, 3콜 Claude API, GitHub push)
- React 프론트엔드 전체 구축 (DAG, Timeline, HeadlineZone, SidePanel)
- KOSPI/KOSDAQ 교차검증 (Yahoo + 네이버)
- NOW 정의 4구간 + 세션 주입
- 블랙아웃 스케줄 v2.3
- RSS 메일링 브리핑 아카이브
- 모바일 autoScale, CANVAS_H 동적 계산
- Daily Intelligence Archive UI
- GitHub Actions 자동 배포

### 개발_9 (2026-04-14~15)
- [x] `claude_api.gs` v4.8 — detail/rationale 필드 추가 (규칙 17/18/19)
- [x] 2번 콜 strip→call→merge 패턴 (input 경량화 + detail/rationale 병합)
- [x] 1번 콜 input 경량화 — key_symbols 기반 필터링 (60개 → 15~20개)
- [x] 0번 콜 max_tokens 3000, 1번 9000, 2번 6000 최적화
- [x] US_intraday data_as_of 구분 (장중/마감 후 자동 판단)
- [x] `isCandleDateStale()` 개선 — 평일 16:00 이후 today 기준 stale 판단
- [x] stale 보정 시 price_1d_ago/change_1d도 Finnhub prev_close 기준 교체
- [x] `fetchNaverIndex()` — fluctuationsRatio 역산으로 prev_close 계산 (장중 틱 대비 문제 해결)
- [x] 한국 지수 prev_close Yahoo 기준 유지 (네이버 역산은 교차검증용)
- [x] COMMON_RULES Step2 자체검토 강화 (NOW/WEEKLY 프리퀀시 기간 위반 감지)
- [x] COMMON_RULES 규칙 19 — 스레드 주제-프리퀀시 매칭 원칙
- [x] `runPipeline` 트리거 2시간으로 변경
- [x] `deploy-briefing.yml` 수정 (npm install + CI=false)
- [x] DagGraph.js v11 — 모바일 노드 패딩/lineHeight 개선

---

## 7. 현재 완성도 평가

**전체 완성도: 약 82%**

| 영역 | 완성도 | 비고 |
|------|--------|------|
| 데이터 파이프라인 | 90% | VIXY Finnhub limit 지속, 구조적 한계 허용 |
| Claude 인과 분석 | 75% | 프리퀀시 위반 간헐적 발생 |
| 프론트엔드 UI | 80% | 노드/엣지 팝업 미구현 |
| 모바일 UX | 60% | DAG 가독성 구조적 한계 |
| 배포/운영 | 95% | 브리핑 아카이브 자동화 완료 |

---

## 8. 알려진 이슈 (치명적 오류 없음)

- VIXY Finnhub API limit 지속 — 파이프라인 영향 없음
- 네이버 장외 시간 점검 시 Yahoo 지연 재발 가능 — 구조적 한계
- Claude가 NOW 스레드에 WEEKLY/MONTHLY 데이터 간헐적 사용 — COMMON_RULES로 완화
- 모바일 DAG 노드 가독성 — 보류 (크리티컬 아님)

---

## 9. 퀄리티 향상 로드맵

### 🔴 1순위 — 신뢰도를 만드는 것들

**① 인과 검증 이력 누적**
브리핑 아카이브가 쌓이면 "이 인과 구조가 실제로 실현됐는가"를 추적 가능.
예측 노드에 `verified: true/false` 필드 스키마 사전 설계 필요.
적중률 누적 시 Bloomberg도 없는 "검증 가능한 시장 인과 지도"가 됨.

**② GAS 출력 후 검증 레이어**
2번 콜 결과 저장 전 코드로 검증:
- NOW 스레드 노드의 date 간격이 1거래일인지 자동 체크
- 위반 시 해당 스레드 재생성 또는 경고 로그
COMMON_RULES 프롬프트 강화만으로는 한계 → 코드 레벨 검증 필요.

**③ 데이터 출처/시점 UI 표시**
기관 사용자는 데이터 출처와 수집 시각에 예민.
노드 클릭 시 source, data_as_of, collected_at을 명시적으로 표시.

### 🟡 2순위 — 사용자 경험을 만드는 것들

**④ 노드/엣지 팝업 UI** ← 개발_10 최우선
detail/rationale 데이터는 이미 생성 중. 클릭 시 표시하는 UI만 없음.
이게 생기면 "읽는 툴" → "이해하는 툴"로 격상.

**⑤ DAG 시간축 비교 뷰**
"오늘 인과 구조 vs 1주 전" diff 뷰.
아카이브가 쌓이면 구현 가능. 진짜 차별화 포인트.

**⑥ 한국 기관 특화 인과체인 COMMON_RULES 추가**
- WGBI 편입 이후 외국인 국채 수급 → 원화 → KOSPI 경로
- 변액보험 자산배분 트리거 조건
- 한국 수출 사이클 (반도체/자동차/화학) 인과 구조
hwi의 도메인 지식을 COMMON_RULES에 명시 → Claude 인과 품질 급상승.

**⑦ 브리핑 메일링 ↔ 사이트 딥링크**
메일에 "오늘 상세 인과 구조 보기" 버튼 추가 → 사이트 retention 생성.

**⑧ 헤드라인 품질 기준 강화**
"기관 투자자가 보고서 제목으로 쓸 수 있는 수준"으로 Claude 지시 강화.

### 🔵 3순위 — 포지셔닝을 만드는 것들

**⑨ About / 방법론 페이지**
데이터 소스, AI 모델, 인과 구조 생성 방법론 설명.
기관 투자자에게 "블랙박스가 아님"을 보여줘야 신뢰 생김.

**⑩ 접근 제한 (초대제 또는 기관 이메일 도메인)**
완전 공개 대신 선별 접근 → 포지셔닝 차별화.
"아무나 보는 것"과 "선별된 기관 투자자만 보는 것"은 브랜딩이 다름.

**⑪ SidePanel related_news 렌더링**
노드에 related_news 배열이 이미 있음. UI만 없는 상태.

---

## 10. 남은 작업

### 🟡 다음 세션 (개발_10) 우선순위
1. **노드/엣지 팝업 UI 구현** — detail/rationale 표시 (최우선)
2. **GAS 출력 후 검증 레이어** — NOW 스레드 날짜 간격 코드 체크
3. **SidePanel related_news 렌더링**
4. **한국 기관 특화 인과체인 COMMON_RULES 추가**
5. **브리핑 아카이브 → collectNews() 연동**

### 🔵 기술 부채
- DagGraph.js ESLint 경고 정리
- 수평 edge 펄스 두께 미해결
- 모바일 DAG 수직 레이아웃 (보류)
- GeoMap.js 고아 상태 — 활성화 or 제거 결정 필요
- WEEKLY KOSPI 기저일 오차 (Yahoo 5일치 한계)

---

## 11. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_10 세션입니다.
진도 현황: WMN_Progress_v8.md (첨부)
완료: 개발_9 전체 (detail/rationale, stale 보정, 네이버 수정,
      비용 최적화, 브리핑 아카이브 배포 자동화, COMMON_RULES 강화)
오늘 작업 (우선순위):
  1. 노드/엣지 팝업 UI 구현 (detail/rationale 표시)
  2. GAS 출력 후 검증 레이어 (NOW 스레드 날짜 간격 체크)
  3. SidePanel related_news 렌더링
```
