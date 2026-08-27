import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const sources = {
  rules: read('firestore.rules'),
  automation: read('functions/src/automation/index.ts'),
  translation: read('functions/src/translation/index.ts'),
  routes: read('src/routes.tsx'),
  sidebar: read('src/components/layout/Sidebar.tsx'),
  center: read('src/pages/AutomationCenterPage.tsx'),
  lawyer: read('src/pages/LawyerWorkbenchPage.tsx'),
  client: read('src/pages/ClientDetailPage.tsx'),
  visaRules: read('src/features/visaSimulator/rules.ts'),
  visaI18n: read('src/features/visaSimulator/i18n.ts'),
  obligations: read('functions/src/admin/obligationTemplates.ts'),
  readme: read('README.md'),
};

const checks = [];
function check(area, name, points, pass, critical = false) {
  checks.push({ area, name, points, pass: Boolean(pass), critical });
}

check('업체 자동화', '자동화 센터 화면', 5, sources.center.includes('업무 자동화') && sources.routes.includes('/agency/automation'));
check('업체 자동화', '고객·문서 유형 선택', 5, sources.center.includes('documentType') && sources.center.includes('clientId'));
check('업체 자동화', '크레딧 표시·차감', 5, sources.center.includes('remaining') && sources.automation.includes('consumeCredits'));
check('업체 자동화', '동의 증빙 기록', 5, sources.center.includes('recordAutomationConsent') && sources.automation.includes('automation.consent_recorded'));
check('업체 자동화', '작업 이력·상태 표시', 5, sources.center.includes('최근 자동화 작업') && sources.center.includes('awaiting_review'));

check('변호사 검토', '분리된 검토 워크벤치', 5, sources.lawyer.includes('변호사 검토실') && sources.routes.includes('/lawyer/reviews'));
check('변호사 검토', '승인·수정 요청', 5, sources.lawyer.includes('request_changes') && sources.lawyer.includes('approve'));
check('변호사 검토', '상태 전이·감사 기록', 5, sources.automation.includes("review.status !== 'awaiting_review'") && sources.automation.includes('automation.document_approved'));

check('보안·개인정보', '사용자 역할·소속 변경 차단', 4, sources.rules.includes("hasOnly(['displayName', 'lastLoginAt'])"), true);
check('보안·개인정보', '광범위 하위경로 허용 제거', 4, !sources.rules.includes('/agencies/{aid}/{document=**}'), true);
check('보안·개인정보', '익명 시뮬레이션 저장 금지', 3, /match \/visaSimulations[\s\S]*?allow read, write: if false/.test(sources.rules), true);
check('보안·개인정보', 'AI·법률검토 동의 게이트', 5, sources.automation.includes('requireAutomationConsent') && sources.rules.includes("hasAny(['agencyId', 'automationConsents'])"), true);
check('보안·개인정보', 'App Check 강제', 4, (sources.automation.match(/enforceAppCheck: ENFORCE_APP_CHECK/g) ?? []).length >= 3 && sources.translation.includes('enforceAppCheck: ENFORCE_APP_CHECK'), true);
check('보안·개인정보', '문서 식별자 검증', 3, sources.automation.includes('requireSafeId'), true);
check('보안·개인정보', '법률검토 직접 쓰기 금지', 4, /match \/legalReviews[\s\S]*?allow write: if false/.test(sources.rules), true);
check('보안·개인정보', 'AI 실패 크레딧 복구', 3, sources.automation.includes('restoreCredits'));

check('법률정보', '2026 공식 소득기준·출처', 5, sources.visaRules.includes('25_195_752') && sources.visaRules.includes('RULE_SOURCE_URL'));
check('법률정보', '가짜 고시·승인확률 표현 제거', 5, !sources.obligations.includes('2024-X') && sources.visaI18n.includes('승인 확률이 아닙니다'));

check('현장 사용성', '업체 사이드바 진입', 3, sources.sidebar.includes('/agency/automation'));
check('현장 사용성', '고객 상세 바로가기', 2, sources.client.includes('AI 문서 자동화'));
check('현장 사용성', '업무 상태 안내', 3, sources.center.includes('변호사 승인') && sources.center.includes('수정 요청'));
check('현장 사용성', 'AI 초안 면책', 2, sources.center.includes('법률의견이 아니며'));

let typecheckPass = false;
let functionsBuildPass = false;
try {
  execSync('npm.cmd run typecheck', { cwd: root, stdio: 'pipe' });
  typecheckPass = true;
} catch {}
try {
  execSync('npm.cmd run build', { cwd: resolve(root, 'functions'), stdio: 'pipe' });
  functionsBuildPass = true;
} catch {}
check('검증·문서화', '웹 타입검사', 4, typecheckPass);
check('검증·문서화', 'Cloud Functions 빌드', 4, functionsBuildPass);
check('검증·문서화', '운영 보안 설정 문서', 2, sources.readme.includes('VITE_FIREBASE_APP_CHECK_SITE_KEY'));

const rawScore = checks.reduce((sum, item) => sum + (item.pass ? item.points : 0), 0);
const criticalFailures = checks.filter((item) => item.critical && !item.pass);
const score = criticalFailures.length > 0 ? Math.min(rawScore, 94) : rawScore;

for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${String(item.points).padStart(2)}점  [${item.area}] ${item.name}${item.critical ? ' (필수)' : ''}`);
}
console.log(`\nWeddingCORE SaaS 점수: ${score}/100`);
if (criticalFailures.length > 0) console.log(`보안 필수 실패: ${criticalFailures.length}건 — 점수 상한 94점`);
if (score < 95) process.exitCode = 1;
