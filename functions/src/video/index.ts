// 영상통화 — 업체를 거쳐야만 연결되는 통화
//
// 흐름
//   1) checkVideoCallReadiness — 지금 통화를 열 수 있는지, 못 열면 무엇이 막는지
//   2) startVideoCall          — 게이트를 통과하면 세션을 만들고 역할별 입장 코드를 준다
//   3) joinVideoCall           — 코드를 들고 온 사람에게 그 자리에서 입장 토큰을 만들어 준다
//   4) appendCallTranscript    — 통화 중 전사본을 쌓는다. 연락처 교환을 자동 표시한다
//   5) endVideoCall            — 통화를 닫고 보존기한을 박는다
//
// 누가 들어오나. 신랑 후보·신부 후보·통역·담당 직원 넷이 각자 자기 자리에서 접속한다.
// 통역과 담당자가 함께 들어오는 것이 현장의 실제 진행 방식이고, 그 두 사람이 있어야
// 「업체가 주선한 자리」라는 기록이 남는다.
//
// 지키는 선
//  - 판정은 domain/videoCallGate가 한다. 여기서는 저장소와 토큰만 다룬다.
//  - 양쪽은 서로의 연락처를 모른다. 방 이름·참가자 식별자에 개인정보를 넣지 않는다.
//  - 채팅·파일전송·화면공유는 토큰에서 끈다(video/livekit.ts).
//  - 입으로 부르는 번호는 막지 못한다. 대신 전사본에 남기고 표시한다.

import { randomBytes } from 'node:crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  CONSERVATIVE_POLICY,
  evaluateCallRequest,
  type CallRequest,
  type InterpretationPlan,
  type AgentAssignment,
} from '../domain/videoCallGate.js';
import { detectContactLeak } from '../domain/contactLeak.js';
import {
  createAccessToken,
  livekitConfigured,
  livekitUrl,
  recordingConfigured,
  startRoomRecording,
  stopRoomRecording,
} from './livekit.js';

const REGION = 'asia-northeast3';
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== 'true';
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * 보존기간 — 글과 영상을 나눈다. (2026-09-20 법령 원문 대조로 정리)
 *
 * 법 제10조의4 ①은 ①결혼중개계약서 ②국제결혼 개인신상정보 확인서와 증빙 ③그 밖의 혼인 관련
 * **서류**를 보존 대상으로 두고, 시행규칙 제9조가 그 서류를 **5년**으로 정한다.
 *
 * ★ 조문은 일관되게 「서류」라고 쓴다. 통화 녹화 영상을 여기 넣어 읽기는 문언상 무리다.
 *   법 제14조 후단이 장부를 전자문서로 갈음할 수 있다고 하지만, 전자문서는 문서의 전자적
 *   형태이지 영상이 아니다. 그래서 **영상 보관은 법정 의무가 아니라 우리 정책**으로 본다.
 *
 * 그러면 길게 둘 이유가 없다. 오히려 필요 없는 얼굴 영상을 오래 들고 있는 것이 개인정보
 * 최소보관 원칙에 걸린다 — 지키려다 어기는 꼴이 된다. 그래서 이렇게 가른다.
 *
 *  - 영상 : 1년. 맞선 관련 다툼은 대개 그 안에 나온다.
 *  - 전사본·통화 기록 : 5년. 텍스트라 용량이 거의 없고, 「무슨 말이 오갔나」와
 *                      「업체를 거쳐 주선한 자리였나」를 증명하는 것은 이쪽이다.
 *
 * 영상을 지우는 일은 코드가 하지 않는다. R2 버킷의 수명주기 규칙(1년)이 맡는다 —
 * 코드는 안 돌 수 있지만 버킷 규칙은 우리가 잊어도 돈다.
 *
 * 변호사 확인이 오면 바꿀 곳은 이 두 상수뿐이다.
 */
const RETENTION_YEARS = 5;
const VIDEO_RETENTION_YEARS = 1;

/**
 * 입장 링크가 살아 있는 시간.
 *
 * 왜 링크인가. LiveKit 입장 토큰은 15분이면 만료돼서 미리 보내 둘 수가 없고, 한 번
 * 새어 나가면 되돌릴 방법이 없다. 대신 코드를 보내고 들어오는 순간에 토큰을 만든다.
 * 그러면 통화를 닫는 것만으로 모든 링크가 동시에 죽는다.
 *
 * 6시간인 이유. 통화를 연 뒤에 네 사람에게 링크를 돌리고 시차를 건너 모이려면
 * 몇 시간이 걸린다. 반대로 하루를 넘기면 일정이 어긋난 링크가 살아서 돌아다닌다.
 */
const INVITE_TTL_HOURS = 6;

type Role = 'client' | 'partner' | 'interpreter' | 'agent';

/** 화면에 뜨는 이름. 역할까지만 적는다 — 이름을 넣으면 상대 화면에 그대로 뜬다 */
const ROLE_LABEL: Record<Role, string> = {
  client: '신랑 후보',
  partner: '신부 후보',
  interpreter: '통역',
  agent: '담당자',
};

/**
 * 입장 코드. 192비트 난수라 추측으로는 맞힐 수 없다.
 * 링크에 그대로 들어가므로 URL에서 탈이 나지 않는 글자만 쓴다.
 */
function newInviteCode(): string {
  return randomBytes(24).toString('base64url');
}

export function requireAgencyWriter(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const role = request.auth.token.role as string | undefined;
  const agencyId = request.auth.token.agencyId as string | undefined;
  if (!agencyId || !['owner', 'manager', 'staff'].includes(role ?? '')) {
    throw new HttpsError('permission-denied', '업체 업무 담당자만 통화를 열 수 있습니다.');
  }
  return { uid: request.auth.uid, agencyId };
}

export function requireSafeId(value: string, label: string) {
  if (!SAFE_ID.test(value)) {
    throw new HttpsError('invalid-argument', `${label} 형식이 올바르지 않습니다.`);
  }
}

/**
 * 게이트에 넣을 자료를 모은다.
 * 고객 타임라인, 만남 동의, 통역 배정, 녹화 동의를 한 번에 읽는다.
 */
export async function collectCallRequest(
  agencyId: string,
  matchId: string,
): Promise<{ request: CallRequest; clientId: string; partnerId: string }> {
  const db = getFirestore();
  const matchSnap = await db.doc(`agencies/${agencyId}/matches/${matchId}`).get();
  if (!matchSnap.exists) throw new HttpsError('not-found', '맞선 건을 찾을 수 없습니다.');
  const match = matchSnap.data()!;
  const clientId = String(match.clientId ?? '');
  const partnerId = String(match.partnerId ?? '');
  if (!clientId || !partnerId) {
    throw new HttpsError('failed-precondition', '맞선 건에 고객 또는 후보가 없습니다.');
  }

  const [timelineSnap, interpreterSnap, agentSnap, interpPartnerSnap] = await Promise.all([
    db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`).get(),
    // 통역 배정은 맞선 건에 적어 둔다. 없으면 배정 안 한 것이다.
    match.interpreterId
      ? db.doc(`agencies/${agencyId}/interpreters/${String(match.interpreterId)}`).get()
      : Promise.resolve(null),
    // 배석할 담당 직원도 맞선 건에 적는다.
    // 재직 여부는 members 문서로 본다 — 내보내면 문서가 지워지므로(agency/staff.ts)
    // 문서가 있다는 것이 곧 지금 근무 중이라는 뜻이다.
    match.agentUid
      ? db.doc(`agencies/${agencyId}/members/${String(match.agentUid)}`).get()
      : Promise.resolve(null),
    // 현지 파트너가 통역을 붙이는 경우. 현장에서 가장 흔한 형태다.
    match.interpretationPartnerId
      ? db
          .doc(`agencies/${agencyId}/localPartners/${String(match.interpretationPartnerId)}`)
          .get()
      : Promise.resolve(null),
  ]);

  let interpretation: InterpretationPlan = { mode: 'none' };
  if (interpreterSnap?.exists) {
    interpretation = {
      mode: 'in_house',
      interpreterId: interpreterSnap.id,
      active: interpreterSnap.get('active') === true,
    };
  } else if (interpPartnerSnap?.exists) {
    interpretation = {
      mode: 'local_partner',
      partnerId: interpPartnerSnap.id,
      partnerName: String(interpPartnerSnap.get('companyName') ?? ''),
      writtenContract: interpPartnerSnap.get('writtenContract') === true,
      active: interpPartnerSnap.get('active') === true,
    };
  } else if (match.interpretationVendor) {
    const vendor = match.interpretationVendor as { name?: string; contractOnFile?: boolean };
    interpretation = {
      mode: 'vendor',
      vendorName: String(vendor.name ?? ''),
      contractOnFile: vendor.contractOnFile === true,
    };
  }

  const agent: AgentAssignment = agentSnap?.exists
    ? { assigned: true, staffId: agentSnap.id, active: true }
    : { assigned: false };

  const consents = (match.callConsents ?? {}) as {
    meeting?: { client?: boolean; partner?: boolean };
    recording?: { client?: boolean; partner?: boolean };
    crossBorder?: boolean | null;
  };

  return {
    clientId,
    partnerId,
    request: {
      obligations: timelineSnap.docs.map((doc) => ({
        templateCode: String(doc.get('templateCode') ?? ''),
        status: String(doc.get('status') ?? ''),
      })),
      meetingConsent: {
        client: consents.meeting?.client === true,
        partner: consents.meeting?.partner === true,
      },
      interpretation,
      agent,
      recordingConsent: {
        client: consents.recording?.client === true,
        partner: consents.recording?.partner === true,
      },
      crossBorderConsent:
        consents.crossBorder === undefined ? null : (consents.crossBorder as boolean | null),
    },
  };
}

/**
 * 통화를 열 수 있는지만 본다. 아무것도 만들지 않는다.
 * 화면이 「통화 시작」 버튼을 잠그고 무엇이 남았는지 보여주는 데 쓴다.
 */
export const checkVideoCallReadiness = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    // 시크릿을 안 묶으면 process.env에 값이 안 들어와 livekitConfigured()가 항상 false다.
    // 설정을 마쳐도 화면은 「아직 연결되지 않았습니다」를 계속 보여준다.
    secrets: ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'],
  },
  async (request) => {
    const { agencyId } = requireAgencyWriter(request);
    const { matchId } = request.data as { matchId?: string };
    if (!matchId) throw new HttpsError('invalid-argument', '맞선 건을 지정해 주세요.');
    requireSafeId(matchId, '맞선 건 식별자');

    const { request: callRequest } = await collectCallRequest(agencyId, matchId);
    const verdict = evaluateCallRequest(callRequest, CONSERVATIVE_POLICY);
    return {
      ...verdict,
      // 키가 없으면 통과해도 못 연다. 화면이 「준비 중」으로 안내하도록 같이 내려준다.
      serviceConfigured: livekitConfigured(),
      // 녹화 저장소가 없으면 통화는 열리되 녹화가 안 된다. 동의를 받아 놓고 녹화를 못 하면
      // 「녹화한다고 해 놓고 안 했다」가 되므로 미리 알린다.
      recordingConfigured: recordingConfigured(),
    };
  },
);

/**
 * 통화를 열고 역할별 입장 코드를 준다.
 *
 * 코드는 역할마다 따로 만든다. 하나를 나눠 쓰면 누가 들어왔는지 못 가린다.
 * 사장은 받은 코드로 만든 링크를 네 사람에게 각각 보낸다.
 */
export const startVideoCall = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    // R2 키를 같이 묶어야 녹화가 걸린다. 빠뜨리면 통화는 열리는데 녹화만 조용히 안 된다.
    secrets: [
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET',
      'LIVEKIT_URL',
      'R2_ACCOUNT_ID',
      'R2_BUCKET',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
    ],
    timeoutSeconds: 60,
  },
  async (request) => {
    const { uid, agencyId } = requireAgencyWriter(request);
    const { matchId } = request.data as { matchId?: string };
    if (!matchId) throw new HttpsError('invalid-argument', '맞선 건을 지정해 주세요.');
    requireSafeId(matchId, '맞선 건 식별자');

    const { request: callRequest, clientId, partnerId } = await collectCallRequest(agencyId, matchId);
    const verdict = evaluateCallRequest(callRequest, CONSERVATIVE_POLICY);
    if (!verdict.allow) {
      logger.warn('영상통화 개시 거부', {
        agencyId,
        matchId,
        blockers: verdict.blockers.map((b) => b.kind),
      });
      throw new HttpsError(
        'failed-precondition',
        // 첫 번째 사유만 던진다. 전체 목록은 checkVideoCallReadiness가 준다.
        verdict.blockers[0]!.reason,
      );
    }

    const db = getFirestore();
    const callRef = db.collection(`agencies/${agencyId}/matches/${matchId}/calls`).doc();
    // 방 이름에 개인정보를 넣지 않는다. 토큰을 디코딩하면 그대로 보인다.
    const roomName = `wc-${agencyId.slice(0, 12)}-${callRef.id}`;

    // 역할마다 입장 코드를 하나씩 만든다. 넷이 각자 자기 자리에서 들어온다.
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + INVITE_TTL_HOURS * 3600_000));
    const invites: Record<string, string> = {};
    const inviteBatch = db.batch();
    for (const role of verdict.requiredParticipants) {
      const code = newInviteCode();
      invites[role] = code;
      inviteBatch.set(db.doc(`callInvites/${code}`), {
        code,
        agencyId,
        matchId,
        callId: callRef.id,
        roomName,
        role,
        expiresAt,
        joinCount: 0,
        lastJoinedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await inviteBatch.commit();

    // 녹화를 건다. 실패해도 통화는 연다 — 네 사람이 모였는데 녹화 때문에 못 만나는 것이
    // 더 큰 손해다. 대신 녹화가 안 됐다는 사실을 기록에 남기고 화면에 알린다.
    let egressId = '';
    let recordingError = '';
    if (verdict.room.recording && recordingConfigured()) {
      try {
        egressId = await startRoomRecording(roomName, callRef.id);
      } catch (err) {
        recordingError = (err as Error).message.slice(0, 200);
        logger.error('통화 녹화 시작 실패', { agencyId, callId: callRef.id, recordingError });
      }
    } else if (verdict.room.recording) {
      recordingError = '녹화 저장소가 설정되지 않았습니다.';
    }

    const videoUntil = new Date();
    videoUntil.setFullYear(videoUntil.getFullYear() + VIDEO_RETENTION_YEARS);

    await callRef.set({
      callId: callRef.id,
      agencyId,
      matchId,
      clientId,
      partnerId,
      roomName,
      status: 'live',
      policy: CONSERVATIVE_POLICY,
      requiredParticipants: verdict.requiredParticipants,
      room: verdict.room,
      interpretation: callRequest.interpretation,
      // 누가 배석하기로 했는가. 통화가 끝난 뒤 「업체를 거친 자리였다」는 기록이 된다.
      agent: callRequest.agent,
      // 실제로 들어온 사람. joinVideoCall이 채운다. 배정과 실제는 다를 수 있다.
      joinedRoles: [],
      // 녹화. egressId가 비어 있으면 녹화가 안 걸린 통화다.
      recording: {
        egressId,
        // 저장소 안의 위치. 실제 파일은 통화가 끝나야 올라간다.
        path: egressId ? `calls/${callRef.id}.mp4` : null,
        error: recordingError || null,
        // 이 날짜가 지나면 R2 수명주기 규칙이 영상을 지운다. 전사본은 남는다.
        expiresAt: egressId ? Timestamp.fromDate(videoUntil) : null,
      },
      transcriptCount: 0,
      // 연락처를 주고받은 정황. appendCallTranscript가 채운다.
      contactLeaks: [],
      startedAt: FieldValue.serverTimestamp(),
      endedAt: null,
      retentionUntil: null,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('영상통화 개시', {
      agencyId,
      matchId,
      callId: callRef.id,
      roles: verdict.requiredParticipants,
    });
    // 토큰이 아니라 코드를 돌려준다. 토큰은 각자 들어올 때 joinVideoCall이 만든다.
    return {
      callId: callRef.id,
      roomName,
      url: livekitUrl(),
      invites,
      room: verdict.room,
      expiresAt: expiresAt.toMillis(),
      // 화면이 「녹화 중」으로 안내할지, 「녹화 안 됨」을 경고할지 가른다.
      recording: Boolean(egressId),
      recordingError: recordingError || null,
    };
  },
);

/**
 * 입장 코드를 들고 온 사람에게 그 자리에서 토큰을 만들어 준다.
 *
 * ★ 여기가 로그인 없이 들어올 수 있는 유일한 문이다. 그래서 다음을 지킨다.
 *
 *  - 코드는 192비트 난수다. 목록으로 훑을 수 없고 추측으로도 못 맞힌다.
 *  - 통화가 live일 때만 연다. 사장이 통화를 닫으면 네 링크가 동시에 죽는다.
 *  - 만료 시각을 코드에 박는다. 일정이 어긋난 링크가 살아 돌아다니지 않는다.
 *  - 토큰은 15분짜리다. 끊겨서 다시 들어오면 여기를 다시 부르면 된다.
 *  - App Check는 그대로 건다. 우리 화면에서 온 요청만 받는다.
 *
 * 못 하는 것도 적어 둔다. **링크를 받은 사람이 정말 그 사람인지는 확인하지 못한다.**
 * 링크가 남에게 넘어가면 그 사람이 들어온다. 본인 확인은 링크를 본인 번호로 보내는
 * 운영으로 메운다 — 기술로 다 막은 척하지 않는다.
 */
export const joinVideoCall = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    secrets: ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'],
  },
  async (request) => {
    const { code } = request.data as { code?: string };
    if (!code || !SAFE_ID.test(code)) {
      throw new HttpsError('invalid-argument', '입장 링크가 올바르지 않습니다.');
    }

    const db = getFirestore();
    const inviteRef = db.doc(`callInvites/${code}`);
    const invite = await inviteRef.get();
    if (!invite.exists) {
      throw new HttpsError('not-found', '입장 링크를 찾을 수 없습니다. 주소를 다시 확인해 주세요.');
    }

    const expiresAt = invite.get('expiresAt') as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      throw new HttpsError('failed-precondition', '입장 링크가 만료되었습니다. 새 링크를 받아 주세요.');
    }

    const agencyId = String(invite.get('agencyId') ?? '');
    const matchId = String(invite.get('matchId') ?? '');
    const callId = String(invite.get('callId') ?? '');
    const role = String(invite.get('role') ?? '') as Role;
    if (!ROLE_LABEL[role]) {
      throw new HttpsError('failed-precondition', '입장 링크가 올바르지 않습니다.');
    }

    const callRef = db.doc(`agencies/${agencyId}/matches/${matchId}/calls/${callId}`);
    const call = await callRef.get();
    if (!call.exists) throw new HttpsError('not-found', '통화를 찾을 수 없습니다.');
    if (call.get('status') !== 'live') {
      throw new HttpsError('failed-precondition', '이미 끝난 통화입니다.');
    }

    const roomName = String(call.get('roomName') ?? '');
    const token = createAccessToken({
      room: roomName,
      // 같은 사람이 다시 들어와도 같은 식별자여야 한 자리로 센다.
      identity: `${role}-${callId.slice(0, 8)}`,
      name: ROLE_LABEL[role],
      canPublish: true,
      canPublishData: false,
    });

    await Promise.all([
      inviteRef.update({
        joinCount: FieldValue.increment(1),
        lastJoinedAt: FieldValue.serverTimestamp(),
      }),
      // 누가 실제로 들어왔는지 통화 기록에 남긴다. 배석하기로 해 놓고 안 들어온 경우를
      // 나중에 가릴 수 있어야 한다.
      callRef.update({
        joinedRoles: FieldValue.arrayUnion(role),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);

    logger.info('영상통화 입장', { agencyId, callId, role });
    return {
      url: livekitUrl(),
      token,
      role,
      roleLabel: ROLE_LABEL[role],
      room: {
        ...(call.get('room') ?? { chat: false, fileTransfer: false, screenShare: false }),
        // ★ 정책값이 아니라 실제로 녹화가 걸렸는지를 내려보낸다.
        // 통화방의 「녹화 중」 표시는 참가자에게 하는 고지다. 녹화가 실패했는데
        // 정책값만 보고 「녹화 중」을 띄우면 안 찍히는 영상을 찍힌다고 말하는 셈이 된다.
        recording: Boolean(call.get('recording.egressId')),
      },
    };
  },
);

/**
 * 전사본을 쌓는다. AI가 받아쓰고 번역한 결과가 들어온다.
 *
 * 번역은 언제나 초안이다. translateBackgroundInfo가 AI 번역에 draft를 박고 사람이 서명해야
 * certified로 보는 것과 같은 규칙을 여기에도 건다 — 정지된 문서조차 초안으로 다루는데
 * 실시간 음성을 최종본으로 볼 수는 없다.
 */
export const appendCallTranscript = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const { agencyId } = requireAgencyWriter(request);
    const { matchId, callId, segments } = request.data as {
      matchId?: string;
      callId?: string;
      segments?: Array<{ speaker?: string; text?: string; lang?: string; translated?: string }>;
    };
    if (!matchId || !callId || !Array.isArray(segments) || segments.length === 0) {
      throw new HttpsError('invalid-argument', '전사 내용이 없습니다.');
    }
    requireSafeId(matchId, '맞선 건 식별자');
    requireSafeId(callId, '통화 식별자');
    if (segments.length > 50) {
      throw new HttpsError('invalid-argument', '한 번에 50줄까지 보낼 수 있습니다.');
    }

    const db = getFirestore();
    const callRef = db.doc(`agencies/${agencyId}/matches/${matchId}/calls/${callId}`);

    // ★ 트랜잭션으로 묶는다. 읽고 나서 쓰면 둘이 동시에 올 때 깨진다 —
    // 같은 transcriptCount를 읽어 seq가 같은 줄이 두 개 생기고, 세어둔 개수도 한쪽만 남는다.
    // 전사본은 「무슨 말이 오갔나」를 증명하는 기록이라 순서가 엉키면 쓸 수 없게 된다.
    // 음성인식은 조각을 쉬지 않고 보내므로 동시 호출은 드물지 않다.
    const leaks = await db.runTransaction(async (tx) => {
      const callSnap = await tx.get(callRef);
      if (!callSnap.exists) throw new HttpsError('not-found', '통화를 찾을 수 없습니다.');
      if (callSnap.get('status') !== 'live') {
        throw new HttpsError('failed-precondition', '이미 끝난 통화입니다.');
      }

      const startSeq = Number(callSnap.get('transcriptCount') ?? 0);
      // 재시도로 이 함수가 다시 돌 수 있으므로 밖이 아니라 안에서 비운다.
      const found: Array<Record<string, unknown>> = [];

      segments.forEach((segment, index) => {
        const speaker = ['client', 'partner', 'interpreter', 'agent'].includes(
          String(segment.speaker),
        )
          ? String(segment.speaker)
          : 'client';
        const text = String(segment.text ?? '').slice(0, 2000);
        const seq = startSeq + index + 1;

        tx.set(callRef.collection('transcript').doc(), {
          seq,
          speaker,
          text,
          lang: String(segment.lang ?? '').slice(0, 16),
          translated: String(segment.translated ?? '').slice(0, 2000),
          // AI 번역은 초안이다. 사람이 고치기 전까지 최종본으로 쓰지 않는다.
          translatedBy: 'ai',
          translationQuality: 'draft',
          createdAt: FieldValue.serverTimestamp(),
        });

        // 원문과 번역문을 모두 본다. 번역 쪽에만 번호가 남는 경우가 있다.
        for (const leak of [
          ...detectContactLeak(text),
          ...detectContactLeak(String(segment.translated ?? '')),
        ]) {
          found.push({ ...leak, seq, speaker });
        }
      });

      tx.update(callRef, {
        transcriptCount: startSeq + segments.length,
        ...(found.length > 0
          ? { contactLeaks: FieldValue.arrayUnion(...found.slice(0, 20)) }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return found;
    });

    if (leaks.length > 0) {
      logger.warn('통화 중 연락처 교환 정황', {
        agencyId,
        callId,
        kinds: leaks.map((l) => l.kind),
      });
    }
    return { ok: true, appended: segments.length, leaksFound: leaks.length };
  },
);

/** 통화를 닫고 보존기한을 박는다. 기한이 없으면 파기 작업이 손댈 수 없다 */
export const endVideoCall = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    // 녹화를 멈추려면 LiveKit 키가 있어야 한다.
    secrets: ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'],
  },
  async (request) => {
    const { agencyId } = requireAgencyWriter(request);
    const { matchId, callId } = request.data as { matchId?: string; callId?: string };
    if (!matchId || !callId) throw new HttpsError('invalid-argument', '통화를 지정해 주세요.');
    requireSafeId(matchId, '맞선 건 식별자');
    requireSafeId(callId, '통화 식별자');

    const db = getFirestore();
    const callRef = db.doc(`agencies/${agencyId}/matches/${matchId}/calls/${callId}`);
    const snap = await callRef.get();
    if (!snap.exists) throw new HttpsError('not-found', '통화를 찾을 수 없습니다.');
    // 녹화를 멈춘다. 방이 비면 알아서도 멈추지만 여기서 확실히 한다.
    // 실패해도 통화 종료는 계속한다 — 못 멈춘 녹화보다 안 닫힌 통화가 위험하다.
    const egressId = String(snap.get('recording.egressId') ?? '');
    if (egressId) {
      try {
        await stopRoomRecording(egressId);
      } catch (err) {
        logger.warn('녹화 중지 실패', { agencyId, callId, message: (err as Error).message });
      }
    }

    // ★ 입장 링크부터 거둔다. 상태를 먼저 바꾸면 안 된다 —
    // 링크 삭제가 실패했을 때 다음 호출이 바로 아래 alreadyEnded로 빠져나가
    // 링크가 영영 안 지워진다. 이 순서면 다시 불러서 치울 수 있다.
    // (status 검사만으로도 입장은 막히지만, 끝난 통화의 링크가 주소창에 살아 있으면
    //  받은 사람은 계속 눌러 보게 된다.)
    const invites = await db.collection('callInvites').where('callId', '==', callId).get();
    if (!invites.empty) {
      const batch = db.batch();
      invites.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    if (snap.get('status') !== 'live') return { ok: true, alreadyEnded: true };

    const until = new Date();
    until.setFullYear(until.getFullYear() + RETENTION_YEARS);

    await callRef.update({
      status: 'ended',
      endedAt: FieldValue.serverTimestamp(),
      retentionUntil: Timestamp.fromDate(until),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const leaks = (snap.get('contactLeaks') as unknown[] | undefined) ?? [];
    return { ok: true, transcriptCount: snap.get('transcriptCount') ?? 0, leaksFound: leaks.length };
  },
);

/**
 * 보존기한이 지난 통화 기록을 지운다.
 *
 * 기능과 같이 만든다. 개인정보처리방침이 약속한 파기를 나중에 붙이려다 코드가 없던
 * 전례가 있다(purgeOldConsultSessions). 영상·음성 전사본은 텍스트 상담과 민감도가 다르다.
 */
export const purgeExpiredCallRecords = onSchedule(
  { region: REGION, schedule: '50 3 * * *', timeZone: 'Asia/Seoul', timeoutSeconds: 540 },
  async () => {
    const db = getFirestore();
    const snap = await db
      .collectionGroup('calls')
      .where('retentionUntil', '<', Timestamp.now())
      .orderBy('retentionUntil', 'asc')
      .limit(100)
      .get();

    let removed = 0;
    for (const doc of snap.docs) {
      // 전사본을 먼저 지운다. 통화만 지우면 전사본이 주인 없이 남는다.
      const transcript = await doc.ref.collection('transcript').get();
      const pending = [...transcript.docs];
      while (pending.length) {
        const chunk = pending.splice(0, 400);
        const batch = db.batch();
        chunk.forEach((item) => batch.delete(item.ref));
        await batch.commit();
      }
      await doc.ref.delete();
      removed += 1;
    }

    if (removed > 0) logger.info(`보존기한이 지난 통화 기록 ${removed}건 파기`);

    // 통화를 안 닫고 그냥 나가는 경우가 실제로 있다. 그때 남는 입장 링크를 여기서 치운다.
    const staleInvites = await db
      .collection('callInvites')
      .where('expiresAt', '<', Timestamp.now())
      .limit(400)
      .get();
    if (!staleInvites.empty) {
      const batch = db.batch();
      staleInvites.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      logger.info(`만료된 입장 링크 ${staleInvites.size}건 정리`);
    }
  },
);
