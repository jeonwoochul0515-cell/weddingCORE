// 서버와 화면의 정의가 어긋나지 않았는지 검사하는 스크립트
//
// 두 가지를 대조한다.
//   1) 비자 트랙 — 문서 키와 캐럿 비용
//   2) 상품 금액 — 캐럿 팩과 마케팅 서비스
//   3) 영상통화 게이트가 요구하는 의무 코드가 실제 의무 템플릿에 있는지
//
// 정의는 서버(functions/src/domain/)와 화면(src/domain/)에 각각 있다. 두 빌드가
// 분리되어 있어 한 파일을 공유하기 어렵기 때문이다.
// 어긋나면 화면에 표시한 가격과 실제 결제·차감액이 달라지므로 배포 전에 잡는다.
//
// firestore.rules의 packId 목록도 함께 본다. 규칙 파일은 import가 안 돼
// 어긋나도 타입 검사에 안 걸리고, 그러면 「계좌이체로 신청」이 통째로 거부된다
// (2026-09-05 점검에서 실제로 발생한 형태다).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.join(ROOT, 'functions/src/domain/visaTracks.ts');
const CLIENT = path.join(ROOT, 'src/domain/visaTracks.ts');
const SERVER_PRICING = path.join(ROOT, 'functions/src/domain/pricing.ts');
const CLIENT_PRICING = path.join(ROOT, 'src/domain/pricing.ts');
const RULES = path.join(ROOT, 'firestore.rules');
const CALL_GATE = path.join(ROOT, 'functions/src/domain/videoCallGate.ts');
const OBLIGATIONS = path.join(ROOT, 'functions/src/admin/obligationTemplates.ts');

/** 정의 파일에서 문서 키와 캐럿 비용만 뽑는다. 타입 없이 정규식으로 읽어 빌드에 의존하지 않는다. */
function extractDocuments(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const docs = new Map();
  for (const m of text.matchAll(/key:\s*'([a-z0-9_]+)'[\s\S]{0,200}?creditCost:\s*(\d+)/g)) {
    docs.set(m[1], Number(m[2]));
  }
  return docs;
}

/** 트랙 id 목록을 뽑는다. 양쪽이 같은 사업을 다루는지 확인용. */
function extractTrackIds(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const block = text.match(/TRACKS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  return new Set([...block.matchAll(/^\s{2}([a-z]+):\s*\{/gm)].map((m) => m[1]));
}

/**
 * 상품 정의에서 id→금액을 뽑는다.
 * `pack_110: { label: '110캐럿', carats: 110, amount: 110_000, ... }` 꼴과
 * `'naver-seo': { label: '...', amount: 500_000, ... }` 꼴을 모두 받는다.
 */
function extractAmounts(file, constName) {
  const text = fs.readFileSync(file, 'utf-8');
  const block = text.match(new RegExp(`${constName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\} as const;`))?.[1] ?? '';
  const found = new Map();
  for (const m of block.matchAll(/^\s*'?([a-z0-9_-]+)'?:\s*\{[\s\S]*?amount:\s*([\d_]+)/gm)) {
    found.set(m[1], Number(m[2].replace(/_/g, '')));
  }
  return found;
}

/** firestore.rules의 caratOrders packId 허용 목록을 뽑는다. */
function extractRulesPackIds(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const line = text.match(/packId in \[([^\]]+)\]/)?.[1] ?? '';
  return new Set([...line.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]));
}

const server = extractDocuments(SERVER);
const client = extractDocuments(CLIENT);
const serverTracks = extractTrackIds(SERVER);
const clientTracks = extractTrackIds(CLIENT);

const problems = [];

for (const id of serverTracks) if (!clientTracks.has(id)) problems.push(`트랙 '${id}'가 화면 정의에 없음`);
for (const id of clientTracks) if (!serverTracks.has(id)) problems.push(`트랙 '${id}'가 서버 정의에 없음`);

for (const [key, cost] of server) {
  if (!client.has(key)) { problems.push(`문서 '${key}'가 화면 정의에 없음`); continue; }
  if (client.get(key) !== cost) {
    problems.push(`문서 '${key}' 캐럿 불일치 — 서버 ${cost} / 화면 ${client.get(key)}`);
  }
}
for (const key of client.keys()) {
  if (!server.has(key)) problems.push(`문서 '${key}'가 서버 정의에 없음 (생성 요청 시 거부됨)`);
}

// ── 상품 금액 대조 ──
const priceGroups = [
  { name: '캐럿 팩', constName: 'CARAT_PACKS' },
  { name: '마케팅 서비스', constName: 'MARKETING_SERVICES' },
];

let priceCount = 0;
for (const { name, constName } of priceGroups) {
  const serverPrices = extractAmounts(SERVER_PRICING, constName);
  const clientPrices = extractAmounts(CLIENT_PRICING, constName);
  priceCount += serverPrices.size;

  if (serverPrices.size === 0) problems.push(`${name}: 서버 정의를 읽지 못했다`);

  for (const [id, amount] of serverPrices) {
    if (!clientPrices.has(id)) { problems.push(`${name} '${id}'가 화면 정의에 없음`); continue; }
    if (clientPrices.get(id) !== amount) {
      problems.push(`${name} '${id}' 금액 불일치 — 서버 ${amount} / 화면 ${clientPrices.get(id)}`);
    }
  }
  for (const id of clientPrices.keys()) {
    if (!serverPrices.has(id)) problems.push(`${name} '${id}'가 서버 정의에 없음 (결제 시 거부됨)`);
  }
}

// ── firestore.rules의 packId 목록 대조 ──
const serverPacks = extractAmounts(SERVER_PRICING, 'CARAT_PACKS');
const rulesPacks = extractRulesPackIds(RULES);
for (const id of serverPacks.keys()) {
  if (!rulesPacks.has(id)) problems.push(`캐럿 팩 '${id}'가 firestore.rules 목록에 없음 (계좌이체 신청이 거부된다)`);
}
for (const id of rulesPacks) {
  if (!serverPacks.has(id)) problems.push(`firestore.rules의 '${id}'가 상품 정의에 없음`);
}

// ── 영상통화 게이트 의무 코드 대조 ──
//
// 게이트가 오타난 코드를 요구하면 그 항목은 영영 'done'이 되지 않아
// 통화가 원인 없이 반영구적으로 막힌다. 반대로 의무 코드가 이름이 바뀌면
// 게이트가 조용히 느슬해져 의무를 안 끝낸 채 만남이 열린다 — 이쪽이 더 위험하다.
// 타입으로는 문자열이라 안 잡힌다.
const gateText = fs.readFileSync(CALL_GATE, 'utf-8');
const gateBlock = gateText.match(/PRE_MEETING_CODES\s*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? '';
const gateCodes = new Set([...gateBlock.matchAll(/'([A-Z_0-9]+)'/g)].map((m) => m[1]));

const obligationText = fs.readFileSync(OBLIGATIONS, 'utf-8');
const obligationCodes = new Set(
  [...obligationText.matchAll(/code:\s*'([A-Z_0-9]+)'/g)].map((m) => m[1]),
);

if (gateCodes.size === 0) problems.push('영상통화 게이트에서 PRE_MEETING_CODES를 읽지 못함');
for (const code of gateCodes) {
  if (!obligationCodes.has(code)) {
    problems.push(`영상통화 게이트가 요구하는 '${code}'가 의무 템플릿에 없음 (통화가 영영 안 열린다)`);
  }
}

console.log(`트랙 정의 대조 — 서버 ${serverTracks.size}트랙/${server.size}문서 · 화면 ${clientTracks.size}트랙/${client.size}문서`);
console.log(`상품 금액 대조 — ${priceCount}개 · firestore.rules packId ${rulesPacks.size}개`);
console.log(`영상통화 게이트 대조 — 선행 의무 ${gateCodes.size}건 / 전체 의무 ${obligationCodes.size}건`);

if (problems.length === 0) {
  console.log('서버·화면·보안규칙 정의가 모두 일치합니다.');
  process.exit(0);
}

console.error('\n불일치 발견:');
for (const p of problems) console.error(`  - ${p}`);
process.exit(1);
