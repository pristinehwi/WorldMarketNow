# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v7.0
> 마지막 업데이트: 2026-04-14 (개발_8 세션 추가 작업)
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
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 수집 | v4.4 | ✅ |
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v4.6 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup + 블랙아웃 | v2.3 | ✅ |

### RSS 메일링 GAS
| 파일명 | 역할 | 상태 |
|--------|------|------|
| `fetchAndSendNews()` | 뉴스 수집 + Claude 분류/요약 + 메일 발송 | ✅ |
| `briefing_github.gs` | 브리핑 HTML 생성 + GitHub push + index.json 관리 | ✅ |

### Claude API 3콜 아키텍처 (v4.6)
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | **Sonnet** | 시장 인식 + 스레드 결정 + 세션 판단 | 4096 |
| 1번 | Sonnet | DAG 생성 + 자체검토 통합 + 세션 주입 | 8000 |
| 2번 | Haiku | 최종 확정 + 브리핑 | 6000 |

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ |
| `runPipeline` | 분 타이머 30분 | 상시 | ✅ |
| `fetchAndSendNews` (메일링) | Day timer | 매일 1회 | ✅ |

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

---

## 4. COMMON_RULES 현황 (v4.6)

| 번호 | 규칙 요약 | 상태 |
|------|----------|------|
| 1~16 | (이전과 동일) | ✅ |

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
├── App.css                   ✅ v6 (브리핑 패널, 모바일 미니차트 팝업 축소)
├── components/
│   ├── HeadlineZone.js       ✅ v6
│   ├── DagGraph.js           ✅ v10 (autoScale *1.6, mobile pad, CANVAS_H 동적)
│   ├── Timeline.js           ✅ v4
│   └── SidePanel.js          ✅ v2
└── hooks/
    └── useMarketData.js      ✅ v3
```

### GitHub Actions
| 파일 | 역할 | 상태 |
|------|------|------|
| `.github/workflows/deploy-briefing.yml` | briefing push 시 자동 gh-pages 배포 | ✅ (permissions 추가 후 정상) |

---

## 6. 개발_8 세션 완료 항목 (전체)

### GAS 백엔드
- [x] KOSPI/KOSDAQ 교차검증 (Yahoo + 네이버)
- [x] `calcDataAsOf()` v3 — 실행 시각 기준 직접 계산
- [x] NOW 정의 4구간 + 1번 콜 세션 주입
- [x] Claude API Overloaded 재시도 30초
- [x] RSS 메일링 브리핑 아카이브 (`briefing_github.gs`)
- [x] 블랙아웃 v2.3 — 유럽 장중(17:00~22:30) 실행 추가
- [x] `data_collector.gs` v4.4 — candle 날짜 stale 보정 (뉴욕 기준)

### React 프론트엔드
- [x] 모바일 autoScale *1.6
- [x] calcNodeSize mobile pad 60
- [x] CANVAS_H 동적 계산
- [x] Daily Intelligence Archive 버튼 + 팝업 + 새 탭 열기
- [x] 모바일 미니차트 팝업 가로폭 축소 (max-width 320px)
- [x] GitHub Actions 자동 배포 (permissions 수정 완료)

---

## 7. 남은 작업

### 🟡 다음 세션 (개발_9)
1. **브리핑 아카이브 → `collectNews()` 연동** — themes/summary/keyPoint를 Claude 재료로 활용
2. **2번 콜 `detail`/`rationale` 필드 추가** — 노드 맥락 + 엣지 인과 근거 사전 생성
3. **노드 팝업 + 엣지 팝업 UI 구현** — 클릭 시 detail/rationale 표시
4. **WEEKLY/MONTHLY origin 시간 범위 COMMON_RULES 추가** (브리핑 연동 후)

### 🔵 기술 부채
- DagGraph.js ESLint 경고 정리
- 수평 edge 펄스 두께 미해결
- WEEKLY KOSPI 기저일 오차 (Yahoo 5일치 한계)
- 모바일 노드 글자 넘침 근본 해결 (getBBox 방식 고려)

---

## 8. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_9 세션입니다.
진도 현황: WMN_Progress_v7.md (첨부)
완료: 개발_8 전체 (교차검증, NOW 4구간, 브리핑 아카이브, 모바일 개선,
      GitHub Actions, 유럽장 블랙아웃 수정, candle 날짜 stale 보정)
오늘 작업 (우선순위):
  1. 브리핑 아카이브 → collectNews() 연동
  2. 2번 콜 detail/rationale 필드 추가
  3. 노드/엣지 팝업 UI 구현
```
