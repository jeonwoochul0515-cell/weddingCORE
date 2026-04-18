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

## Phase 1 로드맵 (12주)

- W1-3: 인프라 + 인증 + 멀티테넌트 + 배포
- W4: D. 규제 변동 레이더
- W5-7: A. 컴플라이언스 체크리스트 타임라인
- W8: E. 서류 유효기간 관리
- W9-10: B. 나란히 보기 (이중언어 병렬 UI)
- W11-12: C. F-6 비자 시뮬레이터 + 통합 QA + 베타 배포
