# 체크리스트 — 손님 심리 리서치를 weddingCORE에 옮기기 (2026-09-04)

근거 문서: `C:\Users\jeonw\.antigravity\woori\docs\persona-research.md` (2026-09-04, 우리결혼중개 손님 리서치).
대표 지시: "추천대로 진행해" — 보고서의 추천 순서 그대로.

## 1단계 · 문서 (코드 없음)
- [x] `docs/marketing/홈페이지-제작-표준규칙.md` — 회원 업체 홈페이지 제작 상품의 공통 규칙 + AEO 핵심 질문 20개
- [x] `docs/marketing/블로그-주제-달력.md` — 월 8건 배분·발행 시기·금지 표현
- [x] 커밋

## 2단계 · 비자 시뮬레이터
- [ ] 캄보디아 규정(외국인 남성 만 50세 미만·월 2,550달러) — `rules.ts`·`engine.ts`
- [ ] 설명 영역(`AboutF6.tsx`) 질문·답 1건 추가 — 화면과 FAQ 스키마 1:1 유지
- [ ] 빠른 점검 7문항 — `src/features/quickCheck/`
- [ ] 공개 화면 `/check` + 업체 사이트 삽입용 `/embed/check?agency=…`
- [ ] 공개 라우트 4곳 갱신 — routes · prerender · sitemap · worker ROUTE_PREFIXES
- [ ] `/embed/*` 프레임 허용 헤더 (기본은 frame-ancestors 'none')
- [ ] 접수 함수 `submitCheckLead` — 업체 Firestore `leads` + 업체 전화로 문자
- [ ] Firestore 규칙 `agencies/{aid}/leads`
- [ ] 마케팅 센터에 삽입 코드 + 접수 목록 카드
- [ ] 타입검사 · 웹 빌드 · 함수 빌드
- [ ] 커밋

## 3단계 · 진행 현황판
- [ ] `docs/진행-현황판-설계.md` — 데이터·경로·보안·화면·문자 연결 설계 (구현은 다음)
- [ ] 커밋

## 검증·배포
- [ ] 함수 배포 (`--only functions:submitCheckLead`)
- [ ] 규칙 배포
- [ ] 웹 배포 (`npm run deploy:cloudflare`, 토큰 환경변수)
- [ ] `/check` 200 · `/embed/check` 프레임 헤더 확인
