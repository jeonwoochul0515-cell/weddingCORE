// 비자 거부·불허 사건의 판례와 결정례를 모으는 수집기
//
// 왜 필요한가: 조문만으로는 "왜 거부되는가"를 알 수 없다. 실제 거부 사유와
// 그것이 어떤 논리로 유지되거나 뒤집혔는지는 판례·결정례에 있다.
// 이 자료가 있어야 문서 초안이 "근거 있는 문서"가 된다.
//
// 법제처는 호출 도메인을 사전 등록해야 응답하므로 law-caddy 창구를 거친다.

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { queryLawCaddyRaw } from './lawCaddyClient.js';

const REGION = 'asia-northeast3';
const TZ = 'Asia/Seoul';

type TrackId = 'marriage' | 'study' | 'extension';

/**
 * 수집 질의. 법제처는 질의를 엄격히 매칭하므로 두 단어를 붙이면 0건이 나온다.
 * 처분 이름 그대로 한 덩어리씩 던진다.
 */
const CASE_QUERIES: Array<{ q: string; tracks: TrackId[]; kind: 'prec' | 'decc' }> = [
  { q: '사증발급거부', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
  { q: '체류기간연장불허가', tracks: ['extension'], kind: 'prec' },
  { q: '체류자격변경불허가', tracks: ['extension', 'study'], kind: 'prec' },
  { q: '출국명령', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
  { q: '강제퇴거', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
  { q: '결혼이민', tracks: ['marriage'], kind: 'prec' },
  { q: '혼인무효', tracks: ['marriage'], kind: 'prec' },
  { q: '국적신청불허', tracks: ['marriage'], kind: 'prec' },
  { q: '결혼중개업', tracks: ['marriage'], kind: 'prec' },
  { q: '난민불인정', tracks: ['extension'], kind: 'prec' },
  // 행정심판 재결례(국민권익위원회). '사증' 한 단어로 던지면 "항공신체검사증명" 같은
  // 부분 문자열 오탐이 섞인다. 처분 이름으로 좁힌다.
  { q: '사증발급거부', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
  { q: '사증발급인정서', tracks: ['marriage', 'study'], kind: 'decc' },
  { q: '체류기간연장', tracks: ['extension'], kind: 'decc' },
  { q: '체류자격변경', tracks: ['extension', 'study'], kind: 'decc' },
  { q: '출국명령', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
  { q: '결혼중개업', tracks: ['marriage'], kind: 'decc' },
];

type ListItem = Record<string, string>;

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** 법제처 본문에는 <br/>와 공백이 섞여 온다. 검색·인용에 쓰려면 평문으로 만든다. */
function clean(html: unknown): string {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function searchList(kind: 'prec' | 'decc', query: string, display = 50) {
  const res = await queryLawCaddyRaw<Record<string, { totalCnt?: string } & Record<string, unknown>>>({
    target: kind,
    query,
    display: String(display),
  });
  const rootKey = kind === 'prec' ? 'PrecSearch' : 'Decc';
  const root = res[rootKey] as { prec?: unknown; decc?: unknown } | undefined;
  return toArray((root?.prec ?? root?.decc) as ListItem | ListItem[] | undefined);
}

async function fetchDetail(kind: 'prec' | 'decc', id: string) {
  const res = await queryLawCaddyRaw<Record<string, unknown>>(
    { target: kind, ID: id },
    'service',
  );
  const root = (res.PrecService ?? res.DeccService ?? res.prec ?? res.decc ?? res) as
    | Record<string, unknown>
    | undefined;
  return root ?? {};
}

async function runCollect(limitPerQuery = 30) {
  const db = getFirestore();
  let seen = 0;
  let saved = 0;
  const skipped: string[] = [];

  for (const { q, tracks, kind } of CASE_QUERIES) {
    let list: ListItem[] = [];
    try {
      list = await searchList(kind, q, limitPerQuery);
    } catch (error) {
      logger.warn(`[${q}] 목록 조회 실패`, error);
      skipped.push(q);
      continue;
    }
    seen += list.length;

    for (const item of list.slice(0, limitPerQuery)) {
      const serial = String(
        item['판례일련번호'] ?? item['행정심판재결례일련번호'] ?? item['id'] ?? '',
      ).trim();
      const caseNumber = String(item['사건번호'] ?? item['사건번호'] ?? '').trim();
      const docId = serial || caseNumber;
      if (!docId) continue;

      const ref = db.collection('precedents').doc(docId);
      const existing = await ref.get();
      if (existing.exists) {
        // 이미 있는 판례는 트랙 표시만 넓힌다. 본문을 다시 받지 않아 호출을 아낀다.
        await ref.update({
          tracks: FieldValue.arrayUnion(...tracks),
          matchedBy: FieldValue.arrayUnion(q),
        });
        continue;
      }

      let detail: Record<string, unknown> = {};
      try {
        detail = await fetchDetail(kind, serial || caseNumber);
      } catch (error) {
        logger.warn(`[${docId}] 상세 조회 실패`, error);
      }

      // 판례와 행정심판 재결례는 필드 이름이 다르다. 재결례에는 "왜 거부했고
      // 왜 유지·취소됐는지"가 이유·재결요지에 들어 있어 실무에서 가장 값지다.
      const isRuling = kind === 'decc';
      await ref.set({
        kind,
        caseNumber: caseNumber || clean(detail['사건번호']),
        caseName: clean(item['사건명'] ?? detail['사건명']),
        courtName: clean(item['법원명'] ?? item['재결청'] ?? detail['재결청']),
        // 재결례는 처분청(거부한 기관)이 누구인지가 중요하다
        agency: clean(item['처분청'] ?? detail['처분청']),
        decidedOn: clean(item['선고일자'] ?? item['의결일자'] ?? detail['의결일자']),
        disposedOn: clean(item['처분일자'] ?? detail['처분일자']),
        caseType: clean(item['사건종류명'] ?? item['재결구분명'] ?? detail['재결례유형명']),
        summary: clean(isRuling ? detail['청구취지'] : detail['판시사항']).slice(0, 4000),
        holding: clean(isRuling ? detail['재결요지'] : detail['판결요지']).slice(0, 8000),
        disposition: clean(detail['주문']).slice(0, 2000),
        references: clean(detail['참조조문']).slice(0, 2000),
        body: clean(isRuling ? detail['이유'] : detail['판례내용']).slice(0, 40000),
        tracks,
        matchedBy: [q],
        sourceUrl: 'https://www.law.go.kr',
        collectedAt: FieldValue.serverTimestamp(),
      });
      saved += 1;
    }
  }

  logger.info(`판례 수집 — 조회 ${seen}건 · 신규 ${saved}건 · 실패 질의 ${skipped.length}`);
  return { ok: true, seen, saved, skippedQueries: skipped };
}

/** 판례는 자주 늘지 않는다. 주 1회면 충분하다. */
export const collectPrecedents = onSchedule(
  {
    region: REGION,
    schedule: '0 4 * * 0',
    timeZone: TZ,
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: ['LAW_CADDY_TOKEN'],
  },
  async () => {
    await runCollect();
  },
);

export const runPrecedentCollectNow = onCall(
  { region: REGION, timeoutSeconds: 540, secrets: ['LAW_CADDY_TOKEN'] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
    }
    return runCollect();
  },
);
