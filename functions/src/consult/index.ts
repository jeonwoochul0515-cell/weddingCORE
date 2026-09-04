// 상담 접수와 중앙 접수함 연동
//
// 하람(상담 캐릭터)이 받은 연락처를 저장하고, 사무실에 문자로 알리고,
// 중앙 접수함(lead-inbox)이 읽어갈 수 있게 어드민 API를 노출한다.
//
// 지켜야 할 선
//  - 대화 전달은 별도 동의(기본 해제)를 받은 건만 저장한다. 대화에는 고객 신상이 섞일 수 있다.
//  - 저장과 문자는 서로 독립이다. "저장 성공해야 문자"로 묶으면 한쪽이 죽을 때 접수가 통째로 사라진다.
//  - 둘 다 실패했을 때만 손님에게 실패를 알린다. 가짜 성공은 연락처를 조용히 잃는 길이다.

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

const REGION = 'asia-northeast3';
const SOLAPI_BASE = 'https://api.solapi.com';

/** 이름 + 전화번호만 받는다. 그 이상은 캐릭터가 묻지도 않는다. */
type LeadInput = {
  name?: string;
  phone?: string;
  /** 대화 전달 동의. 기본 해제이며 동의한 건만 세션이 생긴다. */
  shareChat?: boolean;
  /** "손님: ... / 하람: ..." 형식의 대화 전문 */
  chat?: string;
  page?: string;
};

const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

function normalizePhone(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return value.trim();
}

/**
 * Solapi 문자 발송. 실패해도 예외를 던지지 않고 성공 여부만 돌려준다.
 * 받는 번호를 주지 않으면 우리 사무실(ADMIN_NOTIFY_PHONE)로 간다.
 */
async function sendSms(text: string, to = (process.env.ADMIN_NOTIFY_PHONE ?? '').trim()): Promise<boolean> {
  const key = (process.env.SOLAPI_API_KEY ?? '').trim();
  const secret = (process.env.SOLAPI_API_SECRET ?? '').trim();
  const from = (process.env.SOLAPI_SENDER ?? '').trim();
  if (!key || !secret || !from || !to) {
    logger.warn('문자 설정이 없어 발송을 건너뜀');
    return false;
  }

  const date = new Date().toISOString();
  const salt = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secret).update(date + salt).digest('hex');

  try {
    const res = await fetch(`${SOLAPI_BASE}/messages/v4/send`, {
      method: 'POST',
      headers: {
        Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { to: to.replace(/\D/g, ''), from: from.replace(/\D/g, ''), text },
      }),
    });
    if (!res.ok) {
      logger.error('문자 발송 실패', { status: res.status, body: (await res.text()).slice(0, 200) });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('문자 발송 예외', error);
    return false;
  }
}

/**
 * 접수 시점까지의 대화를 개별 메시지로 되살린다.
 * 뭉텅이 텍스트 하나로 넣으면 사무실이 누가 무슨 말을 했는지 읽을 수 없다.
 */
function parseTranscript(raw: string): Array<{ role: string; content: string }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(손님|방문자|하람|캐릭터)\s*:\s*(.+)$/);
      if (!m) return { role: 'visitor', content: line.slice(0, 2000) };
      const who = m[1] === '하람' || m[1] === '캐릭터' ? 'haram' : 'visitor';
      return { role: who, content: m[2].slice(0, 2000) };
    })
    .slice(-80);
}

function cors(res: { set: (k: string, v: string) => void }) {
  res.set('Access-Control-Allow-Origin', 'https://weddingcore.net');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-id, x-admin-key');
}

/** 방문자 상담 접수. 비로그인 방문자가 부르므로 App Check를 걸지 않는다. */
export const submitConsult = onRequest(
  {
    region: REGION,
    timeoutSeconds: 60,
    cors: false,
    secrets: ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_SENDER', 'ADMIN_NOTIFY_PHONE'],
  },
  async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'method' });
      return;
    }

    const body = (req.body ?? {}) as LeadInput;
    const name = String(body.name ?? '').trim().slice(0, 40);
    const phoneRaw = String(body.phone ?? '').trim();
    if (!name || !PHONE_RE.test(phoneRaw.replace(/\s/g, ''))) {
      res.status(400).json({ ok: false, error: '성함과 연락처를 확인해 주세요.' });
      return;
    }
    const phone = normalizePhone(phoneRaw);
    const shareChat = body.shareChat === true;
    const transcript = shareChat ? String(body.chat ?? '').slice(0, 20000) : '';

    const db = getFirestore();
    let sessionId: string | null = null;
    let stored = false;

    // 저장을 먼저. 연락처는 어떤 경우에도 살아남아야 한다.
    try {
      sessionId = randomUUID();
      const secret = randomBytes(24).toString('base64url');
      const now = Timestamp.now();
      const messages = transcript ? parseTranscript(transcript) : [];

      const ref = db.collection('liveSessions').doc(sessionId);
      const batch = db.batch();
      batch.set(ref, {
        secret,
        name,
        phone,
        page: String(body.page ?? '').slice(0, 120),
        shareChat,
        attorneyJoined: false,
        attorneySeenAt: null,
        notifiedAt: now,
        lastSeq: messages.length,
        lastAt: now,
        lastMsg: messages.length ? messages[messages.length - 1]!.content.slice(0, 120) : '',
        createdAt: now,
      });
      messages.forEach((m, i) => {
        batch.set(ref.collection('messages').doc(), {
          seq: i + 1,
          role: m.role,
          content: m.content,
          createdAt: now,
        });
      });
      if (messages.length) {
        batch.set(ref.collection('messages').doc(), {
          seq: messages.length + 1,
          role: 'system',
          content: '[여기까지가 접수 시점까지의 대화입니다]',
          createdAt: now,
        });
      }
      await batch.commit();
      stored = true;
    } catch (error) {
      logger.error('상담 접수 저장 실패', error);
    }

    const head = stored ? '[weddingCORE 상담]' : '[weddingCORE 상담][주의] 저장 실패 — 이 문자가 유일한 기록';
    const smsOk = await sendSms(
      `${head}\n${name} ${phone}\n대화전달 ${shareChat ? '동의' : '미동의'}\n접수함에서 확인해 주세요.`,
    );

    if (!stored && !smsOk) {
      res.status(500).json({
        ok: false,
        error: '지금 접수가 되지 않았어요. 잠시 후 다시 시도해 주세요.',
      });
      return;
    }
    res.json({ ok: true, sessionId: stored ? sessionId : null });
  },
);

/** 빠른 점검 위젯 접수 본문. 업체 ID로 어느 업체의 손님인지 정한다. */
type CheckLeadInput = {
  agencyId?: string;
  name?: string;
  phone?: string;
  level?: string;
  summary?: string;
  page?: string;
  /** 사람에게 보이지 않는 칸. 값이 있으면 봇이다. */
  company?: string;
};

const AGENCY_ID_RE = /^ag_[A-Za-z0-9_-]{6,40}$/;
const CHECK_LEVEL_LABEL: Record<string, string> = {
  ok: '걸림 없음',
  check: '확인 필요',
  stop: '진행 전 정리 필요',
};

/**
 * 회원 업체 홈페이지에 심은 빠른 점검(/embed/check)에서 들어오는 상담 접수.
 * 손님 연락처는 그 업체의 것이다. 업체 문서의 전화로 문자를 보내고 agencies/{aid}/leads에 쌓는다.
 * 우리 사무실(ADMIN_NOTIFY_PHONE)로는 보내지 않는다. 비로그인 방문자가 부르므로 App Check를 걸지 않는다.
 */
export const submitCheckLead = onRequest(
  {
    region: REGION,
    timeoutSeconds: 60,
    cors: false,
    secrets: ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_SENDER'],
  },
  async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'method' });
      return;
    }

    const body = (req.body ?? {}) as CheckLeadInput;
    // 봇은 값싸게 돌려보낸다. 성공처럼 보여야 다시 시도하지 않는다.
    if (String(body.company ?? '').trim()) {
      res.json({ ok: true });
      return;
    }

    const agencyId = String(body.agencyId ?? '').trim();
    const name = String(body.name ?? '').trim().slice(0, 40);
    const phoneRaw = String(body.phone ?? '').trim();
    if (!AGENCY_ID_RE.test(agencyId)) {
      res.status(400).json({ ok: false, error: '업체 식별자가 올바르지 않습니다.' });
      return;
    }
    if (!name || !PHONE_RE.test(phoneRaw.replace(/\s/g, ''))) {
      res.status(400).json({ ok: false, error: '성함과 연락처를 확인해 주세요.' });
      return;
    }
    const phone = normalizePhone(phoneRaw);
    const level = ['ok', 'check', 'stop'].includes(String(body.level)) ? String(body.level) : 'unknown';
    const summary = String(body.summary ?? '').slice(0, 2000);
    const page = String(body.page ?? '').slice(0, 300);

    const db = getFirestore();
    const agencySnap = await db.doc('agencies/' + agencyId).get();
    const agency = agencySnap.data();
    // 승인된 업체만 받는다. 아무 ID나 넣어 남의 이름으로 접수를 만드는 것을 막는다.
    if (!agencySnap.exists || !agency || agency.verificationStatus !== 'verified') {
      res.status(404).json({ ok: false, error: '접수할 업체를 찾을 수 없습니다.' });
      return;
    }
    const agencyPhone = String(agency.phone ?? '').trim();
    const agencyName = String(agency.name ?? '');

    // 저장을 먼저. 연락처는 어떤 경우에도 살아남아야 한다.
    let stored = false;
    try {
      const now = Timestamp.now();
      await db.collection('agencies/' + agencyId + '/leads').add({
        agencyId,
        source: 'quick_check',
        name,
        phone,
        level,
        summary,
        page,
        status: 'new',
        memo: '',
        createdAt: now,
        updatedAt: now,
      });
      stored = true;
    } catch (error) {
      logger.error('점검 접수 저장 실패', { agencyId, error });
    }

    const head = stored ? '[요건점검 상담접수]' : '[요건점검 상담접수][주의] 저장 실패 — 이 문자가 유일한 기록';
    const text = [head, name + ' ' + phone, '판정 ' + (CHECK_LEVEL_LABEL[level] ?? '미확인'), summary]
      .filter(Boolean)
      .join('\n')
      .slice(0, 1900);
    if (!agencyPhone) logger.warn('업체 전화번호가 없어 문자를 건너뜀', { agencyId });
    const smsOk = agencyPhone ? await sendSms(text, agencyPhone) : false;

    if (!stored && !smsOk) {
      res.status(500).json({ ok: false, error: '지금 접수가 되지 않았어요. 잠시 후 다시 시도해 주세요.' });
      return;
    }
    res.json({ ok: true, agencyName });
  },
);

/** 접수함이 호출하는 서버 간 인증. 길이가 같을 때 내용을 상수 시간으로 비교한다. */
function authorized(req: { get: (k: string) => string | undefined }): boolean {
  const id = (process.env.HQ_ADMIN_ID ?? '').trim();
  const key = (process.env.HQ_ADMIN_KEY ?? '').trim();
  if (!id || !key) return false;
  const gotId = (req.get('x-admin-id') ?? '').trim();
  const gotKey = (req.get('x-admin-key') ?? '').trim();
  if (gotId.length !== id.length || gotKey.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < id.length; i += 1) diff |= gotId.charCodeAt(i) ^ id.charCodeAt(i);
  for (let i = 0; i < key.length; i += 1) diff |= gotKey.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

/** UTC "YYYY-MM-DD HH:MM:SS". 접수함 UI가 이 형식을 파싱한다. */
function utc(ts: Timestamp | null | undefined): string {
  const d = ts ? ts.toDate() : new Date();
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 중앙 접수함용 헤드리스 어드민 API.
 * 경로 접미사로 분기한다(base가 함수 URL이고 뒤에 /api/admin/...이 붙는다).
 */
export const weddingcoreAdmin = onRequest(
  { region: REGION, timeoutSeconds: 120, cors: false, secrets: ['HQ_ADMIN_ID', 'HQ_ADMIN_KEY'] },
  async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (!authorized(req)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const db = getFirestore();
    const path = req.path;

    try {
      if (path.endsWith('/chats')) {
        const snap = await db.collection('liveSessions').orderBy('lastAt', 'desc').limit(100).get();
        res.json({
          sessions: snap.docs.map((d) => ({
            sid: d.id,
            name: d.get('name') ?? '',
            live: d.get('attorneyJoined') === true,
            last_at: utc(d.get('lastAt')),
            started_at: utc(d.get('createdAt')),
            last_msg: d.get('lastMsg') ?? '',
            n: d.get('lastSeq') ?? 0,
          })),
        });
        return;
      }

      if (path.endsWith('/chat/messages')) {
        const sid = String(req.query.sid ?? '');
        if (!/^[a-zA-Z0-9-]{8,64}$/.test(sid)) {
          res.status(400).json({ error: 'bad sid' });
          return;
        }
        const ref = db.collection('liveSessions').doc(sid);
        const [doc, msgs] = await Promise.all([
          ref.get(),
          ref.collection('messages').orderBy('seq', 'asc').limit(500).get(),
        ]);
        if (!doc.exists) {
          res.status(404).json({ error: 'not found' });
          return;
        }
        res.json({
          live: doc.get('attorneyJoined') === true,
          name: doc.get('name') ?? '',
          phone: doc.get('phone') ?? '',
          messages: msgs.docs.map((m) => ({
            // 접수함은 user/admin/그 외로만 구분한다. 내부 역할명을 변환해 내보낸다.
            role:
              m.get('role') === 'visitor' ? 'user' : m.get('role') === 'attorney' ? 'admin' : 'bot',
            content: m.get('content') ?? '',
            created_at: utc(m.get('createdAt')),
          })),
        });
        return;
      }

      if (path.endsWith('/chat/send')) {
        const { sid, content } = (req.body ?? {}) as { sid?: string; content?: string };
        if (!sid || !content?.trim()) {
          res.status(400).json({ error: 'bad request' });
          return;
        }
        const ref = db.collection('liveSessions').doc(sid);
        await db.runTransaction(async (tx) => {
          const doc = await tx.get(ref);
          if (!doc.exists) throw new Error('not found');
          const seq = (doc.get('lastSeq') ?? 0) + 1;
          const now = Timestamp.now();
          tx.set(ref.collection('messages').doc(), {
            seq,
            role: 'attorney',
            content: content.slice(0, 4000),
            createdAt: now,
          });
          tx.update(ref, {
            lastSeq: seq,
            lastAt: now,
            lastMsg: content.slice(0, 120),
            attorneyJoined: true,
            attorneySeenAt: now,
          });
        });
        res.json({ ok: true });
        return;
      }

      // 답변 초안·서류·첨부는 다음 단계에서 붙인다. 접수함이 물어도 조용히 실패하지 않도록
      // 준비되지 않았음을 분명히 알린다.
      if (path.endsWith('/chat/draft')) {
        res.json({ ok: false, draft: '', lawRefs: [], error: '초안 기능은 준비 중입니다.' });
        return;
      }
      if (path.endsWith('/chat/document')) {
        res.json({ ok: true, types: [] });
        return;
      }
      if (path.endsWith('/chat/files')) {
        res.json({ files: [] });
        return;
      }

      res.status(404).json({ error: 'unknown path' });
    } catch (error) {
      logger.error('어드민 API 오류', { path, error });
      res.status(500).json({ error: 'internal' });
    }
  },
);
