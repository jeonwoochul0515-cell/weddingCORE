// 모아둔 판례·재결례를 요건에 연결한다 — "이 사건은 무엇 때문에 걸린 사건인가"
//
// 사건을 쌓아만 두면 쓸 수 없다. 실무에서 필요한 것은 "소득요건이 문제될 때 참고할
// 사건"이므로, 요건 쪽에서 사건을 찾아갈 수 있어야 한다.
//
// 자동 분류는 후보를 좁히는 데까지다. 본문에 낱말이 나왔다고 그 요건이 쟁점이었다는
// 보장은 없으므로, 근거로 인용하기 전에는 사람이 확인해야 한다(confidence 필드).

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { REQUIREMENT_HINTS } from '../domain/visaRequirements.js';

const REGION = 'asia-northeast3';
const TZ = 'Asia/Seoul';
const MAX_BATCH_OPS = 400;

/**
 * 어느 자리에서 낱말이 나왔는지에 따라 무게를 달리 본다.
 * 요지(holding)에 나오면 그게 쟁점이었을 가능성이 높고, 본문에만 나오면
 * 사실관계를 나열하다 스친 것일 수 있다.
 */
const WEIGHT = { holding: 3, summary: 2, caseName: 2, body: 1 } as const;

type Scored = { key: string; score: number };

function scoreRequirements(doc: {
  caseName?: string;
  summary?: string;
  holding?: string;
  body?: string;
}): Scored[] {
  const fields: Array<[keyof typeof WEIGHT, string]> = [
    ['caseName', doc.caseName ?? ''],
    ['summary', doc.summary ?? ''],
    ['holding', doc.holding ?? ''],
    // 본문은 앞부분만 본다. 뒤로 갈수록 인용된 다른 법령 이야기가 섞인다.
    ['body', (doc.body ?? '').slice(0, 8000)],
  ];

  const out: Scored[] = [];
  for (const [key, hints] of Object.entries(REQUIREMENT_HINTS)) {
    let score = 0;
    for (const [field, text] of fields) {
      if (!text) continue;
      for (const hint of hints) {
        if (text.includes(hint)) score += WEIGHT[field];
      }
    }
    if (score > 0) out.push({ key, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * 결혼중개 업체에게 쓸모가 있는 사건인지 가른다.
 *
 * 574건 중 난민 30건, 형사(출입국관리법 위반) 18건, 외국인근로자 13건이 섞여 있다.
 * 수집 질의가 '체류자격'·'강제퇴거'처럼 넓어서 함께 들어온 것들이다. 유학 사건도
 * KoAdmit으로 이관한 뒤로는 이 화면에서 쓰지 않는다.
 *
 * 지우지 않고 표시만 한다. 나중에 다른 트랙에서 쓸 수 있고, 판단이 틀렸을 때
 * 되돌릴 수 있어야 한다.
 */
function isOffTopicForMarriage(text: string): boolean {
  // 결혼·혼인은 물론 귀화·영주도 관련 있다. F-6 고객이 졸업하는 두 갈래이고
  // 우리가 요건(naturalization, permanent_residency)까지 두고 분류하는 영역이다.
  const relevant = [
    '결혼중개',
    '국제결혼',
    '결혼이민',
    '국민의 배우자',
    'F-6',
    '혼인',
    '귀화',
    '국적취득',
    '국적법',
    '영주',
    '체류기간 연장',
    '체류자격 변경',
  ];
  if (relevant.some((t) => text.includes(t))) return false;

  // 위에 걸리지 않으면서 아래 주제가 중심이면 이 화면에서는 소음이다
  const otherDomains = ['난민', '외국인근로자', '고용허가', '재외동포', '유학', '어학연수'];
  return otherDomains.some((t) => text.includes(t));
}

export async function runTagging() {
  const db = getFirestore();
  const snap = await db.collection('precedents').get();

  let tagged = 0;
  let untagged = 0;
  let offTopic = 0;
  const perRequirement: Record<string, number> = {};

  let batch = db.batch();
  let ops = 0;

  for (const d of snap.docs) {
    const data = d.data() as Record<string, string>;
    const scored = scoreRequirements(data);

    // 요지·사건명에 걸린 것(3점 이상)은 쟁점일 가능성이 높다고 본다.
    const strong = scored.filter((s) => s.score >= 3).map((s) => s.key);
    const weak = scored.filter((s) => s.score < 3).map((s) => s.key);

    if (strong.length === 0 && weak.length === 0) untagged += 1;
    else tagged += 1;

    for (const k of strong) perRequirement[k] = (perRequirement[k] ?? 0) + 1;

    const fullText = [data.caseName, data.summary, data.holding, (data.body ?? '').slice(0, 6000)]
      .filter(Boolean)
      .join(' ');

    const off = isOffTopicForMarriage(fullText);
    if (off) offTopic += 1;

    batch.update(d.ref, {
      requirements: strong,
      requirementsWeak: weak,
      // 결혼중개 화면에서 기본으로 감출지 여부
      offTopic: off,
      // 자동 분류임을 남긴다. 검수를 거치면 사람이 'reviewed'로 바꾼다.
      requirementConfidence: strong.length > 0 ? 'auto' : 'none',
    });
    ops += 1;

    if (ops >= MAX_BATCH_OPS) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  logger.info(
    `요건 연결 — 전체 ${snap.size}건 · 연결 ${tagged}건 · 미연결 ${untagged}건 · 결혼중개 무관 ${offTopic}건`,
    perRequirement,
  );
  return { ok: true, total: snap.size, tagged, untagged, offTopic, perRequirement };
}

/** 수집(일요일 04시) 뒤에 돌도록 한 시간 늦춘다. */
export const tagPrecedentRequirements = onSchedule(
  {
    region: REGION,
    schedule: '0 5 * * 0',
    timeZone: TZ,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    await runTagging();
  },
);

export const runRequirementTaggingNow = onCall(
  { region: REGION, timeoutSeconds: 540 },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
    }
    return runTagging();
  },
);
