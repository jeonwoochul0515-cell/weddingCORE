// 직접 만나는 약속도 같은 문을 지난다
//
// 이 제품의 코어는 하나다 — **사이트대로 하면 법에 어긋나지 않는다.**
// 그런데 지금까지 그 문은 화상통화에만 있었다. 현지에 나가 직접 만나는 약속은
// 그냥 잡혔다. 법은 온라인과 오프라인을 가르지 않는다. 시행령 제3조의2는
// 「만남을 주선」하는 것에 걸리고, 대법원 2018도7989는 제공 의무를
// 「만나기 이전」으로 못 박았다. 오히려 직접 만나는 쪽이 더 무거운 만남이다.
//
// 그래서 같은 판정을 쓴다. 다른 것은 녹화뿐이다 — 현지 호텔 로비에서 만나는 자리를
// 우리가 녹화할 방법도 없고, 녹화 동의를 요구할 근거도 없다.
//
// ★ 약속을 **잡는 것**은 막지 않는다. 막으면 사장이 기록을 안 남기고 만난다.
//   그러면 우리는 아무것도 모르게 되고, 다툴 때 근거도 없다.
//   막는 것은 **확정**이다. 잡아 두고 요건을 갖춘 뒤 확정한다.

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { evaluateCallRequest, type CallPolicy } from '../domain/videoCallGate.js';
import {
  checkIntroductionLimits,
  dayKeyKst,
  type ScheduledMeeting,
} from '../domain/introductionLimits.js';
import { collectCallRequest, requireAgencyWriter, requireSafeId } from './index.js';

const REGION = 'asia-northeast3';
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== 'true';

/**
 * 직접 만나는 자리의 정책.
 *
 * 녹화만 뺀다. 나머지는 같다 — 신상정보 제공, 양측 만남 동의, 통역, 담당자 동행.
 * 담당자 동행은 현지에서 더 중요하다. 손님 혼자 현지에 보내는 것이 사고의 시작이다.
 */
export const OFFLINE_MEETING_POLICY: CallPolicy = {
  treatAsMeeting: true,
  requireRecording: false,
  requireAgentAttendance: true,
};

/** 화상 약속은 통화와 같은 문을 쓴다 */
export const ONLINE_MEETING_POLICY: CallPolicy = {
  treatAsMeeting: true,
  requireRecording: true,
  requireAgentAttendance: true,
};

/**
 * 약속을 확정해도 되는지 본다. 아무것도 바꾸지 않는다.
 * 화면이 「확정」 버튼을 잠그고 무엇이 남았는지 보여주는 데 쓴다.
 */
export const checkMeetingReadiness = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 30 },
  async (request) => {
    const { agencyId } = requireAgencyWriter(request);
    const { matchId, mode } = request.data as { matchId?: string; mode?: 'online' | 'offline' };
    if (!matchId) throw new HttpsError('invalid-argument', '맞선 건을 지정해 주세요.');
    requireSafeId(matchId, '맞선 건 식별자');

    const { request: callRequest } = await collectCallRequest(agencyId, matchId);
    const policy = mode === 'offline' ? OFFLINE_MEETING_POLICY : ONLINE_MEETING_POLICY;
    return evaluateCallRequest(callRequest, policy);
  },
);

/** 약속 문서 하나를 판정에 넣을 모양으로 바꿼다 */
function toScheduled(id: string, data: FirebaseFirestore.DocumentData): ScheduledMeeting {
  const start = data.startAt;
  const place = (data.place ?? null) as { name?: string; address?: string } | null;
  const placeText = place ? [place.name, place.address].filter(Boolean).join(' ').trim() : '';
  return {
    id,
    clientId: String(data.clientId ?? ''),
    partnerId: String(data.partnerId ?? ''),
    clientName: String(data.clientName ?? ''),
    partnerName: String(data.partnerName ?? ''),
    startMs: start?.toMillis ? start.toMillis() : null,
    durationMinutes: Number(data.durationMinutes ?? 60),
    place: placeText.length > 0 ? placeText : null,
    mode: data.mode === 'offline' ? 'offline' : 'online',
    status: String(data.status ?? ''),
  };
}

/**
 * 같은 업체의 이웃 약속을 모은다.
 *
 * 2호는 시간이 겹치는 것만, 3호는 같은 날만 본다. 그래서 그날 하루면 충분하고,
 * 시간대 경계를 넘는 건이 있으니 앞뒤 하루씩 더 잎어 온다. 전체를 읽지 않는다 —
 * 명단이 큰 업체일수록 확정 한 번에 수천 건을 읽는 일이 된다.
 */
async function neighborMeetings(
  db: FirebaseFirestore.Firestore,
  agencyId: string,
  startMs: number,
): Promise<ScheduledMeeting[]> {
  const DAY = 24 * 60 * 60 * 1000;
  const snap = await db
    .collection(`agencies/${agencyId}/appointments`)
    .where('startAt', '>=', Timestamp.fromMillis(startMs - DAY))
    .where('startAt', '<=', Timestamp.fromMillis(startMs + DAY))
    .get();
  return snap.docs.map((doc) => toScheduled(doc.id, doc.data()));
}

/**
 * 약속을 확정한다. 요건을 갖추지 못했으면 확정하지 않는다.
 *
 * 화면에서 직접 Firestore를 고치게 두면 이 검사를 건너뛸 수 있다.
 * 확정은 「이 날 만납니다」를 업체가 선언하는 일이라 서버가 한 번 봐야 한다.
 */
export const confirmAppointment = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 30 },
  async (request) => {
    const { agencyId, uid } = requireAgencyWriter(request);
    const { appointmentId } = request.data as { appointmentId?: string };
    if (!appointmentId) throw new HttpsError('invalid-argument', '약속을 지정해 주세요.');
    requireSafeId(appointmentId, '약속 식별자');

    const db = getFirestore();
    const ref = db.doc(`agencies/${agencyId}/appointments/${appointmentId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', '약속을 찾을 수 없습니다.');

    const matchId = String(snap.get('matchId') ?? '');
    const mode = String(snap.get('mode') ?? 'online') as 'online' | 'offline';
    if (!matchId) throw new HttpsError('failed-precondition', '약속에 맞선 건이 없습니다.');

    const { request: callRequest } = await collectCallRequest(agencyId, matchId);
    const policy = mode === 'offline' ? OFFLINE_MEETING_POLICY : ONLINE_MEETING_POLICY;
    const verdict = evaluateCallRequest(callRequest, policy);

    // 자리 자체가 금지된 모양인지도 본다(제12조의2 ① 2·3호).
    // 이것은 한 맞선만 봐서는 알 수 없고 일정판 전체를 봐야 보인다.
    const target = toScheduled(snap.id, snap.data()!);
    const limitBlockers =
      target.startMs === null
        ? checkIntroductionLimits(target, [])
        : checkIntroductionLimits(target, await neighborMeetings(db, agencyId, target.startMs));

    const blockers = [...limitBlockers, ...(verdict.allow ? [] : verdict.blockers)];
    if (blockers.length > 0) {
      // 무엇이 막는지 그대로 돌려준다. 화면이 같은 목록을 보여 주고 거기서 처리한다.
      logger.warn('약속 확정 거부', {
        agencyId,
        appointmentId,
        day: target.startMs === null ? null : dayKeyKst(target.startMs),
        kinds: blockers.map((b) => b.kind),
      });
      return { confirmed: false, blockers };
    }

    await ref.update({
      status: 'confirmed',
      // 확정한 시점의 판정을 함께 남긴다. 나중에 「그때는 갖춰져 있었나」를 답해야 한다.
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('약속 확정', { agencyId, appointmentId, matchId, mode });
    return { confirmed: true, blockers: [] };
  },
);
