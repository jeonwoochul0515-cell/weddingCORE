// 서버와 화면의 비자 트랙 정의가 어긋나지 않았는지 검사하는 스크립트
//
// 트랙 정의는 서버(functions/src/domain/visaTracks.ts)와 화면(src/domain/visaTracks.ts)에
// 각각 있다. 두 빌드가 분리되어 있어 한 파일을 공유하기 어렵기 때문이다.
// 문서 키와 캐럿 비용이 어긋나면 화면에 표시한 가격과 실제 차감액이 달라지므로
// 배포 전에 여기서 잡는다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.join(ROOT, 'functions/src/domain/visaTracks.ts');
const CLIENT = path.join(ROOT, 'src/domain/visaTracks.ts');

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

console.log(`트랙 정의 대조 — 서버 ${serverTracks.size}트랙/${server.size}문서 · 화면 ${clientTracks.size}트랙/${client.size}문서`);

if (problems.length === 0) {
  console.log('서버와 화면 정의가 일치합니다.');
  process.exit(0);
}

console.error('\n불일치 발견:');
for (const p of problems) console.error(`  - ${p}`);
process.exit(1);
