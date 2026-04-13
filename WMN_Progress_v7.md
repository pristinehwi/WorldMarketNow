# 지금 세계는 (WorldMarketNow) — 개발 진도 현황 v7.0
> 마지막 업데이트: 2026-04-13 (개발_8 세션)
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
| `data_collector.gs` | 가격/뉴스/거시/BOK/지수 수집 | v4.3 | ✅ |
| `claude_api.gs` | 3콜 Claude API 아키텍처 | v4.6 | ✅ |
| `github_push.gs` | GitHub push + archive cleanup + 블랙아웃 | v2.2 | ✅ |

### RSS 메일링 GAS
| 파일명 | 역할 | 상태 |
|--------|------|------|
| `fetchAndSendNews()` | 뉴스 수집 + Claude 분류/요약 + 메일 발송 | ✅ |
| `briefing_github.gs` | 브리핑 HTML 생성 + GitHub push + index.json 관리 | ✅ 신규 |

### Claude API 3콜 아키텍처 (v4.6)
| 콜 | 모델 | 역할 | max_tokens |
|----|------|------|------------|
| 0번 | **Sonnet** | 시장 인식 + 스레드 결정 + 세션 판단 | 4096 |
| 1번 | Sonnet | DAG 생성 + 자체검토 통합 + 세션 주입 | 8000 |
| 2번 | Haiku | 최종 확정 + 브리핑 | 6000 |

### 트리거 현황
| 함수 | 유형 | 시간 | 상태 |
|------|------|------|------|
| `collectCandleData` | Day timer | 6am~7am KST | ✅ 등록됨 |
| `runPipeline` | 분 타이머 30분 | 상시 | ✅ 등록됨 |
| `fetchAndSendNews` (메일링) | Day timer | 매일 1회 | ✅ 등록됨 |

### 블랙아웃 스케줄 (KST 기준)
| 시간대 | 상태 |
|--------|------|
| 평일 00:00~06:30 | ✅ 실행 (미국 장) |
| 평일 06:30~09:01 | ⏸️ 스킵 |
| 평일 09:01~16:01 | ✅ 실행 (한국 장) |
| 평일 16:01~22:31 | ⏸️ 스킵 |
| 평일 22:31~24:00 | ✅ 실행 (미국 장 개장) |
| 토 09:00~월 09:00 | ⏸️ 스킵 (주말) |

※ 블랙아웃 시에도 `prices.json`은 항상 push (데이터 축적용)

### GitHub push 파일 구조
```
data/
├── latest.json          — Claude 3콜 결과
├── prices.json          — ETF 가격 데이터
├── archive/             — 14일 보관
│   └── YYYYMMDD_HHmm.json
└── briefing/            — 메일링 브리핑 아카이브 (2년 보관)
    ├── index.json       — 날짜 목록 + headlineTheme + todayWatch
    └── YYYY-MM-DD.html  — 날짜별 브리핑 HTML
```

---

## 4. COMMON_RULES 현황 (v4.6)

| 번호 | 규칙 요약 | 상태 |
|------|----------|------|
| 1 | ETF 노드 티커 병기 필수 | ✅ |
| 2 | JSON만 출력, 마크다운 금지 | ✅ |
| 3 | 시장별 시간축 인과 규칙 (①~⑥) | ✅ v4.6 강화 |
| 4 | 노드 label 10자 이내 | ✅ |
| 5 | value 날짜 필드 기준 형식 | ✅ |
| 6 | timestamp HH:MM 또는 null | ✅ |
| 7 | 스레드 간 주제 중복 금지 | ✅ |
| 8 | 한국 종착 노드 50% 이하 | ✅ |
| 9 | headline/title 띄어쓰기 | ✅ |
| 10 | layer_summary layer1 형식 + 60자 이내 | ✅ |
| 11 | edge label 6자 이내 | ✅ |
| 12 | 동일 미국 시간대 ETF 간 직접 인과 금지 | ✅ |
| 13 | 전일 급등 후 조정 = "급등후조정"/"차익실현" | ✅ |
| 14 | 개념 노드 related_news (프리퀀시별 기준 차등) | ✅ |
| 15 | WEEKLY/MONTHLY DAG 2단계 이상 인과 체인 | ✅ |
| 16 | MONTHLY origin 노드 = 구조적 배경, 단발 뉴스 금지 | ✅ |

### NOW 정의 4구간 (v4.6 신규)
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
├── App.js                    ✅ v7 (BriefingPanel, Daily Intelligence Archive 버튼)
├── App.css                   ✅ v6 (브리핑 패널 스타일)
├── components/
│   ├── HeadlineZone.js       ✅ v6
│   ├── DagGraph.js           ✅ v10 (autoScale *1.6, calcNodeSize mobile pad, CANVAS_H 동적)
│   ├── Timeline.js           ✅ v4
│   └── SidePanel.js          ✅ v2
└── hooks/
    └── useMarketData.js      ✅ v3
```

### GitHub Actions
| 파일 | 역할 | 상태 |
|------|------|------|
| `.github/workflows/deploy-briefing.yml` | `data/briefing/` push 시 자동 gh-pages 배포 | ✅ 신규 |

---

## 6. 개발_8 세션 완료 항목

### GAS 백엔드
- [x] **KOSPI/KOSDAQ 교차검증** — Yahoo + 네이버, 차이 0.5%/2% 기준 3단계 처리
- [x] **`calcDataAsOf()` v3** — 실행 시각 기준 직접 계산 (캐시 의존 제거)
- [x] **NOW 정의 4구간** — 아시아/유럽/미국/장외 세션별 구성 원칙
- [x] **1번 콜 세션 주입** — `current_session` + `open_markets` 명시적 전달
- [x] **Claude API Overloaded 재시도** — 대기시간 3초→30초
- [x] **RSS 메일링 브리핑 아카이브** — `briefing_github.gs` 추가, 2년 보관 FIFO

### React 프론트엔드
- [x] **모바일 autoScale *1.6** — containerW < 600 적용
- [x] **calcNodeSize mobile pad** — mobile=true 시 pad 60 (글자 넘침 방지)
- [x] **CANVAS_H 동적 계산** — 노드 수 × (maxNodeH + 40) + 100
- [x] **Daily Intelligence Archive** — 브리핑 아카이브 열람 버튼 + 팝업 + 새 탭 열기
- [x] **GitHub Actions 자동 배포** — briefing push 시 gh-pages 자동 갱신

---

## 7. 남은 작업

### 🟡 단기
1. **브리핑 → WorldMarketNow 뉴스 재료 연동** — briefing.json의 themes/summary를 collectNews() 보완용으로 활용
2. **노드/엣지 보조텍스트** — 2번 콜에 `detail`(노드), `rationale`(엣지) 필드 추가
3. **WEEKLY/MONTHLY origin 시간 범위 규칙** — COMMON_RULES 추가 (브리핑 아카이브 연동 후)
4. **통합 테스트** — 미국 장 개장 시간대 (KST 22:31~익일 06:30) 데이터 확인

### 🔵 기술 부채
- DagGraph.js ESLint 경고 정리 (미사용 변수)
- 수평 edge 펄스 두께 미해결
- WEEKLY KOSPI 기저일 오차 (Yahoo 5일치 한계)
- 모바일 노드 글자 넘침 근본 해결 (getBBox 방식 고려)

---

## 8. 다음 세션 시작 템플릿

```
"지금 세계는" 프로젝트 개발_9 세션입니다.
진도 현황: WMN_Progress_v7.md (첨부)
완료: 개발_8 전체 (교차검증, NOW 4구간, Overloaded 재시도, 브리핑 아카이브, 모바일 개선, GitHub Actions)
오늘 작업 (우선순위):
  1. 브리핑 아카이브 → collectNews() 연동 (뉴스 재료 고도화)
  2. 노드/엣지 보조텍스트 (detail/rationale 필드)
  3. WEEKLY/MONTHLY origin 시간 범위 COMMON_RULES 추가
  4. 통합 테스트 (미국 장중 시간대)
```
