#!/usr/bin/env node
// 통화 녹화 저장소(R2) 연결 — 키를 꽂으면 여기서 끝난다.
//
// 하는 일은 넷이다. 순서에 뜻이 있다.
//   1) 키가 진짜 되는지 파일 하나를 올렸다 지워 본다. 이게 먼저다 —
//      틀린 키를 .env에 적어 두면 통화 날에 조용히 녹화만 안 된다.
//   2) 버킷이 없으면 만든다.
//   3) 1년 수명주기 규칙을 건다. 이게 빠지면 처방침에 적은 「1년 뒤 삭제」가 거짓말이 된다.
//   4) functions/.env에 적는다.
//
// 쓰는 법:
//   node scripts/setupR2Recording.mjs --bucket weddingcore-calls \
//     --access-key <R2 Access Key ID> --secret <R2 Secret Access Key> \
//     [--cf-token <R2 편집 권한 API 토큰>]
//
// --cf-token은 2)3)에만 쓴다. 버킷과 수명주기를 대시보드에서 이미 해 뒀으면 빼도 된다.

import { createHash, createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ACCOUNT_ID = 'da5ae1edf94b850d8ab9e6042d7236b3';
// ★ `.env`가 아니라 `.secret.local` 이다. Firebase는 `.env`를 일반 환경변수로 같이 실어
// 보내서, 같은 이름의 Secret Manager 값과 부딪혀 배포가 통째로 죽는다.
const ENV_PATH = 'functions/.secret.local';
/** 영상 보관 1년. functions/src/video/index.ts의 VIDEO_RETENTION_YEARS와 같이 움직인다 */
const RETENTION_DAYS = 365;

const args = parseArgs(process.argv.slice(2));
const bucket = args.bucket;
const accessKey = args['access-key'];
const secret = args.secret;
const cfToken = args['cf-token'];

if (!bucket || !accessKey || !secret) {
  console.error('필요한 값이 빠졌습니다. --bucket, --access-key, --secret은 반드시 줘야 합니다.');
  console.error('예) node scripts/setupR2Recording.mjs --bucket weddingcore-calls --access-key … --secret …');
  process.exit(1);
}

const endpoint = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── 1. 키가 되는지부터 확인한다 ──────────────────────────
//
// R2는 S3 호환이라 AWS SigV4로 서명한다. SDK를 안 쓰는 이유는 이 스크립트가
// 배포에 안 들어가는 일회성 도구이기 때문이다. 의존성을 더할 값이 없다.

function sign(key, msg) {
  return createHmac('sha256', key).update(msg, 'utf8').digest();
}

function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

async function s3(method, key, body = '') {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${key}`;
  const payloadHash = sha256hex(body);

  const canonical = [
    method,
    path,
    '',
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
    'host;x-amz-content-sha256;x-amz-date',
    payloadHash,
  ].join('\n');

  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonical)].join('\n');

  let k = sign(`AWS4${secret}`, date);
  k = sign(k, 'auto');
  k = sign(k, 's3');
  k = sign(k, 'aws4_request');
  const signature = createHmac('sha256', k).update(toSign, 'utf8').digest('hex');

  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers: {
      Host: host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
    },
    body: method === 'PUT' ? body : undefined,
  });
  return res;
}

async function cf(method, path, body) {
  if (!cfToken) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return json;
}

async function main() {
  // 버킷부터. 없는 버킷에 올리면 1단계가 의미 없이 실패한다.
  if (cfToken) {
    const made = await cf('POST', '/r2/buckets', { name: bucket, locationHint: 'apac' });
    if (made?.success) {
      console.log(`버킷 ${bucket} 를 만들었습니다.`);
    } else {
      const already = JSON.stringify(made?.errors ?? '').includes('already exists');
      if (already) console.log(`버킷 ${bucket} 는 이미 있습니다.`);
      else console.log(`버킷 생성 건너뜀: ${JSON.stringify(made?.errors ?? made)}`);
    }
  } else {
    console.log('--cf-token 이 없어 버킷 생성과 수명주기 설정은 건너뜁니다.');
  }

  // 1) 키 확인 — 올렸다 읽고 지운다.
  const probeKey = `.probe-${Date.now()}`;
  const put = await s3('PUT', probeKey, 'weddingCORE r2 probe');
  if (!put.ok) {
    console.error(`\n키가 동작하지 않습니다 (PUT HTTP ${put.status}).`);
    console.error((await put.text()).slice(0, 400));
    console.error('\nAccess Key ID / Secret Access Key 와 버킷 이름을 다시 확인해 주세요.');
    process.exit(1);
  }
  const got = await s3('GET', probeKey);
  await s3('DELETE', probeKey);
  if (!got.ok) {
    console.error(`올리기는 됐는데 읽기가 안 됩니다 (GET HTTP ${got.status}). 토큰 권한이 쓰기 전용인지 보세요.`);
    process.exit(1);
  }
  console.log('키 확인 완료 — 올리기·읽기·지우기가 모두 됩니다.');

  // 3) 수명주기 1년.
  if (cfToken) {
    const life = await cf('PUT', `/r2/buckets/${bucket}/lifecycle`, {
      rules: [
        {
          id: 'delete-call-recordings-after-1y',
          enabled: true,
          conditions: { prefix: 'calls/' },
          deleteObjectsTransition: {
            condition: { type: 'Age', maxAge: RETENTION_DAYS * 24 * 60 * 60 },
          },
        },
      ],
    });
    if (life?.success) console.log(`수명주기 규칙 설정 완료 — calls/ 아래 영상은 ${RETENTION_DAYS}일 뒤 지워집니다.`);
    else console.error(`수명주기 설정 실패: ${JSON.stringify(life?.errors ?? life)}\n★ 대시보드에서 직접 걸어 주세요. 안 걸면 처리방침이 거짓 고지가 됩니다.`);
  }

  // 4) .env 기록.
  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8').split(/\r?\n/) : [];
  const set = {
    R2_ACCOUNT_ID: ACCOUNT_ID,
    R2_BUCKET: bucket,
    R2_ACCESS_KEY_ID: accessKey,
    R2_SECRET_ACCESS_KEY: secret,
  };
  const kept = lines.filter((l) => !Object.keys(set).some((k) => l.startsWith(`${k}=`)));
  while (kept.length && kept[kept.length - 1].trim() === '') kept.pop();
  kept.push('', '# 통화 녹화 저장소 (scripts/setupR2Recording.mjs 가 적었다)');
  for (const [k, v] of Object.entries(set)) kept.push(`${k}=${v}`);
  writeFileSync(ENV_PATH, `${kept.join('\n')}\n`);
  console.log(`${ENV_PATH} 에 적었습니다.`);

  console.log('\n배포 전에 한 줄 더 — 함수 시크릿에 같은 값을 넣어야 운영에서 돕니다:');
  for (const k of Object.keys(set)) {
    console.log(`  firebase functions:secrets:set ${k} --data-file <값이 담긴 파일>`);
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
