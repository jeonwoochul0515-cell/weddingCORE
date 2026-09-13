# 14 · 휴대폰·접근성·상태 표시 — 사장 시점 점검 (2026-09-05)

전제. 국제결혼중개업 사장이 휴대폰(가로 390px)으로 weddingCORE를 쓴다고 놓고, 화면 코드를 끝까지 따라가며 봤다. 브라우저를 열지 않고 코드로만 판단했으므로 픽셀 단위 겹침은 "코드 기하로 계산"이라고 밝혔다. 줄 번호는 2026-09-05 읽은 시점 기준이다. 같은 날 다른 점검자가 `LoginForm.tsx`·`CreateClientDialog.tsx`를 고치고 있어 두 파일은 다시 확인했다(등록 창의 연락처 칸 전화 자판과 오류 문구 우리말 처리는 이미 반영돼 있어 뺐다).

용어 한 줄 풀이.
- 겹침 순서(z-index) — 화면에 겹쳐 뜨는 요소들의 위아래 순서. 숫자가 클수록 위에 뜬다.
- 고정 요소(fixed) — 스크롤해도 화면 같은 자리에 붙어 있는 요소. 하단 메뉴, 팝업 창, 상담 캐릭터가 여기 해당한다.
- 실패 붙잡기(try/catch) — 저장·조회가 실패했을 때 그 실패를 받아서 화면에 알리는 장치. 없으면 조용히 실패한다.
- 자판 종류 지정(inputMode) — 휴대폰에서 칸을 누를 때 숫자판을 띄울지 글자판을 띄울지 정하는 표시.
- 이름표(aria-label) — 아이콘만 있는 버튼에 붙이는, 화면 낭독기와 보조기기가 읽는 이름.
- 닿는 면적(터치 대상) — 손가락으로 누를 수 있는 영역. 휴대폰 지침은 최소 44px×44px.

## 읽은 파일

- 뼈대. `index.html`, `vite.config.ts`, `src/styles/globals.css`, `src/App.tsx`, `src/routes.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/components/auth/LoginForm.tsx`, `src/lib/auth.ts`, `public/open-external.js`
- 레이아웃. `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `NotificationBell.tsx`, `src/components/chat/HaramChat.tsx`
- 화면. `src/pages/` 전부 (LoginPage, AgencySignupPage, PendingApprovalPage, AgencyDashboardPage, ClientListPage, ClientDetailPage, VisaWorkCenterPage, OfficePage, MarketingCenterPage, AutomationCenterPage, PrecedentsPage, RegulatoryRadarPage, MatchingPage, BackgroundInfoPage, AdminAgenciesPage, LawyerWorkbenchPage, PaymentResultPage, NotFoundPage, EmbedCheckPage, QuickCheckPage, VisaSimulatorPage, MbtiTestPage, HomePage, GuidesPage, GuideDetailPage 앞부분, LawMapPage, LawArticlePage, PrivacyPage)
- 기능 조각. `features/agency/CreateClientDialog.tsx`, `features/timeline/TimelineView.tsx`, `features/documents/DocumentSection.tsx`·`ConsistencyCard.tsx`, `features/matching/CreateMatchDialog.tsx`·`MatchHistory.tsx`·`ProfileForm.tsx`, `features/leads/LeadsPanel.tsx`·`LeadReport.tsx`, `features/sideBySide/ParallelView.tsx`·`BackgroundInfoForm.tsx`·`DeliverySection.tsx`, `features/registry/BrokerAutocomplete.tsx`, `features/precedents/StageGuideCard.tsx`, `features/quickCheck/QuickCheck.tsx`, `features/visaSimulator/InputForm.tsx`·`ResultView.tsx`
- 저장·조회 연결. `features/agency/useAgencyClients.ts`, `features/leads/useAgencyLeads.ts`, `features/documents/useClientDocuments.ts`, `features/timeline/useTimeline.ts`, `features/office/useOffice.ts`, `features/matching/useMatches.ts`, `features/sideBySide/useBackgroundInfo.ts`, `features/automation/useAutomationJobs.ts`, `features/payments/useCheckout.ts` (실시간 조회의 실패 처리 여부만 봄)

## 발견

### 1. 상담 캐릭터 '하람' 얼굴이 휴대폰 업무 화면의 오른쪽 아래를 항상 덮는다
- 심각도: 막힘
- 어디서: 로그인 뒤 모든 업무 화면(대시보드·고객·비자·업체 정보…). 특히 「신규 고객」 등록 창의 「등록」 버튼, 하단 메뉴의 오른쪽 칸(업체·규제).
- 무슨 일이: 하람은 업체 홈페이지 삽입 화면(`/embed/*`)만 빼고 모든 화면에 뜬다. 휴대폰에서는 지름 106px짜리 얼굴이 오른쪽 아래 모서리(오른쪽·아래 각 16px)에 고정되고, 겹침 순서가 50이라 하단 메뉴(40)와 팝업 창(30)보다 위에 있다. 사장이 등록 창 오른쪽 아래의 「등록」을 누르면 얼굴이 먼저 눌려 상담창이 열린다. 하단 메뉴에서 옆으로 밀어 「업체」·「규제」를 누르려 해도 얼굴이 그 자리를 가린다. 정작 업무 화면에는 먼저 말을 걸지도 않는다(말을 거는 화면 목록이 홈·시뮬레이터·성향진단·로그인뿐).
- 근거: `src/App.tsx:10,30` (embed만 제외) · `src/components/chat/HaramChat.tsx:246` (`fixed inset-x-0 bottom-0 z-50 … p-4`), `:419-437` (106px 얼굴 버튼, `pointer-events-auto`), `:38-46` (말 거는 화면 목록에 `/agency/*` 없음) · `src/components/layout/Sidebar.tsx:59` (하단 메뉴 `fixed … bottom-3 z-40`) · `src/features/agency/CreateClientDialog.tsx:89` (등록 창 `z-30`), `:144` (버튼이 오른쪽 정렬 `justify-end`). 겹침 계산은 코드 기하 기준이며 실기기 확인이 필요하다.
- 고칠 방향: 로그인 뒤 업무 화면(`/agency/*`, `/lawyer/*`, `/admin/*`)에서는 하람을 아예 그리지 않거나 상단바의 작은 버튼으로 옮긴다. 남기더라도 하단 메뉴 위쪽으로 띄우고, 팝업 창이 열려 있을 때는 숨긴다.

### 2. 등록 창·서류 창·매칭 창·타임라인 서랍이 하단 메뉴보다 아래층에 있어 메뉴가 창 위에 떠서 눌린다
- 심각도: 막힘 (키가 작은 휴대폰) / 답답 (보통 휴대폰)
- 어디서: 「신규 고객」 등록 창, 「서류 업로드」 창, 「매칭 추가」 창, 타임라인 항목을 누르면 열리는 오른쪽 서랍.
- 무슨 일이: 네 창 모두 겹침 순서 30, 하단 메뉴는 40이다. 창을 열어도 하단 메뉴가 반투명 배경 위에 그대로 떠 있고 눌린다. 등록 창은 높이를 화면의 92%까지 허용하는데, 키가 작은 휴대폰(높이 667px)에서는 창이 화면 아래 27px까지 내려와 「취소」·「등록」 버튼이 메뉴(아래 12~76px) 뒤에 숨는다. 타임라인 서랍은 휴대폰에서 화면 전체를 덮는데 본문 아래쪽에 여백이 없어 마지막 부분(증빙 서류 체크박스, 안내문)이 메뉴에 가린 채 끝난다. 거부 사례 화면의 상세 창은 겹침 순서 50이라 정상이다.
- 근거: `src/features/agency/CreateClientDialog.tsx:89-90` (`fixed inset-0 z-30`, `max-h-[92vh]`) · `src/features/documents/DocumentSection.tsx:151` · `src/features/matching/CreateMatchDialog.tsx:65` · `src/features/timeline/TimelineView.tsx:253` (`fixed inset-y-0 right-0 z-30 w-full max-w-md`), `:263` (본문 `p-5`, 하단 여백 없음), `:372-393` (증빙 체크박스가 맨 아래) · `src/components/layout/Sidebar.tsx:59` (`z-40`) · 대비. `src/pages/PrecedentsPage.tsx:120` (`z-50`).
- 고칠 방향: 팝업 창과 서랍의 겹침 순서를 하단 메뉴보다 높게(60 이상) 두고, 창이 열린 동안 하단 메뉴를 숨긴다. 서랍 본문 아래에 메뉴 높이만큼 여백을 준다.

### 3. 타임라인 서랍은 휴대폰에서 화면 전체를 덮는데 닫는 곳이 오른쪽 위 작은 '✕' 글자 하나뿐이다
- 심각도: 답답
- 어디서: 고객 상세 → 컴플라이언스 타임라인 항목을 누른 뒤.
- 무슨 일이: 서랍 밖(어두운 배경)이 없어 바깥을 눌러 닫을 수 없고, 닫기는 여백 없는 '✕' 글자(약 16px)다. 이름표가 없어 보조기기는 "버튼"으로만 읽는다. 사장이 습관대로 휴대폰 뒤로 가기를 누르면 서랍이 아니라 고객 화면 자체를 벗어난다(뒤로 가기·Esc 처리 코드가 없다). 메모를 적다가 닫으면 저장 여부를 묻지 않고 사라진다.
- 근거: `src/features/timeline/TimelineView.tsx:253-261` (배경 없음, `✕` 텍스트 버튼, aria-label 없음), `:179,339-352` (메모는 「메모 저장」을 눌러야만 저장) · 전체 코드에 `popstate`/`Escape` 처리 없음(검색 결과 0건).
- 고칠 방향: 서랍 뒤에 어두운 배경을 두고 배경 누름·뒤로 가기로 닫히게 한다. 닫기 버튼은 44px 이상, 이름표 "닫기". 안 저장된 메모가 있으면 닫기 전에 한 번 묻는다.

### 4. 타임라인 서랍의 상태 변경·메모 저장·기준일 기록·증빙 연결이 실패해도 아무 말이 없고, 성공해도 표시가 없다
- 심각도: 위험
- 어디서: 타임라인 서랍의 「상태 변경」 버튼들, 「메모 저장」, 「기록」(기준일), 증빙 서류 체크박스.
- 무슨 일이: 네 동작 모두 실패를 붙잡는 코드가 없다. 인터넷이 끊기거나 권한이 없으면 버튼이 잠깐 비활성화됐다가 그대로 돌아올 뿐이다. 성공했을 때도 "저장됐습니다" 같은 표시가 없어, 법정 기한 항목을 「완료」로 바꿨다고 믿고 넘어갔는데 실제로는 안 바뀌어 있을 수 있다.
- 근거: `src/features/timeline/TimelineView.tsx:194-202` (setStatus, `try/finally`만), `:204-212` (saveNotes), `:214-227` (handleMarkAnchor), `:229-245` (toggleEvidence), `:346-352` (메모 저장 버튼에 성공 표시 없음).
- 고칠 방향: 각 동작에 실패 붙잡기를 넣어 서랍 안에 붉은 문구로 보여주고, 성공 시 "저장됐습니다"를 2초 띄운다.

### 5. 업체 정보(통역자·현지 파트너·처분 이력…)와 신상정보 제공 기록의 삭제 버튼이 13px 휴지통이고 실패도 조용하다
- 심각도: 위험
- 어디서: 업체 정보 화면의 각 항목 오른쪽 위, 신상정보 교환 → 제공 기록 각 줄.
- 무슨 일이: 휴지통 아이콘이 13px, 여백 없음, 연한 회색(slate-300)이라 눈에 잘 안 띄고 손이 크면 못 누르거나 옆 항목을 누른다. 반대로 스치듯 닿으면 확인 없이 바로 지워진다(확인 없음은 이미 보고됨). 추가·삭제가 실패해도 알리는 코드가 없어 "저장"을 눌렀는데 목록에 안 보이면 왜인지 알 수 없다.
- 근거: `src/pages/OfficePage.tsx:338-347` (휴지통 `size={13}`, 여백 없음, 실패 붙잡기 없음), `:173-191` (handleAdd `try/finally`만) · `src/features/sideBySide/DeliverySection.tsx:269-285` (제공 기록 삭제, 13px, 붙잡기 없음), `:58-84` (기록 추가 `try/finally`만) · `src/features/office/useOffice.ts:219-221` (바로 삭제).
- 고칠 방향: 삭제 버튼을 44px 이상으로 키우고 글자("삭제")를 같이 둔다. 추가·삭제 결과를 화면에 알린다. 실수 방지는 확인창 또는 "되돌리기" 5초.

### 6. 매칭 결과 버튼 4개가 11px 글씨 한 줄에 몰려 있고, 한 번 누르면 되돌릴 수 없다
- 심각도: 위험
- 어디서: 고객 상세 → 매칭 탭 → 매칭 기록, 그리고 매칭 관리 화면.
- 무슨 일이: 결과가 없는 기록마다 「수락 / 한국측 거절 / 외국측 거절 / 보류」 네 버튼이 높이 약 24px, 글씨 11px로 한 줄에 붙어 있다. 손이 큰 사장이 「수락」을 누르려다 「한국측 거절」을 누르면 그대로 저장되고 버튼이 사라져 고칠 길이 없다(결과를 바꾸는 화면이 없다). 저장이 실패해도 아무 표시가 없다.
- 근거: `src/features/matching/MatchHistory.tsx:83-95` (버튼 `px-2 py-1 text-[11px]`, 확인 없음), `:78-82` (결과가 있으면 버튼 대신 배지만), `:34-37` (실패 붙잡기 없음) · `src/features/matching/useMatches.ts:87-97` (결과만 덮어씀, 되돌리기 없음).
- 고칠 방향: 결과 버튼을 두 줄 이상·44px 높이로 키우고, 누른 뒤 "결과 바꾸기"를 남긴다. 실패 시 붉은 문구.

### 7. 비자업무 센터는 목록을 못 읽어 와도 "등록된 비자 사건이 없습니다"라고 보여준다
- 심각도: 위험
- 어디서: 비자업무 센터 → 비자 사건 목록. 같은 방식이 접수 목록(고객 관리 → 접수 탭)과 업체 정보 목록에도 있다.
- 무슨 일이: 실시간 조회가 실패하면(권한 오류, 색인 미생성, 통신 끊김) 실패 처리 코드가 "불러오는 중"만 끄고 아무 말도 안 한다. 그래서 화면에는 빈 목록의 안내문 "등록된 비자 사건이 없습니다"가 뜬다. 사장은 "사건이 다 지워졌나" 하고 오판하거나 같은 사건을 다시 등록한다. 접수 탭이라면 "진행 중인 접수가 없습니다"로 보여 손님 전화를 놓친다.
- 근거: `src/pages/VisaWorkCenterPage.tsx:66-73` (오류 시 `() => setLoading(false)`만), `:198` (빈 목록 문구) · `src/features/leads/useAgencyLeads.ts:59-65` (같은 방식) → `src/features/leads/LeadsPanel.tsx:88-97` (빈 목록 문구) · `src/features/office/useOffice.ts:185-191` → `src/pages/OfficePage.tsx:323-327`.
- 고칠 방향: 조회 실패를 별도 상태로 두고 "목록을 불러오지 못했습니다. 다시 시도" 버튼을 보여준다. 빈 목록 문구는 성공했을 때만.

### 8. 반대로 대시보드·고객 목록·서류·타임라인·자동화 작업은 조회에 실패하면 "불러오는 중…"이 영원히 남는다
- 심각도: 답답
- 어디서: 대시보드 숫자 카드('…'), 고객 목록, 고객 상세의 서류·타임라인, 자동화 센터의 최근 작업, 관리자 승인 목록.
- 무슨 일이: 실시간 조회에 실패 처리 코드가 아예 없어 "불러오는 중…" 또는 '…'이 끝나지 않는다. 사장은 새로고침을 반복하거나 휴대폰이 느린 줄 안다. 로그아웃도 실패하면 아무 말이 없다.
- 근거: `src/pages/AgencyDashboardPage.tsx:38-47,66-78` (오류 콜백 없음 → 카드 값 '…' 고정) · `src/features/agency/useAgencyClients.ts:34-37` · `src/features/documents/useClientDocuments.ts:30-33` · `src/features/timeline/useTimeline.ts:34-37` · `src/features/automation/useAutomationJobs.ts:25-28` · `src/pages/AdminAgenciesPage.tsx:16-26` (`getDocs`에 붙잡기 없음) · `src/components/layout/TopBar.tsx:14-22` (로그아웃 `try/finally`만).
- 고칠 방향: 조회 연결마다 오류 콜백을 넣어 "불러오지 못했습니다 · 다시 시도"로 바꾼다.

### 9. 저장·조회 실패 문구가 영어 원문 그대로 나오는 곳이 로그인 말고도 아홉 군데다
- 심각도: 말
- 어디서: 매칭 추가 창, 서류 업로드 창, 업체 등록(가입) 화면, 승인 대기 화면, 신상정보 입력 저장, 접수 줄의 버튼들, 나란히 보기의 번역·서명, 업체명 공시 검색, 관리자 승인.
- 무슨 일이: `(err as Error).message`를 그대로 붙여 "Missing or insufficient permissions." 같은 문장이 뜬다. 로그인 오류에는 우리말 번역표가 생겼지만 그 표는 로그인 오류(auth/…)만 다룬다.
- 근거: `src/features/matching/CreateMatchDialog.tsx:59-61` · `src/features/documents/DocumentSection.tsx:143-145` · `src/pages/AgencySignupPage.tsx:248-250` · `src/pages/PendingApprovalPage.tsx:47-49` · `src/features/sideBySide/BackgroundInfoForm.tsx:26-28` · `src/features/leads/LeadsPanel.tsx:135-137` · `src/features/sideBySide/ParallelView.tsx:54-56,352-354` · `src/features/registry/BrokerAutocomplete.tsx:79-81` · `src/pages/AdminAgenciesPage.tsx:37` (`alert`) · 번역표. `src/lib/auth.ts:60-85` (auth 계열만).
- 고칠 방향: 저장·조회 오류용 공통 번역 함수를 하나 두고("권한이 없습니다", "인터넷 연결을 확인해 주세요", 그 외 "잠시 뒤 다시 시도") 모든 화면이 그것을 쓴다.

### 10. 비자 사건 등록이 실패해도 초록색 성공 상자에 "등록하지 못했습니다"가 뜬다
- 심각도: 말 (잘못된 판단 유발)
- 어디서: 비자업무 센터 → 비자 사건 등록.
- 무슨 일이: 성공·실패 문구가 같은 `notice` 하나에 담기고 상자 색은 항상 초록(emerald)이다. 초록 상자만 보고 "됐구나" 하고 지나친다. 마케팅 센터와 자동화 센터는 `ok` 여부로 색을 가르는데 여기만 다르다.
- 근거: `src/pages/VisaWorkCenterPage.tsx:114-116` (성공·실패 모두 `setNotice`), `:150` (항상 `border-emerald-200 bg-emerald-50`) · 대비. `src/pages/MarketingCenterPage.tsx:413`, `src/pages/AutomationCenterPage.tsx:151`.
- 고칠 방향: `{ ok, text }` 형태로 바꾸고 실패는 붉은 상자.

### 11. 입력칸 글씨가 14px(일부 13px)라 아이폰에서는 칸을 누를 때마다 화면이 확대된다
- 심각도: 답답
- 어디서: 거의 모든 입력칸. 고객 등록 창, 매칭 창(13px), 프로필 폼(13px), 업체 등록, 비자 사건 등록, 업체 정보, 서류 업로드, 시뮬레이터.
- 무슨 일이: 아이폰 사파리는 글씨 16px 미만인 칸에 초점이 가면 화면을 자동으로 확대한다. 칸마다 확대됐다 풀렸다 하고, 확대된 채로 남아 오른쪽이 잘려 보이면 사장은 두 손가락으로 줄여야 한다. 확대를 막는 설정은 없으니(줌 허용 자체는 잘 돼 있다) 글씨만 키우면 된다.
- 근거: `src/styles/globals.css:88-90` (`.field-control … text-sm` = 14px) · `src/features/agency/CreateClientDialog.tsx:152` (`font-size:0.875rem`) · `src/features/matching/CreateMatchDialog.tsx:114` (`0.8125rem` = 13px) · `src/features/matching/ProfileForm.tsx:150` (13px) · `src/pages/AgencySignupPage.tsx:421-428` · `src/features/visaSimulator/InputForm.tsx:286-295` · `src/pages/OfficePage.tsx:281,293` · `src/features/documents/DocumentSection.tsx:157-184` · `index.html:10` (확대 금지 없음, 좋음).
- 고칠 방향: 입력칸·선택칸·글상자의 글씨를 16px로 통일한다(`.field-control`과 각 화면의 `.input`).

### 12. 숫자를 치는 칸인데 글자 자판이 뜬다 — 업체 연락처, 사업자등록번호
- 심각도: 답답
- 어디서: 업체 정보 → 통역자 연락처·현지 파트너 연락처, 업체 등록 → 사업자등록번호.
- 무슨 일이: 자판 종류 지정이 없어 휴대폰에서 일반 글자판이 뜬다. 숫자로 바꾸는 키를 한 번 더 눌러야 한다. 고객 등록 창의 연락처는 이번에 전화 자판으로 고쳐졌으니 같은 처리를 나머지에도 하면 된다.
- 근거: `src/pages/OfficePage.tsx:50,66` (`type: 'text'`) · `src/pages/AgencySignupPage.tsx:370-379` (10자리 숫자인데 `inputMode` 없음) · 대비. `src/features/agency/CreateClientDialog.tsx:120` (`type="tel" inputMode="tel"`, 반영됨).
- 고칠 방향: 연락처는 `type="tel"`, 사업자등록번호·등록번호는 `inputMode="numeric"`.

### 13. 연소득·순자산·자본금을 원 단위 숫자 나열로 친다 — "36000000"
- 심각도: 위험
- 어디서: 고객 등록 창 「연소득 (원)」, 비자 준비도 점검의 소득·순자산 칸, 업체 정보 「자본금(원)」.
- 무슨 일이: 0을 여덟 개 세어 치는데 천 단위 구분이 없다. 0 하나를 더 치거나 덜 치면 3천만원이 3억이나 3백만원이 되고, F-6 소득 요건 판정과 고객 화면의 연소득이 그대로 틀린다. 저장 후 보여줄 때만 쉼표를 찍어 준다.
- 근거: `src/features/agency/CreateClientDialog.tsx:130` (`type="number"`, 자리표시자 "예: 36000000") · `src/features/visaSimulator/InputForm.tsx:132-139,147-150` · `src/pages/OfficePage.tsx:132` · 표시만 쉼표. `src/pages/ClientDetailPage.tsx:98` (`toLocaleString`).
- 고칠 방향: 만원 단위로 받거나("3,600만원"), 치는 동안 천 단위 쉼표를 찍어 보여주고 저장할 때 숫자로 바꾼다.

### 14. 생년월일을 날짜 선택기로 받아 1970년대생 고객을 등록하려면 아이폰 휠을 50년 돌려야 한다
- 심각도: 답답
- 어디서: 고객 등록 창 「생년월일」, 매칭 탭 프로필 「생년월일 (양력)」.
- 무슨 일이: `type="date"`는 휴대폰에서 오늘 날짜부터 시작하는 선택기를 띄운다. 50대 고객의 생일을 넣으려면 연도를 한참 거슬러 올라가야 하고, 안드로이드는 달력에서 연도 제목을 따로 눌러 바꿔야 한다. 마감일·맞선일처럼 가까운 날짜에는 맞는 방식이지만 생년월일에는 맞지 않는다.
- 근거: `src/features/agency/CreateClientDialog.tsx:109` · `src/features/matching/ProfileForm.tsx:78`. (기기별 선택기 동작은 일반적으로 알려진 것이며 실기기 확인 필요.)
- 고칠 방향: 생년월일은 숫자 8자리("19750312") 또는 연·월·일 세 칸으로 받고 저장 시 날짜로 바꾼다.

### 15. 중요한 상태가 10~11px 글씨로 적혀 있다 — "24시간 넘게 연락 전", 수임료 조건, 캐럿 규칙
- 심각도: 말
- 어디서: 접수 줄의 상태 배지와 경고, 비자 대행 수임료의 조건·시작일, 자동화 센터 캐럿 규칙, 마케팅 견적 조건, 하단 메뉴 이름, 매칭 결과 버튼, 하람 접수 동의문.
- 무슨 일이: 10~11px 글씨가 화면 전체에 93곳이다. 장식 문구면 상관없지만 아래는 사장이 행동을 결정하는 정보다. 50대 눈에는 읽히지 않는다.
- 근거: `src/features/leads/LeadsPanel.tsx:152-155` ("24시간 넘게 연락 전"·"다시 연락할 날 지남"·상태 배지, 10px), `:183` ("칸을 벗어나면 저장됩니다", 11px) · `src/pages/VisaWorkCenterPage.tsx:184-191` (대행 시작일·수임료 조건, 11px), `:161,167` (회원/비회원 10px) · `src/pages/AutomationCenterPage.tsx:141-142` (캐럿 잔량·규칙 11/10px), `:264` (제출 금지 안내 11px) · `src/pages/MarketingCenterPage.tsx:292,408-411` (가격 조건·부가세 안내 11px) · `src/components/layout/Sidebar.tsx:61` (하단 메뉴 이름 10px) · `src/features/matching/MatchHistory.tsx:88` (버튼 11px) · `src/components/chat/HaramChat.tsx:335-360` (동의문 11px) · `src/features/timeline/TimelineView.tsx:396` (자동 완료 안내 11px). 전체 목록은 `text-[9~11px]` 검색 93건.
- 고칠 방향: 상태·경고·돈·기한에 관한 글은 최소 14px. 배지는 13px 이상. 순수 장식(영문 소제목)만 작게 남긴다.

### 16. 아이콘만 있는 작은 버튼과 14px 체크박스 — 닿는 면적이 44px에 한참 못 미친다
- 심각도: 답답
- 어디서: 서류 목록의 「열기」 링크, 매칭 창·등록 창의 닫기 X, 알림 종, 업체 정보·제공 기록·거부 사례의 체크박스, 접수 줄의 다음 연락일 달력.
- 무슨 일이: 서류 열기는 14px 아이콘에 여백 6px(총 26px)이고 이름표도 없어 무슨 버튼인지 보조기기가 못 읽는다. 매칭 창 닫기도 이름표가 없다. 체크박스는 14px짜리라 손끝으로 정확히 맞추기 어렵고, 글자 부분을 눌러도 체크되는 곳(라벨로 감싼 곳)과 안 되는 곳이 섞여 있다.
- 근거: `src/features/documents/DocumentSection.tsx:82-89` (열기 링크 `p-1.5`+14px, aria-label 없음) · `src/features/matching/CreateMatchDialog.tsx:69` (X `p-1`+18px, aria-label 없음) · `src/features/agency/CreateClientDialog.tsx:93` (26px, 이름표는 있음) · `src/components/layout/NotificationBell.tsx:22-27` (`p-2.5`+18px = 38px) · 체크박스 14px. `src/pages/OfficePage.tsx:270`, `src/features/sideBySide/DeliverySection.tsx:185,202`, `src/pages/PrecedentsPage.tsx:348` · 16px. `src/features/timeline/TimelineView.tsx:382` · 기본 크기. `src/components/chat/HaramChat.tsx:336-341` · 달력 칸 `text-xs`. `src/features/leads/LeadsPanel.tsx:194`.
- 고칠 방향: 아이콘 버튼은 최소 44px×44px(여백으로 채움)과 이름표. 체크박스는 20px 이상으로 키우고 라벨 전체를 누를 수 있게 한다.

### 17. 색 점 하나로만 상태를 구분하는 곳 — 접수 보고서 요건표, 빠른 점검 결과, 알림 심각도
- 심각도: 말
- 어디서: 접수 보고서(접수 줄을 펼치면 나오는 표)의 항목 앞 점, 빠른 점검 결과의 항목 앞 점, 알림 목록의 항목 앞 점.
- 무슨 일이: 초록·노랑·회색 점이 "확인됨 / 걸림 / 모름"을 뜻하는 유일한 표시인데 보조기기에서는 숨겨져 있고(aria-hidden) 글자 표시가 없다. 색을 잘 구분 못 하는 눈이나 흑백 인쇄에서는 다 같은 점이다.
- 근거: `src/features/leads/LeadReport.tsx:23-26,68` · `src/features/quickCheck/QuickCheck.tsx:158-161` · `src/components/layout/NotificationBell.tsx:7-11,52`.
- 고칠 방향: 점 옆에 짧은 글자("걸림", "확인", "미확인") 또는 모양이 다른 아이콘을 함께 둔다.

### 18. 알림 목록은 종을 다시 눌러야만 닫힌다 — 바깥을 눌러도, 뒤로 가기도 안 닫히고 닫기 버튼도 없다
- 심각도: 답답
- 어디서: 상단바 종 아이콘.
- 무슨 일이: 열림 상태가 종 버튼 하나로만 바뀐다. 목록이 화면 폭 대부분(최대 320px)을 덮은 채 남아 뒤 화면의 버튼을 가린다. 업체명 검색은 바깥 클릭으로 닫히게 만들어져 있어 대비된다.
- 근거: `src/components/layout/NotificationBell.tsx:14-15,22-23,36-37` · 대비. `src/features/registry/BrokerAutocomplete.tsx:43-51`.
- 고칠 방향: 바깥 클릭·뒤로 가기·Esc로 닫히게 하고 목록 위에 「닫기」를 둔다.

### 19. 탭·필터·펼침 상태가 주소에 없어 새로고침이나 뒤로 가기 뒤 처음으로 돌아간다
- 심각도: 답답
- 어디서: 고객 상세의 컴플라이언스/매칭 탭, 접수 탭의 필터와 펼친 손님, 업체 정보의 다섯 탭, 고객 검색어, 사례 검색어, 검토실 필터.
- 무슨 일이: 사장의 실제 동선은 "접수 탭 → 손님 펼쳐 전화 → 고객으로 등록 → 고객 화면 → 뒤로". 돌아오면 접수 목록은 접힌 채 '진행 중' 필터로 초기화돼 아까 그 손님을 다시 찾아야 한다. 고객 상세에서 매칭 탭을 보다 새로고침하면 컴플라이언스 탭이다. 고객 목록의 접수/고객 탭과 신상정보 화면·규제 화면은 주소에 담겨 있어 잘 된다.
- 근거: `src/pages/ClientDetailPage.tsx:45` (탭 지역 상태) · `src/features/leads/LeadsPanel.tsx:55-56` (필터·펼침) · `src/pages/OfficePage.tsx:159` · `src/pages/ClientListPage.tsx:42` (검색어) · `src/pages/PrecedentsPage.tsx:257` · `src/pages/LawyerWorkbenchPage.tsx:14` · 잘 된 예. `src/pages/ClientListPage.tsx:38-51`, `src/pages/BackgroundInfoPage.tsx:27-29`, `src/pages/RegulatoryRadarPage.tsx:46-47`.
- 고칠 방향: 탭·필터·펼친 항목 id를 `?tab=`·`?filter=`·`?open=`처럼 주소에 담는다(고객 목록 탭이 이미 하는 방식).

### 20. 막다른 화면 — 갈 곳을 안 주는 안내문 네 곳
- 심각도: 답답
- 어디서: 고객 상세("고객을 찾을 수 없습니다."), 타임라인("관리자에게 문의하세요"), 비자 사건 빈 목록, 고객 검색 결과 0건.
- 무슨 일이: 고객이 없을 때는 "고객 목록으로" 링크가 그려지지 않아 글자 한 줄만 남는다(링크는 정상 화면에서만 그려진다). 타임라인은 "관리자에게 문의"라면서 어디로 어떻게 문의하는지 없다. 비자 사건이 없을 때 "첫 사건을 등록하면…"이라 하지만 등록 버튼은 화면 맨 위다. 고객 검색 결과가 없으면 빈 상자만 남고 "검색 결과 없음"조차 없다.
- 근거: `src/pages/ClientDetailPage.tsx:49-50` (링크는 `:83-85`, 정상 분기에만) · `src/features/timeline/TimelineView.tsx:62-67` · `src/pages/VisaWorkCenterPage.tsx:198` (버튼은 `:128`) · `src/pages/ClientListPage.tsx:114-136` (0건 문구 없음).
- 고칠 방향: 안내문마다 다음 행동 버튼을 붙인다. "고객 목록으로", "문의하기(전화·채팅)", "새 비자 사건 등록", "검색어를 바꿔 보세요 / 신규 고객 등록".

### 21. 휴대폰에서 방향이 틀린 안내문 — "오른쪽 서류 섹션", "좌측에서 선택"
- 심각도: 말
- 어디서: 타임라인 서랍의 증빙 안내, 신상정보 교환 화면의 빈 상태.
- 무슨 일이: 두 화면 모두 휴대폰에서는 한 줄 배치(위→아래)라 서류 섹션은 아래에, 신상정보 목록은 위에 있다. "오른쪽"·"좌측"을 찾다 못 찾는다.
- 근거: `src/features/timeline/TimelineView.tsx:368` ("오른쪽 서류 섹션에서 업로드하세요") ← `src/pages/ClientDetailPage.tsx:163` (`grid-cols-1 lg:grid-cols-3`) · `src/pages/BackgroundInfoPage.tsx:117` ("좌측에서 신상정보를 선택") ← `:91` (`grid-cols-1 lg:grid-cols-[220px_1fr]`).
- 고칠 방향: 방향 대신 이름으로 말하고("「서류」 칸에서 업로드", "위 목록에서 선택") 가능하면 그 자리로 가는 버튼을 붙인다.

### 22. 업무 화면은 인쇄하면 첫 화면 한 장만 나온다
- 심각도: 답답
- 어디서: 로그인 뒤 모든 화면. 특히 접수 보고서, 고객 타임라인, 고객 기본정보.
- 무슨 일이: 업무 화면 전체가 "화면 높이에 고정되고 넘치는 부분은 안쪽에서 스크롤"하는 구조다. 브라우저 인쇄는 이런 안쪽 스크롤 상자를 보이는 부분만 찍으므로 두 번째 화면부터는 종이에 안 나온다. 인쇄용 스타일은 시뮬레이터에만 있고, 매칭 보고서 인쇄 파일은 만들어 놓고 어느 화면에서도 쓰지 않는다. 하단 메뉴(고정 요소)는 인쇄에 같이 찍힌다. 사장이 접수 보고서를 뽑아 들고 손님을 만나거나 타임라인을 출력해 관공서에 가져갈 수 없다.
- 근거: `src/components/layout/AppLayout.tsx:7` (`h-dvh overflow-hidden`), `:11` (`main … overflow-y-auto`) · 인쇄 스타일. `src/pages/VisaSimulatorPage.tsx:106-112`만 · `src/features/matching/MatchReport.tsx:53,149` (사용처 검색 결과 없음) · `src/components/layout/Sidebar.tsx:59` (`print:hidden` 없음). 스크롤 상자 인쇄 잘림은 알려진 브라우저 동작이며 실측은 안 했다.
- 고칠 방향: 인쇄 스타일에서 `html, body, main`의 높이 고정·overflow를 풀고 사이드바·하단 메뉴·하람을 숨긴다. 접수 보고서와 타임라인에 「인쇄」 버튼을 둔다.

### 23. 휴대폰 홈 화면에 추가하면 아이콘이 없다
- 심각도: 말
- 어디서: 사파리·크롬의 "홈 화면에 추가", 앱처럼 설치(PWA)할 때.
- 무슨 일이: 설치용 매니페스트의 아이콘 목록이 비어 있고, 아이폰용 아이콘(`apple-touch-icon`)이 SVG 파일을 가리키는데 아이폰은 PNG만 받는다. 그래서 홈 화면에 흰 네모나 화면 캡처가 붙는다. 휴대폰 위주로 쓰는 사장에게 바탕화면 아이콘은 서비스로 들어오는 첫 문이다. `public/`에 PNG 아이콘이 없다.
- 근거: `vite.config.ts:21` (`icons: []`) · `index.html:6` (`apple-touch-icon` → `/favicon.svg`) · `public/` 목록에 `favicon.svg`, `og-image.png`만.
- 고칠 방향: 180px·192px·512px PNG 아이콘을 만들어 매니페스트와 `apple-touch-icon`에 넣는다.

### 24. 자동화 센터의 단계 표시가 늘 "STEP 1 고객 선택"에 멈춰 있다
- 심각도: 말
- 어디서: AI 업무 자동화 → 위쪽 1·2·3단계 칸.
- 무슨 일이: 고객을 고르고 동의를 기록해도 첫 칸만 초록으로 켜져 있다. 코드가 "첫 번째 칸이면 켜라"로 고정돼 있어 진행 상태와 무관하다. 사장은 "아직 1단계인가" 하고 헤맨다.
- 근거: `src/pages/AutomationCenterPage.tsx:148` (`index === 0 ? 켜짐 : 꺼짐`).
- 고칠 방향: 고객 선택 여부·동의 여부·생성 가능 여부에 따라 칸을 켠다.

### 25. 접수를 「고객으로 등록」한 뒤 접수 닫기가 실패하면 조용히 넘어가 같은 손님이 접수 탭에 남는다
- 심각도: 위험
- 어디서: 고객 관리 → 접수 탭 → 고객으로 등록.
- 무슨 일이: 고객은 만들어졌는데 접수 상태를 '고객 등록됨'으로 바꾸는 저장이 실패하면 아무 표시 없이 고객 화면으로 넘어간다. 접수 탭에는 그 손님이 '상담 중'으로 그대로 남아, 나중에 다른 직원이 또 「고객으로 등록」을 눌러 같은 사람이 두 번 등록될 수 있다. 코드 주석은 "목록에서 다시 누르면 된다"고 하지만 화면에는 그 말이 없다.
- 근거: `src/pages/ClientListPage.tsx:152-163` (실패를 붙잡되 아무것도 안 함).
- 고칠 방향: 실패 시 고객 화면 위에 "접수 표시를 못 바꿨습니다. 접수 탭에서 '고객 등록됨'으로 바꿔 주세요"를 띄운다. 접수 줄에 이미 만들어진 고객이 있으면 「고객 화면으로」만 보이게 한다.

### 26. 마케팅 센터 「삽입 코드 복사」가 실패하면 아무 반응이 없다
- 심각도: 답답
- 어디서: 마케팅 센터 → 홈페이지 요건 점검 위젯 → 삽입 코드 복사.
- 무슨 일이: 휴대폰 일부 브라우저와 보안 설정에서는 복사 기능이 막힌다. 그때 버튼을 눌러도 "복사됐습니다"도 오류도 안 뜬다. 사장은 복사된 줄 알고 홈페이지 관리자에게 빈 메시지를 보낸다.
- 근거: `src/pages/MarketingCenterPage.tsx:150-157` (`catch` 비어 있음).
- 고칠 방향: 실패하면 "복사가 안 됩니다. 아래 '코드 직접 보기'를 열어 길게 눌러 복사하세요"를 띄우고 코드 상자를 자동으로 연다.

### 27. 로그인 화면이 준비되는 동안 하얀 화면만 보인다
- 심각도: 답답
- 어디서: `/login` 첫 진입, 특히 휴대폰 데이터로 접속할 때.
- 무슨 일이: 로그인 상태를 확인하기 전까지 화면에 아무것도 그리지 않는다(`return null`). 인증 뭉치(약 530KB)를 받는 몇 초 동안 흰 화면이라 사장은 "안 열리네" 하고 닫는다. 보호 화면 쪽은 같은 상황에 "불러오는 중…"을 보여준다.
- 근거: `src/pages/LoginPage.tsx:18` · 대비. `src/components/auth/ProtectedRoute.tsx:13-19` · 용량 주석. `vite.config.ts:32-35`.
- 고칠 방향: 로그인 폼 자리에 "준비 중…" 문구나 회색 자리표시를 그린다.

### 28. 구글 로그인이 팝업 방식이라 휴대폰에서 막히기 쉽다
- 심각도: 답답
- 어디서: 로그인 화면 「Google 계정으로 계속하기」.
- 무슨 일이: 새 창(팝업)을 띄우는 방식은 휴대폰 브라우저와 앱 안 브라우저에서 자주 차단된다. 코드에 "팝업이 막혀…" 문구를 미리 준비해 둔 것이 그 상황을 예상했다는 뜻이다. 카톡 안 브라우저는 바깥으로 넘기는 처리가 있지만 그 밖의 앱(네이버·인스타)에서는 그대로다.
- 근거: `src/lib/auth.ts:44-46` (`signInWithPopup`), `:72` (팝업 차단 문구) · `public/open-external.js:22-23` (카톡만 처리).
- 고칠 방향: 휴대폰에서는 같은 창에서 구글로 갔다 돌아오는 방식(redirect)을 쓴다.

### 29. 결제 실패 화면의 「돌아가기」가 마케팅 결제였어도 자동화 센터로 간다
- 심각도: 말
- 어디서: 카드 결제 뒤 실패 화면.
- 무슨 일이: 성공 화면은 결제 종류에 따라 돌아갈 곳을 가르는데 실패 화면은 무조건 자동화 센터다. 마케팅 상품을 결제하다 실패한 사장이 엉뚱한 화면에 떨어진다.
- 근거: `src/pages/PaymentResultPage.tsx:84-90` (성공은 `kind`로 분기), `:114-121` (실패는 `/agency/automation` 고정).
- 고칠 방향: 실패 주소에도 종류를 붙여 오거나 "이전 화면으로"로 바꾼다.

### 30. 업체 등록(가입) 화면이 휴대폰에서 좌우 여백 없이 화면 가장자리에 붙는다
- 심각도: 말
- 어디서: `/signup/agency`.
- 무슨 일이: 바깥 상자에 좌우 여백이 없어 흰 카드와 테두리가 화면 양끝에 닿는다. 안쪽 여백 32px은 있어 읽는 데 지장은 없지만 다른 화면과 달리 답답하게 보인다.
- 근거: `src/pages/AgencySignupPage.tsx:256-257` (`min-h-screen … py-12` → `mx-auto max-w-xl … p-8`, `px` 없음).
- 고칠 방향: 바깥 상자에 `px-4` 정도 여백.

## 확신이 낮은 항목

- **매칭 기록 줄이 휴대폰에서 옆으로 넘칠 것 같다.** 결과 버튼 4개(축소 금지 `shrink-0`)와 두 사람 이름이 한 줄에 있어 폭 326px(390px 화면)을 넘길 것으로 계산된다. 넘치면 화면 전체가 좌우로 흔들린다. `src/features/matching/MatchHistory.tsx:53-96`. 추측 — 이름 길이에 따라 다르다.
- **서류 목록의 긴 영문 파일명(`KakaoTalk_20260415_094620991.jpg`)이 줄바꿈 없이 옆으로 밀릴 수 있다.** 파일명 칸에 줄임 처리가 없고 부모에 `min-w-0`이 없다. `src/features/documents/DocumentSection.tsx:58-75`. 추측 — 한글 파일명은 글자 단위로 꺾여 문제없다.
- **대시보드 '조치 필요 항목'의 제목이 길면 오른쪽 D-day 배지를 밀어낼 수 있다.** 줄임(`truncate`)이 인라인 링크에 걸려 있어 효과가 없다. `src/pages/AgencyDashboardPage.tsx:205-211`. 추측 — 제목 길이에 달렸다.
- **하단 메뉴가 아이폰 홈 표시줄(화면 맨 아래 가로 막대)과 겹칠 수 있다.** 안전 영역(safe-area) 처리가 없고 매니페스트가 전체화면 설치(`display: standalone`)를 허용한다. 설치해서 쓰면 메뉴 아랫부분이 홈 제스처 영역에 들어간다. `index.html:10` (`viewport-fit` 없음), `src/components/layout/Sidebar.tsx:59`, `vite.config.ts:19`. 추측 — 브라우저에서 쓸 때는 브라우저 도구막대가 아래에 있어 겹치지 않는다.
- **규제 레이더의 법령 필터 5개가 390px에서 가로로 잘려 뒤쪽 두 개(다문화가족지원법·국제사법)가 안 보일 것 같다.** 가로 스크롤은 되지만 잘려 있다는 표시가 없다. `src/pages/RegulatoryRadarPage.tsx:87-101`. 추측 — 글자 폭 계산.
- **신상정보 교환 화면의 제목 줄에 「한국인 측 신규」·「외국인 측 신규」 버튼 두 개가 제목과 한 줄에 있어 390px에서 버튼 글자가 두 줄로 꺾이거나 제목이 눌릴 것 같다.** `src/pages/BackgroundInfoPage.tsx:67-88` (`flex items-center justify-between`, 줄바꿈 허용 없음). 추측.
- **고객 상세 상단이 휴대폰에서 답답할 것 같다.** 왼쪽 이름·연락처·주소 표(2열)와 오른쪽 버튼 두 개가 가로로 나뉘어 주소가 여러 줄로 꺾인다. 깨지지는 않는다. `src/pages/ClientDetailPage.tsx:88-122`. 추측.
- **접수 통화 메모가 '칸을 벗어나면 저장'인데, 메모를 치다가 전화가 와서 앱을 벗어나면 저장이 안 될 수 있다.** 초점이 빠지는 순간에만 저장한다. `src/features/leads/LeadsPanel.tsx:176-183`. 추측 — 기기별로 앱 전환 시 초점 처리가 다르다.
