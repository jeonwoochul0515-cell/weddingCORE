# 체크리스트 — 접수를 고객으로 만드는 업무 흐름 (2026-09-05)

설계: `docs/접수-고객-전환-설계.md`. 대표 지시 "마케팅센터에서 고객관리로 넘어가는 업무 플로우를 만들어",
"접수 요약을 원문 덩어리로 보여주지 말고 보고서 형식으로(학점나비 보고서 방식)".

## 1단계 · 데이터·규칙
- [ ] `src/types/schema.ts` — `Lead`·`LeadStatus`·`ClientIntake`, `Client.source`·`Client.intake`
- [ ] `firestore.rules` — 접수 수정 허용 필드 확장 (status·memo·contactedAt·nextActionAt·closedAt·closeReason·clientId·convertedAt)

## 2단계 · 접수 보고서 (원문 덩어리 → 보고서)
- [ ] `src/features/leads/parseLeadSummary.ts` — 하나 실장 요약·빠른 점검 요약 두 형식을 같은 구조로 읽기
- [ ] `src/features/leads/LeadReport.tsx` — 핵심 요약 → 요건 현황 표(미확인은 접음) → 상담 요지 → 판단 → 다음 행동 → 원문 접힘
- [ ] 전역 스킬 `~/.claude/skills/보고서형식/SKILL.md` 저장 (학점나비 보고서 구조를 규칙으로)

## 3단계 · 접수 탭과 상태 흐름
- [ ] `src/features/leads/useAgencyLeads.ts` — 목록 훅 + 상태 변경 함수(전화했음·상담 중·종료·고객 등록)
- [ ] `src/features/leads/LeadsPanel.tsx` — 목록·경과 시간·상태 버튼·메모·다음 연락일·보고서 펼침
- [ ] `src/pages/ClientListPage.tsx` — 「접수」/「고객」 탭, `?tab=leads`

## 4단계 · 고객으로 등록
- [ ] `CreateClientDialog` — 이름·연락처·혼인이력 미리 채움, 접수 출처 표시
- [ ] `createClient` — `source`·`intake` 저장
- [ ] 접수 문서 `converted` + `clientId` 기록 후 고객 상세로 이동
- [ ] `ClientDetailPage` — "접수에서 온 손님" 표시 + 접수 보고서 접힘

## 5단계 · 대시보드·마케팅 센터
- [ ] 대시보드 「새 접수」 카드 + 24시간 미연락 힌트 + 조치 필요 목록 연결
- [ ] 마케팅 센터 — 접수 목록 대신 이번 달 접수·연락·등록·전환율 한 줄 + 접수 탭 링크

## 검증·배포
- [ ] 타입검사 · 빌드
- [ ] 규칙 배포 · 웹 배포
- [ ] 장보고(시범) 접수로 상태 흐름과 고객 등록을 실제로 눌러 보고, 만든 시험 고객은 지운다
- [ ] 기록: context-notes, 체크리스트
