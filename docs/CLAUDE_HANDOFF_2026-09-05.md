# weddingCORE 인수인계 — 2026-09-05

## 목적과 제품 원칙

국제결혼중개업소를 위한 `weddingCORE`를 **무료 SaaS**로 배포한다.

- 고객·직원·매칭·준법 관리·기본 서류 기능은 고객 수나 직원 수 제한 없이 무료다.
- 설치비·월 구독료·기본 기능 유료화는 하지 않는다.
- 유료화가 필요하면 선택형 AI 사용량(캐럿), 변호사 검토·행정사 연결, 마케팅/홈페이지 제작처럼 외부 전문 서비스에만 적용한다.
- 이 서비스의 차별점은 단순 CRM이 아니라 `국제결혼중개업 준법 운영 시스템`이다. F-6, 의무 서류, 법률 검토 흐름을 제품의 중심에 둔다.
- 민감한 개인·혼인·체류 정보를 다루므로, 신규 기능은 편의보다 접근권한·감사기록·데이터 최소화를 우선한다.

관련 정책 문서: [pricing.md](../pricing.md), [무료-SaaS-제품개선-계획.md](무료-SaaS-제품개선-계획.md)

## 작업 환경과 협업 주의사항

- 작업 경로: `C:\Users\jeonw\.antigravity\weddingCORE`
- 사용자 대상 답변은 항상 한국어로 작성한다.
- 사용자는 불필요한 확인 질문을 원하지 않는다. 안전한 범위에서는 먼저 조사·구현·검증하고 결과를 보고한다.
- 작업 트리에 기존 사용자 변경 사항이 많다. 아래에 적힌 파일 외 변경은 사용자의 작업일 수 있으므로 되돌리거나 정리하지 않는다.
- 파일 수정은 `apply_patch`를 사용한다.
- 현재 배포는 하지 않았다. 특히 Firestore 규칙 배포는 검증 후 명시적으로 진행한다.

## 이번 세션에서 완료한 구현

### 1. 무료 SaaS 정책 문서화

`pricing.md`를 무료 배포 정책으로 변경했다.

- 기존 Basic/Standard 월 구독 모델은 중단된 과거안으로 보관했다.
- 기본 SaaS 무제한 무료와 선택형 부가 서비스만의 수익 모델을 명시했다.
- 별도 실행 로드맵인 `docs/무료-SaaS-제품개선-계획.md`를 추가했다.

### 2. 고객 명단 CSV 가져오기

엑셀에서 CSV UTF-8로 내보낸 고객 명단을 가져오는 기능을 추가했다.

주요 파일:

- `src/features/agency/clientCsv.ts`
- `src/features/agency/ImportClientsDialog.tsx`
- `src/features/agency/useAgencyClients.ts`
- `src/pages/ClientListPage.tsx`

동작:

- 고객 목록의 **엑셀 명단 가져오기**에서 양식 CSV를 내려받고 파일을 선택한다.
- 헤더는 `이름`, `생년월일`, `성별`, `연락처`를 기본으로 하며, 한국어/영문 별칭도 인식한다.
- 주소·소득·직업·혼인 이력은 선택값이다.
- 필수값, 생년월일, 성인 여부, 성별, 전화번호, 중복 전화번호를 검사한다.
- 현재 고객 및 같은 파일 안의 중복 전화번호를 걸러낸다.
- 오류 행은 제외하고 정상 행만 최대 500건씩 가져올 수 있다. 파일 크기 제한은 2MB다.
- Firestore 배치 쓰기를 200건 단위로 나누며, 생성 경로는 기존 고객 생성과 동일하게 `agencies/{agencyId}/clients/{clientId}`다.
- 새 고객 문서에 누락되어 있던 `clientId`도 기록하도록 일반 수기 생성 경로를 함께 보완했다.

제한 사항:

- 실제 `.xlsx` 파싱은 아직 지원하지 않는다. 반드시 엑셀에서 **CSV UTF-8**로 저장해야 한다.
- 고객 목록 진입 시 기존 전화번호 전체를 읽어 중복을 검사한다. 소규모 사업장에는 적합하지만 고객 수가 매우 커지면 서버 측 검증 또는 색인 구조로 바꾸는 것이 좋다.
- 일부 행이 오류면 정상 행만 가져온다. 실제 운영 화면에서 이 UX를 확인하고, 필요하면 최종 확인 단계를 추가한다.

### 3. 소개 → 만남 → 피드백 → 재매칭 흐름

매칭에 운영 단계를 추가했다.

주요 파일:

- `src/types/schema.ts`
- `src/features/matching/useMatches.ts`
- `src/features/matching/MatchHistory.tsx`

추가된 단계:

`profile_shared` → `meeting_scheduled` → `meeting_completed` → `feedback_pending` → `rematch_needed` 또는 `completed`

동작:

- 새 매칭은 `profile_shared` 단계로 생성된다.
- 매칭 이력에서 단계, 양측 결과, 한국 고객/해외 상대 피드백, 다음 조치일, 담당자 메모를 기록한다.
- 다음 조치일이 지났으면 지연 표시를 한다.
- 과거 매칭 데이터는 결과값을 기준으로 단계가 보이도록 하위 호환 처리했다.

중요한 후속 과제:

- 현재 고객 상세의 상대 선택은 기존 구조상 임시 구현이며, 신규 매칭 생성 때 `partnerId`가 빈 문자열로 들어갈 수 있다. 실제 **상대 프로필 CRUD와 선택기**를 먼저 완성해야 매칭 운영이 온전히 작동한다.

### 4. 상담·연락 이력

고객 상세에 상담·연락 탭을 추가했다.

주요 파일:

- `src/features/activities/useClientActivities.ts`
- `src/features/activities/ActivitySection.tsx`
- `src/pages/ClientDetailPage.tsx`
- `firestore.rules`

동작:

- 전화, 메시지, 상담, 방문, 메모 유형의 이력을 남긴다.
- 내용, 결과, 담당자, 다음 조치일을 기록한다.
- 삭제 UI는 제공하지 않아 운영 감사 이력을 보존한다.
- 저장 경로: `agencies/{agencyId}/clients/{clientId}/activities/{activityId}`
- Firestore 규칙은 소속 직원 읽기 및 작성/수정, 소유자·관리자 삭제를 추가했다.

### 5. 운영 현황 요약

대시보드에 소개·피드백 현황을 추가했다.

수정 파일: `src/pages/AgencyDashboardPage.tsx`

- 피드백 대기 수
- 재매칭 필요 수
- 성사 매칭 수
- 완료 고객 수

## 검증 상태

완료:

```powershell
npm.cmd run typecheck
```

결과:

```text
트랙 정의 대조 — 서버 2트랙/7문서 · 화면 2트랙/7문서
서버와 화면 정의가 일치합니다.
```

아직 하지 않음:

```powershell
npm.cmd run build
```

- Vite 프로덕션 빌드를 실행해 번들 단계 오류를 확인해야 한다.
- 에뮬레이터 또는 개발 환경에서 CSV 가져오기, 매칭 단계 변경, 상담 이력 저장을 직접 점검해야 한다.
- `firestore.rules`는 수정만 했고 배포하지 않았다. 규칙 문법·권한 테스트 후에만 `firebase deploy --only firestore:rules`를 고려한다.

## 다음 작업 우선순위

### P0 — 지금 구현한 기능의 마무리 검증

1. `npm.cmd run build` 실행 및 오류 수정
2. 빈 CSV, UTF-8이 아닌 CSV, 중복 전화번호, 500행 초과 CSV를 수동 점검
3. 고객 생성·CSV 생성 뒤 기존 `onClientCreated` 타임라인 트리거가 정상 생성되는지 확인
4. 매칭 단계/피드백/다음 조치일 저장과 새로고침 후 표시를 점검
5. 직원 권한과 관리자 권한으로 상담 이력 Firestore 규칙을 검증
6. 검증 완료 뒤 `docs/무료-SaaS-제품개선-계획.md` 체크박스를 실제 상태에 맞춰 갱신

### P1 — 실제 상대 프로필과 매칭 생성

현재 가장 큰 기능 공백이다.

1. 한국 고객과 분리된 상대 프로필 데이터 모델을 확정한다.
2. 상대 프로필 등록·검색·상세·상태 관리 화면을 만든다.
3. 고객 상세에서 상대를 검색/선택해 `partnerId`와 표시 이름을 정확히 저장한다.
4. 양쪽의 조건, 소개 제한, 동의 상태를 검사한 뒤 매칭을 허용한다.
5. 기존 빈 `partnerId` 매칭 데이터를 표시할 수 있도록 예외 처리를 유지한다.

### P2 — 고객 서류 제출 포털

고객에게 업로드 링크를 보내는 기능은 편리하지만 가장 민감한 기능이다. 공개 Storage 경로나 장기 토큰을 바로 만들지 않는다.

권장 순서:

1. 고객별·서류별·만료시간이 있는 일회성 초대 토큰 설계
2. 토큰 해시 저장, 사용 이력, 폐기 기능, 업로드 횟수 제한
3. Storage 경로를 고객·서류·기관으로 격리하고 MIME/크기/악성 파일 검사 정책 적용
4. 업로드 후 직원 검토 및 승인/반려 이력 추가
5. 접근·다운로드·삭제 감사 로그 추가

### P3 — 운영 자동화와 선택형 부가 서비스

1. 다음 조치일 기반 알림 및 담당자 할 일 목록
2. 카카오/SMS/이메일 발송 연동과 발송 동의·수신거부 기록
3. 상담·만남 일정 캘린더
4. 전자서명/계약서, 결제는 선택형 외부 서비스로만 제공
5. 대시보드에 다음 조치 지연, 단계별 전환, 담당자별 처리 현황 추가

기본 SaaS 기능을 구독제나 고객 수 제한으로 되돌리지 않는다.

## 데이터와 아키텍처 메모

- 고객: `agencies/{agencyId}/clients/{clientId}`
- 매칭: `agencies/{agencyId}/matches/{matchId}`
- 상담/연락: `agencies/{agencyId}/clients/{clientId}/activities/{activityId}`
- 고객 생성 Cloud Function: `functions/src/timeline/index.ts`의 `onClientCreated`
- 기존 고객 문서 일부에는 `clientId` 필드가 없을 수 있다. UI는 Firestore 문서 ID를 사용하므로 즉시 마이그레이션은 필요하지 않다.
- 기존 문서 업로드 기능은 직원용 `src/features/documents/DocumentSection.tsx`, `useClientDocuments.ts`에 있다. 고객 직접 제출 기능은 별도 보안 설계가 필요하다.

## 이번 세션에서 의도적으로 수정한 파일

```text
pricing.md
docs/무료-SaaS-제품개선-계획.md
docs/CLAUDE_HANDOFF_2026-09-05.md
src/types/schema.ts
src/features/agency/clientCsv.ts
src/features/agency/ImportClientsDialog.tsx
src/features/agency/useAgencyClients.ts
src/pages/ClientListPage.tsx
src/features/matching/useMatches.ts
src/features/matching/MatchHistory.tsx
src/features/activities/useClientActivities.ts
src/features/activities/ActivitySection.tsx
src/pages/ClientDetailPage.tsx
src/pages/AgencyDashboardPage.tsx
firestore.rules
```

## 사전 조사 요약

### SEO / AEO / GEO

기존 진단 스크립트의 실제 사이트 평가 결과는 SEO 100, AEO 100, GEO 94, 평균 98점이었다. 사이트맵의 공개 39개 페이지가 200 응답이었고, 기본 메타·정규 URL·OG·JSON-LD·사전 렌더링은 대체로 양호했다.

보완 후보:

- 법률·비자 콘텐츠에 작성자/검수자/근거 출처를 더 명확히 표기
- 홈페이지에서 법률·가이드 콘텐츠로 내부 링크 강화
- 일부 GEO 문서의 수치·인용·깊이 보강
- `articleSchema.sourceDate`를 페이지 발행일로 쓰는 구조 점검
- 비공개 페이지의 `robots` 차단과 자바스크립트 `noindex` 설정 충돌 점검
- `llms.txt`에 핵심 가이드 URL을 더 포함

검색 노출은 별도로 확인이 필요하다. Google Search Console과 네이버 서치어드바이저에서 소유 확인 후 사이트맵을 등록하고 주요 URL을 수동 수집 요청하는 절차는 사용자가 하기로 했다.

모바일 측정에서는 느린 4G/CPU 4배 조건에서 TTFB 327ms, FCP 1388ms, load 4816ms였고 reCAPTCHA 전송량이 약 348KB로 세 번 관측됐다. LCP는 측정 스크립트의 한계로 유효값을 얻지 못했다.

### 경쟁 제품 조사

국내 공개 웹에서 국제결혼중개업 법규·F-6·변호사 검토까지 직접 겨냥한 전용 SaaS는 뚜렷하게 확인되지 않았다. 실질적 경쟁자는 엑셀, 카카오톡, Google Drive, 종이 서류, 외부 전문가 연락의 조합이다.

해외 제품은 SmartMatchApp, Dating CRM, LeConnex, Matrimic 등이 있으며, 공통적으로 고객/리드 관리, 매칭, 소통, 양식·문서, 포털, 분석, 다국어, 결제를 제공한다. 그러므로 weddingCORE는 해외 일반 데이팅 CRM을 복제하기보다 한국 국제결혼중개업의 준법·서류·상담 운영을 무료 기반으로 깊게 해결하는 방향을 유지한다.

## Claude 작업 시작 제안

가장 안전한 다음 순서는 다음과 같다.

1. `npm.cmd run build`로 현재 변경을 먼저 검증한다.
2. 개발 환경에서 P0 수동 시나리오를 점검하고, 오류가 있으면 작은 단위로 수정한다.
3. 상대 프로필/선택기(P1)를 설계·구현한다.
4. 고객 서류 제출 포털(P2)은 인증·권한 설계가 확정된 뒤 구현한다.
5. 작업마다 무료 SaaS 정책과 개인정보 보호 원칙을 다시 확인한다.

