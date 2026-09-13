# 06 · 신상정보 교환 — 사장 시점 점검 (2026-09-05)

점검자 설정. 국제결혼중개업 사장. 휴대폰을 주로 쓰고, 개발 용어를 모르며, 화면 글자를 그대로 읽는다.
한국인 손님 한 명에게 베트남·캄보디아 후보 두세 명을 붙이는 상황을 상상하며 "고객 상세 → 신상정보 교환" 버튼부터 끝까지 따라갔다.

## 읽은 파일

- `src/pages/BackgroundInfoPage.tsx` — 화면 뼈대(목록·편집·나란히 보기·제공 기록 탭)
- `src/features/sideBySide/fields.ts` — 입력 항목 9개와 6개 언어 라벨
- `src/features/sideBySide/useBackgroundInfo.ts` — 저장·불러오기·번역 저장·서명 호출
- `src/features/sideBySide/BackgroundInfoForm.tsx` — 편집 폼
- `src/features/sideBySide/ParallelView.tsx` — 나란히 보기·AI 번역·서명
- `src/features/sideBySide/useDelivery.ts`, `DeliverySection.tsx` — 제공 기록
- `functions/src/translation/index.ts` — AI 번역 서버 함수
- `functions/src/translation/sign.ts` — 서명 서버 함수
- `functions/src/documents/index.ts` — 서류 유효기간 알림(이 화면과 직접 연결 없음)
- `functions/src/timeline/index.ts`, `functions/src/admin/obligationTemplates.ts` — 타임라인 자동 완료 로직
- `firestore.rules` 160~215줄 — backgroundInfo·translations·deliveries 저장 규칙
- `src/types/schema.ts` — Client·Partner·Translation·AnchorKey 타입
- `src/pages/ClientDetailPage.tsx`, `src/features/documents/consistency.ts`, `ConsistencyCard.tsx` — 고객 상세의 점검 카드
- `src/pages/AutomationCenterPage.tsx` — AI 동의 등록 위치
- `src/features/timeline/TimelineView.tsx`, `useTimeline.ts` — 맞선 예정일 입력 위치
- `src/content/lawArticles.ts` — 앱이 스스로 싣고 있는 법 원문(항목 번호 대조용)

용어 풀이. **원본 언어(sourceLang)** = 이 신상정보가 처음 적힌 언어. **번역본(translation)** = 원본을 다른 언어로 옮긴 것, 언어마다 한 장씩 저장된다. **제공 기록(delivery)** = 누구에게 언제 어떤 언어본을 건넸는지 적는 장부. **서명(sign)** = 이름을 입력하고 버튼을 누르면 서버가 "누가 언제"를 적는 것.

## 발견

### 1. "외국인 측 신규"를 누르면 원본 언어가 무조건 베트남어로 박히고, 바꿀 방법이 없다
- 심각도: 막힘
- 어디서: 신상정보 교환 화면 상단 "외국인 측 신규" 버튼 → 편집 탭 → 나란히 보기 탭
- 무슨 일이: 캄보디아·우즈벡·필리핀 후보의 신상정보를 만들어도 원본 언어가 베트남어로 저장된다. 편집 화면의 항목 이름은 항상 한국어라 사장은 한국어로 적는데, 나란히 보기에서는 그 한국어 글이 "Tiếng Việt (원본)" 열에 뜬다. 원본 언어를 고치는 칸이 화면 어디에도 없다.
- 근거: `src/pages/BackgroundInfoPage.tsx:52` (`sourceLang: subject === 'korean' ? 'ko' : 'vi'`), `src/features/sideBySide/BackgroundInfoForm.tsx:50,53` (라벨·설명이 항상 `labels.ko`·`descriptions.ko`), `src/features/sideBySide/ParallelView.tsx:125-127,250` (원본 열 제목이 `LANG_LABEL[sourceLang]`), 원본 언어 변경 UI 없음(`useBackgroundInfo.ts:114-126`의 `updateBackgroundInfoFields`는 `fields`만 갱신)
- 고칠 방향: 외국인 측을 만들 때 국적·언어를 고르게 하거나(상대방 등록 정보에서 가져오기), 편집 탭에 "이 글은 어느 나라 말로 적혔나" 선택을 둔다.

### 2. 외국인 측 신상정보에서 "나란히 보기"를 열면 번역 버튼이 곧바로 실패한다
- 심각도: 막힘
- 어디서: 외국인 측 문서 → 나란히 보기 탭 → "AI 번역 생성"
- 무슨 일이: 번역 대상 언어의 기본값이 베트남어인데, 외국인 측 문서는 원본도 베트남어다. 선택 상자는 베트남어를 빼고 보여 주지만 속 값은 여전히 베트남어라, 양쪽 열 제목이 모두 "Tiếng Việt"로 뜨고 번역 버튼을 누르면 "원본과 동일한 언어로 번역 불가"가 뜬다. 사장은 왜 안 되는지 모른다. 선택 상자에서 다른 언어를 한 번 골라야 풀린다.
- 근거: `src/pages/BackgroundInfoPage.tsx:34` (`useState<SupportedLang>('vi')`), `src/features/sideBySide/ParallelView.tsx:87-97` (표시 목록에서만 원본 언어 제외, 상태값은 그대로), `ParallelView.tsx:135-144` (오른쪽 열 제목 `LANG_LABEL[targetLang]`), `functions/src/translation/index.ts:87-89` (같은 언어면 오류)
- 고칠 방향: 대상 언어 기본값을 "원본이 한국어면 상대방 언어, 원본이 외국어면 한국어"로 정하고, 원본과 같은 값이 남지 않게 한다.

### 3. 손님에게 줄 서면(종이·PDF)을 이 화면에서 뽑을 수 없다
- 심각도: 막힘
- 어디서: 신상정보 교환 화면 전체
- 무슨 일이: 법은 신상정보를 "서면으로" 상대방이 이해할 수 있는 언어로 제공하라고 한다. 그런데 이 화면에는 인쇄·PDF 저장 버튼이 없다. 사장은 화면을 보며 다른 프로그램에 옮겨 적거나 화면을 캡처해야 한다. 제공 기록 탭은 "어떤 언어본을 줬나"를 적게 하지만 정작 그 언어본을 만들어 주지 않는다. 같은 앱의 매칭 보고서에는 인쇄 버튼이 있다.
- 근거: `src/features/sideBySide/` 6개 파일에 `print`·`pdf` 문자열 없음(grep 결과), `src/features/matching/MatchReport.tsx:53` (`window.print()` 있음), `src/content/lawArticles.ts:77,432` (서면 제공·번역 제공 조문)
- 고칠 방향: 나란히 보기에 "인쇄 / PDF 저장" 버튼을 두고, 원본·번역본·서명란이 한 장에 나오는 인쇄용 양식을 만든다. 제공 기록에서 "이 PDF를 건넸다"로 연결한다.

### 4. 목록에서 다른 신상정보를 눌러도 편집 칸에는 이전 것의 내용이 남고, 저장하면 덮어쓴다
- 심각도: 위험
- 어디서: 편집 탭에서 왼쪽 목록의 다른 항목을 눌렀을 때
- 무슨 일이: 한국인 측을 편집하다가 왼쪽에서 외국인 측을 누르면, 제목은 바뀌어도 입력 칸에는 한국인 측 내용이 그대로 남는다. 그 상태로 "저장"을 누르면 외국인 측 문서가 한국인 측 내용으로 덮어써진다. 사장은 자기가 무엇을 망쳤는지 알 수 없다.
- 근거: `src/features/sideBySide/BackgroundInfoForm.tsx:13` (`useState<Values>(initial ?? {})` — 처음 한 번만 읽음), `src/pages/BackgroundInfoPage.tsx:144-151` (`<BackgroundInfoForm initial={info.fields} …/>`에 `key` 없음 → 같은 폼이 재사용됨), `src/features/sideBySide/useBackgroundInfo.ts:72-86` (문서가 바뀌어도 새 자료가 올 때까지 `info`가 이전 값 유지 → 폼이 사라지지 않음)
- 고칠 방향: 폼에 `key={info.id}`를 주어 문서가 바뀌면 새로 그리게 한다(개발자에게 한 줄 수정).

### 5. 서명이 끝난 번역이라도 "AI 번역 생성"을 다시 누르면 서명이 지워지고 사람이 고친 번역도 사라진다
- 심각도: 위험
- 어디서: 나란히 보기 탭 → "AI 번역 생성" / "AI 번역 재생성" 버튼
- 무슨 일이: 직원이 한 시간 들여 크메르어 번역을 손본 뒤 양쪽 서명까지 받았다. 누군가 버튼을 한 번 더 누르면(원본을 한 글자만 고쳐도 버튼 이름이 "재생성"으로 바뀌어 누르고 싶어진다) 서버가 번역 전체를 AI 결과로 갈아 끼우고 서명 칸을 비운다. 확인 창이 없고, 이 일은 감사기록에도 남지 않는다.
- 근거: `functions/src/translation/index.ts:150-160` (`fields: translated, translatedBy: 'ai', signedAt: null, signedByName: null` 로 덮어씀), `src/features/sideBySide/ParallelView.tsx:99-106` (서명 여부와 무관하게 버튼 활성, 확인 창 없음), `ParallelView.tsx:218-237` (사람이 고친 번역은 `translatedBy: 'human'`으로 저장되지만 재생성이 이를 덮음), 서명 때만 감사기록(`functions/src/translation/sign.ts:136-154`), 번역 함수에는 없음
- 고칠 방향: 서명된 번역은 재생성을 막거나 "서명이 지워집니다. 계속할까요?"를 반드시 묻는다. 사람이 고친 번역이 있으면 새 번역을 옆에 초안으로 두고 고르게 한다.

### 6. 한국어 원본 쪽 "수령 및 이해 확인" 서명은 끝나도 화면에 완료 표시가 안 뜨고, 몇 번이고 다시 서명돼 앞선 시각을 덮어쓴다
- 심각도: 위험
- 어디서: 나란히 보기 탭 아래 왼쪽 "한국어 수령 및 이해 확인" 상자
- 무슨 일이: 이름을 넣고 "이해했으며 서명합니다"를 누르면 서버는 기록하지만 화면은 그대로 빈 칸이다. 사장은 안 된 줄 알고 또 누른다. 누를 때마다 서명 시각이 새로 찍혀, 나중에 "맞선 전에 서명받았다"는 증거가 맞선 뒤 시각으로 바뀔 수 있다.
- 근거: `src/features/sideBySide/ParallelView.tsx:149-162` (원본 쪽 상자에 `signedAt: null, signedByName: null`을 고정값으로 넘김), `ParallelView.tsx:329,365` (`signed`가 항상 false → 완료 화면 안 뜸), `functions/src/translation/sign.ts:130-134` (부를 때마다 `signedAt` 새로 기록)
- 고칠 방향: 원본 쪽도 `translations/ko` 문서를 읽어 서명 여부를 보여 주고, 이미 서명된 문서는 다시 서명하지 못하게 한다.

### 7. "서명"이 실제로는 직원이 손님 이름을 타이핑하는 것이다
- 심각도: 위험
- 어디서: 나란히 보기 탭 서명 상자
- 무슨 일이: "서명자 이름" 칸에 이름을 치고 버튼을 누르면 끝이다. 베트남에 있는 상대방이 볼 수 있는 링크·QR·손서명·사진 첨부가 없다. 서버는 누른 직원의 계정과 IP를 남길 뿐이다. 사장은 이것이 법이 말하는 "서면 동의"라고 믿기 쉬운데, 다툴 때 "직원이 이름을 친 것"으로 보일 수 있다.
- 근거: `src/features/sideBySide/ParallelView.tsx:374-386` (이름 입력 + 버튼), `functions/src/translation/sign.ts:130-134,151-152` (`signedByUid: request.auth.uid`, IP·브라우저 = 직원 것), `src/content/lawArticles.ts:428` (시행령 — 이용자와 상대방으로부터 서면 동의)
- 고칠 방향: 상대방 휴대폰으로 보내는 확인 링크(모국어)·손서명 그리기·수령확인서 사진 첨부 중 하나를 붙이고, 화면에 "이 기록은 서면 동의를 대신하지 않습니다. 수령확인서 원본을 보관하세요"를 적는다.

### 8. 제공 기록 추가 창에서 "수령 확인을 받았다", "내용을 설명했다"가 처음부터 체크되어 있다
- 심각도: 위험
- 어디서: 제공 기록 탭 → "기록 추가"
- 무슨 일이: 창을 열면 두 체크가 이미 켜져 있다. 급한 사장이 날짜만 보고 저장하면 확인도 설명도 안 했는데 "수령확인 있음 · 설명 함"으로 남는다. 나중에 조사에서 이 기록이 사실과 다르면 더 불리하다.
- 근거: `src/features/sideBySide/DeliverySection.tsx:50,52` (`useState(true)` 둘 다), `DeliverySection.tsx:287-302` (목록에 "수령확인 있음", "설명 함"으로 표시)
- 고칠 방향: 기본값을 꺼진 상태로 두고, 켤 때 이름을 반드시 적게 한다.

### 9. 제공 기록의 기본 날짜가 새벽에는 어제로 나온다
- 심각도: 위험
- 어디서: 제공 기록 탭 → "기록 추가" → "건넨 날짜"
- 무슨 일이: 한국 시간 새벽 0시부터 9시 사이에 창을 열면 기본 날짜가 어제다. 아침 일찍 기록하는 사장은 어제 날짜로 저장하게 되고, 맞선일 대조가 어긋난다.
- 근거: `src/features/sideBySide/DeliverySection.tsx:25` (`new Date().toISOString().slice(0, 10)` — 세계표준시 날짜)
- 고칠 방향: 한국 시간 기준으로 오늘 날짜를 만든다.

### 10. 제공 기록 삭제가 확인 없이 즉시 된다
- 심각도: 위험
- 어디서: 제공 기록 목록 각 줄 오른쪽 끝의 작은 회색 휴지통
- 무슨 일이: 휴대폰에서 스크롤하다 손가락이 닿으면 3년 보관해야 할 제공 기록이 바로 사라진다. "삭제할까요?"가 없고 되돌리기도 없다.
- 근거: `src/features/sideBySide/DeliverySection.tsx:269-284` (누르면 곧바로 `removeDelivery`), `src/features/sideBySide/useDelivery.ts:116-129` (`deleteDoc`), `firestore.rules:203-206` (쓰기 권한 있으면 삭제 허용)
- 고칠 방향: 확인 창을 띄우고, 삭제 대신 "취소됨" 표시로 남기는 편이 법정 기록에 맞는다.

### 11. 제공 기록이 번역·서명과 이어져 있지 않아, 만든 적 없는 언어본을 건넸다고 적을 수 있다
- 심각도: 위험
- 어디서: 제공 기록 탭 → "기록 추가" → "어떤 언어본"
- 무슨 일이: 베트남어 번역을 한 번도 만들지 않았어도 "베트남어본 대면 교부"로 저장된다. 반대로 언어본 기본값이 "한국어"라 외국인 상대방에게 줬다면서 한국어본으로 기록되기 쉽다. 사장은 장부가 맞는 줄 안다.
- 근거: `src/pages/BackgroundInfoPage.tsx:163-170` (제공 기록 화면에 번역 목록을 넘기지 않음), `src/features/sideBySide/useDelivery.ts:89-114` (저장 전 검사 없음), `DeliverySection.tsx:47` (`useState<SupportedLang>('ko')`)
- 고칠 방향: 언어본 선택지를 "서명까지 끝난 번역본"으로 한정하고, 받는 사람이 외국인이면 그 언어를 기본값으로 둔다.

### 12. 항목 옆 법 조문 번호가 앱이 스스로 싣고 있는 법 원문과 다르다
- 심각도: 위험
- 어디서: 편집 탭 각 항목 오른쪽 작은 글씨 "결혼중개업법 §10의2 ① N호"
- 무슨 일이: 화면은 범죄경력을 "3호", 직업을 "4호"라고 적는데, 이 앱의 법령 페이지 원문은 3호가 직업, 4호가 범죄경력이다. 게다가 재산·거주지·가족관계·자녀·연소득도 모두 "4호"라 적고 빨간 별(*)로 필수라 하는데, 법 각 호에는 그런 항목이 없다. 사장은 재산을 안 적으면 위법인 줄 알거나, 틀린 조문 번호가 적힌 서면을 손님에게 줄 수 있다.
- 근거: `src/features/sideBySide/fields.ts:95` (범죄경력 "3호"), `fields.ts:113` (직업 "4호"), `fields.ts:59,131,149,167,185` (자녀·연소득·재산·거주지·가족관계 모두 "4호"·`required: true`), 법 원문 `src/content/lawArticles.ts:79-83` (1 혼인경력 / 2 건강상태 / 3 직업 / 4 범죄경력 / 5 상대국 법령 사항)
- 고칠 방향: 조문 번호를 원문에 맞추고, 법이 정한 항목과 "업체가 추가로 받는 항목"을 구분해 표시한다.

### 13. 법이 요구하는 것 중 적을 곳이 없는 것이 많다 — 공증·영사확인·건강진단서 발행기관·확인서 동의·주민번호 삭제
- 심각도: 답답
- 어디서: 편집 탭
- 무슨 일이: 법은 공증인 인증, 외국이면 영사확인 또는 아포스티유, 지정 병원의 건강진단서, 개인신상정보 확인서에 대한 사실확인·동의, 주민번호 지우고 제공을 요구한다. 화면에는 글 상자 9개뿐이라 "공증 받았는지", "언제 받았는지"를 남길 데가 없다. 문서함에 올린 증빙서류와도 연결이 없다.
- 근거: `src/features/sideBySide/fields.ts:38-201` (항목 9개 모두 text·number), `src/content/lawArticles.ts:77,87,428,432` (공증·영사확인·건강진단서·확인서·주민번호), 문서 연결 필드 없음(`useBackgroundInfo.ts:23-33`의 `BackgroundInfoDoc`)
- 고칠 방향: 항목마다 "증빙서류 · 공증 여부 · 공증일"을 붙이고, 문서함의 파일을 고르게 한다.

### 14. 여러 건을 만들면 목록에서 구분이 안 된다 — 이름 칸이 없다
- 심각도: 답답
- 어디서: 신상정보 교환 화면 왼쪽 목록
- 무슨 일이: 후보 세 명의 신상정보를 만들면 목록에 "외국인 측 / 2026. 9. 5." 세 줄이 똑같이 뜬다. 성명·국적을 적는 칸이 없고, 상대방 등록 정보(partners)와도 연결되지 않는다. 누구 것인지는 열어서 내용을 읽어야 안다.
- 근거: `src/pages/BackgroundInfoPage.tsx:104-109` (표시는 한국인/외국인 + 만든 날짜뿐), `src/features/sideBySide/fields.ts:17-26` (성명·국적 키 없음), `src/types/schema.ts:285-298` (`Partner`에 이름·국적·언어가 있으나 `BackgroundInfoDoc`에 `partnerId` 없음)
- 고칠 방향: 외국인 측을 만들 때 상대방을 고르게 하고, 목록에 이름·국적을 보여 준다.

### 15. 신상정보 문서를 지우거나 이름을 바꿀 수 없고, "신규" 버튼은 누를 때마다 빈 문서를 하나씩 더 만든다
- 심각도: 답답
- 어디서: 상단 "한국인 측 신규 / 외국인 측 신규" 버튼, 왼쪽 목록
- 무슨 일이: 잘못 눌러 만든 빈 문서가 목록에 계속 남는다. 삭제 버튼이 없다. 저장 규칙은 삭제를 허용하는데 화면에만 없다.
- 근거: `src/pages/BackgroundInfoPage.tsx:44-59` (누르면 즉시 빈 문서 생성, 확인 없음), 삭제 UI 없음(파일 전체), `firestore.rules:167-170` (쓰기 권한이면 삭제 가능)
- 고칠 방향: 목록 항목에 삭제(확인 창 포함)를 두고, 내용이 비어 있는 문서는 자동으로 정리한다.

### 16. AI 번역이 "동의 증빙을 먼저 등록하라"며 막히는데, 어디서 하는지 링크가 없다
- 심각도: 답답
- 어디서: 나란히 보기 탭 → "AI 번역 생성" → 빨간 글씨
- 무슨 일이: "AI 개인정보 처리 동의 증빙을 먼저 등록해 주세요."만 뜬다. 등록은 다른 메뉴 "AI 문서 자동화"의 "개인정보·법률검토 동의" 칸에서 문서번호를 적어야 한다. 사장은 그 메뉴를 찾아 헤맨다. 이미 보고된 "동의서 문서번호 요구하나 양식 없음"과 같은 계열이지만, 여기서는 안내 자체가 막다른 길이다.
- 근거: `functions/src/translation/index.ts:77-80` (오류 문구), `src/features/sideBySide/ParallelView.tsx:110` (글자만 표시, 링크 없음), `src/pages/AutomationCenterPage.tsx:252-259` (실제 등록 위치, 3자 이상 문서번호)
- 고칠 방향: 오류 대신 "동의 등록하러 가기" 버튼을 같은 자리에 두고, 가능하면 이 화면에서 바로 등록하게 한다.

### 17. 번역에 캐럿(선불 포인트)이 드는지, 얼마나 걸리는지 아무 안내가 없다
- 심각도: 말
- 어디서: 나란히 보기 탭 "AI 번역 생성" 버튼
- 무슨 일이: 서버 코드에는 캐럿 차감이 없어 번역은 사실상 무료다. 그런데 화면은 아무 말이 없고, 옆 메뉴 "AI 문서 자동화"는 캐럿을 쓰므로 사장은 "이것도 돈 나가나" 하며 망설인다. 최대 2분까지 걸릴 수 있는데 버튼은 "AI 번역 중…"만 보여 준다.
- 근거: `functions/src/translation/index.ts` 전체에 캐럿 관련 코드 없음(grep `carat` 0건), `functions/src/automation/index.ts:470-473` (문서 자동화는 캐럿 팩 사용), `translation/index.ts:41` (`timeoutSeconds: 120`), `src/features/sideBySide/ParallelView.tsx:105`
- 고칠 방향: 버튼 옆에 "무료 · 보통 30초 안팎" 같은 한 줄을 붙인다.

### 18. 번역 실패 문구가 개발자 말이다
- 심각도: 말
- 어디서: 나란히 보기 탭 번역 실패 시 빨간 글씨
- 무슨 일이: "ANTHROPIC_API_KEY 미설정", "AI 응답 파싱 실패", "AI 응답에 텍스트 없음" 같은 문구가 그대로 뜬다. 다른 화면(AI 문서 자동화)은 "Firebase:" 접두어라도 지우는데 여기는 서버 메시지를 그대로 보여 준다.
- 근거: `functions/src/translation/index.ts:70,130,146`, `src/features/sideBySide/ParallelView.tsx:53-55` (`err.message` 그대로), 비교 `src/pages/AutomationCenterPage.tsx:30-33`
- 고칠 방향: "지금은 번역이 안 됩니다. 잠시 뒤 다시 눌러 주세요. 계속 안 되면 1660-4452" 한 문장으로 통일한다.

### 19. 번역을 아직 안 눌렀을 뿐인데 오른쪽 열 전체가 빨갛게 "번역 누락 (정보 비대칭)"으로 뜬다
- 심각도: 말
- 어디서: 나란히 보기 탭 첫 화면
- 무슨 일이: 번역본이 없으면 상단에 "누락 9항목", 오른쪽 아홉 칸 모두 "— 번역 누락 (정보 비대칭) —"이 빨간 배경으로 나온다. 사고가 난 것처럼 보이는데 실은 아직 시작 전이다. "정보 비대칭", "인간 검수됨", "번역이 구버전입니다", "§10의2" 같은 표현도 사장 말이 아니다.
- 근거: `src/features/sideBySide/ParallelView.tsx:62-66,181` (번역본 없으면 전부 누락으로 셈), `ParallelView.tsx:299` (문구), `ParallelView.tsx:242` ("인간 검수됨"), `ParallelView.tsx:335`, `src/pages/BackgroundInfoPage.tsx:70`, `BackgroundInfoForm.tsx:41` ("§10의2")
- 고칠 방향: 번역본이 없을 때는 "아직 번역 전입니다. 위 버튼으로 시작하세요"를 보여 주고, 누락 표시는 번역본이 있을 때만 켠다. "정보 비대칭" → "빠진 항목", "인간 검수됨" → "직원이 확인함".

### 20. 지원 언어가 6개뿐이다 — 태국·몽골·네팔·러시아어가 없다
- 심각도: 답답
- 어디서: 나란히 보기 탭 언어 선택, 제공 기록 "어떤 언어본"
- 무슨 일이: 한국어·베트남어·크메르어(캄보디아)·중국어·우즈벡어·영어만 고를 수 있다. 캄보디아·우즈벡은 되고 필리핀은 영어로 대신할 수 있지만, 태국·몽골·네팔·중앙아시아 러시아어권 손님은 방법이 없다. 서버도 같은 6개만 받는다.
- 근거: `src/features/sideBySide/fields.ts:6-15`, `functions/src/translation/index.ts:17-24,62-64`
- 고칠 방향: 태국어·몽골어·네팔어·러시아어를 추가하고, 없는 언어는 "통역자 번역본 직접 입력"으로 열어 둔다.

### 21. 휴대폰에서는 "나란히 보기"가 나란히가 아니다
- 심각도: 답답
- 어디서: 휴대폰으로 나란히 보기 탭
- 무슨 일이: 원본 열 아래에 번역 열이 붙어 세로로 길게 나온다. 한 항목을 대조하려면 위아래로 오가야 한다. 왼쪽 목록도 본문 위에 쌓여 첫 화면이 목록으로 채워진다.
- 근거: `src/features/sideBySide/ParallelView.tsx:124` (`grid-cols-1 lg:grid-cols-2`), `src/pages/BackgroundInfoPage.tsx:91` (`lg:` 이하에서는 한 줄 배치)
- 고칠 방향: 휴대폰에서는 항목 하나씩 "원본 → 번역"을 붙여 보여 주는 카드 배치로 바꾼다.

### 22. 저장해도 "저장됐습니다"가 안 뜬다
- 심각도: 답답
- 어디서: 편집 탭 "저장" 버튼, 제공 기록 "저장" 버튼
- 무슨 일이: 버튼이 "저장 중…"으로 잠깐 바뀌었다가 다시 "저장"이 된다. 됐는지 안 됐는지 알 수 없어 한 번 더 누른다.
- 근거: `src/features/sideBySide/BackgroundInfoForm.tsx:21-31` (성공 안내 없음), `DeliverySection.tsx:58-84` (창만 닫힘)
- 고칠 방향: 저장 뒤 2초간 "저장됐습니다"를 띄운다.

### 23. 연소득 칸을 비울 수 없고, 지우면 0원으로 저장된다
- 심각도: 답답
- 어디서: 편집 탭 "연소득 (원)"
- 무슨 일이: 숫자를 지우면 0이 남고, 위쪽 "필수 항목 N/9"는 0도 채운 것으로 센다. 외국인 측에도 "연소득 (원)"에 "F-6 소득요건과 연계"라는 설명이 붙어 있어, 베트남 후보의 소득을 원화로 적으라는 것처럼 읽힌다.
- 근거: `src/features/sideBySide/BackgroundInfoForm.tsx:78-79` (`Number('')` = 0, `0 ?? ''` = 0), `BackgroundInfoForm.tsx:33-35`, `src/features/sideBySide/fields.ts:134-138`
- 고칠 방향: 빈 값을 허용하고, 외국인 측에는 통화와 설명을 다르게 보여 준다.

### 24. 여기서 번역·서명·제공 기록을 다 해도 타임라인과 고객 상세의 빨간 경고는 그대로다
- 심각도: 답답
- 어디서: 고객 상세 맨 위 점검 카드, 타임라인 "신상정보 번역"·"상호 서면제공 + 수령확인 + 설명" 항목
- 무슨 일이: 타임라인은 "서류 업로드"만 자동으로 완료 처리하고, 번역 완료나 제공 기록은 보지 않는다. 고객 상세의 점검 카드도 문서함에 올린 파일만 세어서, 이 화면에서 다 끝내도 "신상정보 서류가 없습니다"가 빨갛게 남는다. 사장은 같은 일을 두 곳에서 해야 한다.
- 근거: `functions/src/timeline/index.ts:140-163` (`document_uploaded`만 자동 완료), `functions/src/admin/obligationTemplates.ts:413-419` (`translation_completed` 규칙은 정의만 있음), `src/features/documents/consistency.ts:59-88` (업로드 서류 기준), `src/pages/ClientDetailPage.tsx:162` (점검 카드에 `documents`만 전달)
- 고칠 방향: 번역 서명·제공 기록이 생기면 해당 타임라인 항목을 완료로 바꾸고, 점검 카드가 이 화면의 기록도 함께 본다.

### 25. 제공 기록에 수령확인서 사진·서명본을 붙일 수 없다
- 심각도: 답답
- 어디서: 제공 기록 탭 "기록 추가"
- 무슨 일이: 현장에서는 손님이 서명한 종이를 휴대폰으로 찍어 두는 게 가장 쉬운데, 첨부 칸이 없다. 저장 구조에는 "증빙 파일" 자리가 있지만 항상 비어 있다. 안내문은 "수령확인서 원본은 3년간 보관"이라고만 한다.
- 근거: `src/features/sideBySide/useDelivery.ts:52-53,110` (`receiptEvidenceUrl` 항상 `null`), `DeliverySection.tsx:129-240` (파일 입력 없음), `DeliverySection.tsx:310-314`
- 고칠 방향: "사진 찍어 붙이기" 버튼을 두고 문서함에 같이 저장한다.

### 26. 맞선일보다 늦게 준 경고는 있으나 판례 번호만 있고 "그래서 뭘 하라"가 없다
- 심각도: 말
- 어디서: 제공 기록 탭 맨 위 상태 상자, 각 기록의 "맞선일 이후" 배지
- 무슨 일이: 늦게 주면 "모든 제공이 맞선일 이후입니다. 대법원은 만남 이전에 이행할 의무로 보았습니다(2018도7989)."가 뜬다. 사장에게 판례 번호는 의미가 없고, 다음에 무엇을 해야 하는지(맞선 전 제공 증빙을 찾아 기록·법률 상담)가 없다. 맞선일이 없으면 "맞선 예정일이 기록되지 않아…"라고 하는데, 기록하는 곳(타임라인 항목 안 "이 단계 기준일 기록")으로 가는 링크가 없다.
- 근거: `src/features/sideBySide/useDelivery.ts:150-164`, `DeliverySection.tsx:259-263`, 맞선일 입력 위치 `src/features/timeline/TimelineView.tsx:278-300`, 링크 없음(`DeliverySection.tsx:106-113`)
- 고칠 방향: "맞선 예정일 기록하러 가기" 링크를 상자 안에 두고, 늦은 경우에는 "맞선 전에 건넨 증빙이 있으면 지금 기록하세요 / 없으면 상담" 버튼을 붙인다.

## 확신이 낮은 항목

- **맞선 당일 제공은 항상 "맞선 전"으로 판정된다.** 맞선일과 건넨 날짜 모두 날짜만 저장되고(둘 다 `new Date('YYYY-MM-DD')` → 한국 시간 오전 9시), 비교는 `<=`라 같은 날은 통과한다. 맞선 오후에 만나고 저녁에 준 기록도 "맞선 전"이 된다. 근거 `src/features/sideBySide/DeliverySection.tsx:69`, `useDelivery.ts:157`, `src/features/timeline/TimelineView.tsx:222`, `functions/src/timeline/index.ts:235-243`. 실제 운영에서 문제가 될지는 상황에 따라 다르다.
- **한국어 원본 서명 뒤 원본을 고쳐도 원본 쪽은 "구버전" 검사를 건너뛴다.** 서명 시 서버가 `translations/ko`에 원본 사본을 만들고(`functions/src/translation/sign.ts:82-96`), 이후 원본 쪽 재서명은 최신 여부를 검사하지 않는다(`sign.ts:119`). 서명본과 화면 내용이 달라질 수 있으나, 6번 항목을 고치면 함께 정리될 가능성이 크다.
- **직원(staff) 계정이 번역·서명 함수를 쓸 수 있는지 확인 못 했다.** 서버는 `owner·manager·staff·admin` 역할만 허용하는데(`functions/src/translation/index.ts:47-50`), 코드에서 확인된 역할 부여는 대표 계정 `owner`뿐이다(`functions/src/index.ts:53,80`). 직원 초대 흐름은 이 점검 범위 밖이라 추측이다.
- **크메르어·우즈벡어 번역을 사무실에서 누가 검수하나.** 화면은 "법률 용어 정확도를 반드시 검수 후 서명"을 요구하지만(`ParallelView.tsx:113`), 사무소 통역자 명부(`src/pages/OfficePage.tsx`)와 연결이 없다. 운영 방식의 문제라 코드만으로는 단정할 수 없다.
- **읽기 전용(readonly) 직원이 저장을 누르면 영어 오류가 뜰 것으로 보인다.** 폼은 역할을 보지 않고(`BackgroundInfoForm.tsx` 전체), 저장 규칙은 readonly 쓰기를 막는다(`firestore.rules:10-16,167-170`). 오류는 `err.message` 그대로 표시된다(`BackgroundInfoForm.tsx:27`). 실제 문구는 실행해 봐야 안다.
