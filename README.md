# weddingCORE

국제결혼중개업 법률 컴플라이언스 플랫폼. React + Vite + TypeScript + Firebase.

## 사전 준비

1. Node.js 20+ 설치
2. Firebase CLI 설치 및 로그인
   ```
   npm i -g firebase-tools
   firebase login
   ```
3. Firebase Console에서 프로젝트 생성 (`wedding-core-prod` 권장)
   - Authentication 활성화 (이메일/비밀번호 + Google)
   - Firestore 활성화 (서울 리전 `asia-northeast3`, 프로덕션 모드)
   - Storage 활성화
   - Blaze 플랜 업그레이드 (Cloud Functions·Scheduler 필수)
4. `.firebaserc` 의 `projects.default` 를 생성한 프로젝트 ID로 교체
5. Firebase Console → 프로젝트 설정 → 웹앱 추가 → 구성 정보 복사
6. `.env.example` 을 `.env.local` 로 복사 후 값 채우기
7. Firebase App Check에서 웹 앱용 reCAPTCHA Enterprise 공급자를 등록하고
   `VITE_FIREBASE_APP_CHECK_SITE_KEY`를 설정합니다. AI 문서·동의·변호사 검토 함수는
   유효한 App Check 토큰이 없으면 요청을 거부합니다.

## 로컬 개발

```
npm install
npm run dev
```

## 에뮬레이터 사용

`.env.local` 에서 `VITE_USE_EMULATOR=true` 로 설정 후:

```
firebase emulators:start
npm run dev
```

## 배포

```
npm run deploy:rules    # Firestore 보안규칙/인덱스/Storage 규칙
npm run deploy:hosting  # 웹 빌드 + Firebase Hosting
npm run deploy:all      # 전체
```

Cloudflare Workers 정적 자산 배포:

```
npm run deploy:cloudflare
```

`wrangler.jsonc`의 Workers Assets SPA 설정이 `dist`를 배포하며, `public/_headers`의
보안 헤더와 해시 자산 장기 캐시 정책이 함께 적용됩니다.

## AI 캐럿 제공량 조정

AI 문서 초안의 사용 단위는 **캐럿**입니다(내부 필드명은 credit 계열 유지).
월간 기본 제공량은 `functions` 환경변수 `AI_MONTHLY_ALLOWANCE`로 정하며 미설정 시 100캐럿입니다.
업체 문서의 `aiCredits.monthlyAllowance`가 있으면 그 값이 항상 우선하므로 업체별 차등도 가능합니다.
무상 제공량은 보장 사항이 아니며, 변경 시 사전 고지 후 값만 조정하면 됩니다.

## 출시 품질 점검

```
npm run score:saas
```

자동화·변호사 워크플로·보안·최신 규칙·빌드 항목을 100점으로 평가합니다.
보안 필수항목이 하나라도 실패하면 총점은 94점 이하로 제한됩니다.

## Phase 1 로드맵 (12주)

- W1-3: 인프라 + 인증 + 멀티테넌트 + 배포
- W4: D. 규제 변동 레이더
- W5-7: A. 컴플라이언스 체크리스트 타임라인
- W8: E. 서류 유효기간 관리
- W9-10: B. 나란히 보기 (이중언어 병렬 UI)
- W11-12: C. F-6 비자 시뮬레이터 + 통합 QA + 베타 배포
