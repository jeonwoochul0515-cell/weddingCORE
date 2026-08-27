// 배포한 페이지 주소를 IndexNow로 검색엔진에 즉시 통지하는 스크립트
//
// sitemap.xml에 적힌 URL을 그대로 읽어 보내므로 사이트맵만 관리하면 된다.
// 통지는 "새 내용이 있으니 와서 보라"는 알림이고 색인을 보장하지는 않는다.
// 키 파일(public/<key>.txt)이 사이트에 배포된 뒤에 실행해야 검증을 통과한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const HOST = 'weddingcore.net';

/** 네이버는 자체 엔드포인트를 운영하고, api.indexnow.org는 참여 검색엔진에 공유한다. */
const ENDPOINTS = [
  { name: '네이버', url: 'https://searchadvisor.naver.com/indexnow' },
  { name: 'IndexNow 공용', url: 'https://api.indexnow.org/indexnow' },
];

function findKey() {
  const file = fs
    .readdirSync(PUBLIC_DIR)
    .find((name) => /^[a-f0-9-]{8,128}\.txt$/i.test(name));
  if (!file) throw new Error('public/에서 IndexNow 키 파일을 찾지 못했습니다.');
  const key = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf-8').trim();
  if (path.basename(file, '.txt') !== key) {
    throw new Error(`키 파일 이름과 내용이 다릅니다: ${file}`);
  }
  return key;
}

function readSitemapUrls() {
  const xml = fs.readFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), 'utf-8');
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error('sitemap.xml에서 URL을 찾지 못했습니다.');
  return urls;
}

async function notify(endpoint, payload) {
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    // 200/202는 접수됨. 422는 키 검증 실패 등 내용 문제.
    const mark = response.ok ? '+' : '!';
    console.log(`  ${mark} ${endpoint.name}: HTTP ${response.status} ${body.slice(0, 120).trim()}`);
    return response.ok;
  } catch (error) {
    console.log(`  ! ${endpoint.name}: 요청 실패 — ${error.message}`);
    return false;
  }
}

async function main() {
  const key = findKey();
  const urlList = readSitemapUrls();
  const payload = {
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList,
  };

  console.log(`IndexNow 통지 — ${urlList.length}개 URL`);
  for (const url of urlList) console.log(`  · ${url}`);

  const results = await Promise.all(ENDPOINTS.map((e) => notify(e, payload)));
  if (!results.some(Boolean)) {
    console.error('모든 엔드포인트에서 실패했습니다. 키 파일이 배포되었는지 확인하세요.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('IndexNow 실패:', error.message);
  process.exit(1);
});
