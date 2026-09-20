// 영상통화 — 준비 상태 확인과 통화 개시
//
// 판정은 전부 서버가 한다(functions/src/domain/videoCallGate.ts). 화면은 그 결과를 보여주고
// 버튼을 잠글 뿐이다. 여기서 다시 판정하면 두 곳이 어긋나는 순간 법정의무를 덜 채운 채
// 만남이 열린다 — 화면 코드는 사용자가 고칠 수 있다는 점도 잊으면 안 된다.

import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/** 무엇이 막는지. 사장이 읽고 바로 무엇을 할지 알 수 있어야 한다 */
export type Blocker = {
  kind: 'obligation' | 'consent' | 'interpretation' | 'agent' | 'recording' | 'privacy';
  reason: string;
  remedy: string;
  legalBasis: string;
};

export const BLOCKER_GROUP: Record<Blocker['kind'], string> = {
  obligation: '법정의무',
  consent: '만남 동의',
  interpretation: '통역·번역',
  agent: '담당자 배석',
  recording: '녹화 동의',
  privacy: '개인정보',
};

/** 통화에 들어오는 사람. 넷이 각자 자기 자리에서 접속한다 */
export type CallRole = 'client' | 'partner' | 'interpreter' | 'agent';

export const ROLE_LABEL: Record<CallRole, string> = {
  client: '신랑 후보',
  partner: '신부 후보',
  interpreter: '통역',
  agent: '담당자',
};

/** 링크를 누구에게 어떻게 보내는지. 사장이 헷갈리지 않게 한 줄씩 적어 둔다 */
export const ROLE_HINT: Record<CallRole, string> = {
  client: '한국인 고객에게 문자로 보냅니다.',
  partner: '현지 파트너를 통해 신부 후보에게 전달합니다.',
  interpreter: '배정한 통역사에게 보냅니다.',
  agent: '배석할 직원이 이 링크로 들어옵니다.',
};

type Readiness =
  | {
      allow: true;
      requiredParticipants: CallRole[];
      serviceConfigured: boolean;
      recordingConfigured: boolean;
    }
  | { allow: false; blockers: Blocker[]; serviceConfigured: boolean; recordingConfigured: boolean };

export type CallSession = {
  callId: string;
  roomName: string;
  url: string;
  /**
   * 역할별 입장 코드. 이걸로 링크를 만들어 각자에게 보낸다.
   * 토큰을 바로 주지 않는 이유는 서버 쪽에 적어 두었다(functions/src/video/index.ts).
   */
  invites: Partial<Record<CallRole, string>>;
  /** 링크가 살아 있는 시각(밀리초) */
  expiresAt: number;
  /** 녹화가 실제로 걸렸는가. 동의만 받고 녹화가 안 되면 안 된다 */
  recording: boolean;
  recordingError: string | null;
};

export type ObligationSyncResult = {
  completed: Array<{ templateCode: string; title: string }>;
  alreadyDone: string[];
  missing: Array<{ templateCode: string; title: string; hint: string }>;
};

/**
 * 서류함에 올려 둔 증빙으로 법정의무를 한 번에 채운다.
 *
 * 서류는 이미 올리고 타임라인에 가서 또 체크하는 일을 없앤다.
 */
export async function syncObligations(matchId: string): Promise<ObligationSyncResult> {
  const call = httpsCallable<{ matchId: string }, ObligationSyncResult>(
    functions,
    'syncObligationsFromDocuments',
  );
  const { data } = await call({ matchId });
  return data;
}

export type CertificateResult =
  | { issued: true; certificateId: string; issuedAt: number }
  | { issued: false; missing: string[] };

/**
 * 신상정보 교환완료 증명서를 낸다.
 *
 * 근거가 모자라면 내주지 않고 무엇이 빠졌는지 돌려준다.
 */
export async function issueCertificate(matchId: string): Promise<CertificateResult> {
  const call = httpsCallable<{ matchId: string }, CertificateResult>(
    functions,
    'issueExchangeCertificate',
  );
  const { data } = await call({ matchId });
  return data;
}

/** 입장 코드로 만드는 주소. 받은 사람은 이 한 줄만 누르면 된다 */
export function callLinkFor(code: string): string {
  return `${window.location.origin}/call/${code}`;
}

/**
 * 지금 통화를 열 수 있는지 본다. 아무것도 만들지 않는다.
 * 맞선 건을 펼칠 때마다 한 번 묻는다 — 타임라인이 바뀌면 결과도 바뀌므로 캐시하지 않는다.
 */
export function useCallReadiness(matchId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const call = httpsCallable<{ matchId: string }, Readiness>(
        functions,
        'checkVideoCallReadiness',
      );
      const { data } = await call({ matchId });
      setState(data);
    } catch (err) {
      setError((err as { message?: string }).message ?? '통화 준비 상태를 확인하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return { state, loading, error, refresh };
}

/** 통화를 연다. 서버가 다시 한 번 게이트를 보므로 여기서 막지 않아도 안전하다 */
export async function startVideoCall(matchId: string): Promise<CallSession> {
  const call = httpsCallable<{ matchId: string }, CallSession>(functions, 'startVideoCall');
  const { data } = await call({ matchId });
  return data;
}

/** 입장 링크로 들어온 사람이 부른다. 여기서만 토큰이 나온다 */
export type JoinResult = {
  url: string;
  token: string;
  role: CallRole;
  roleLabel: string;
  room: { recording: boolean; chat: false; fileTransfer: false; screenShare: false };
};

export async function joinVideoCall(code: string): Promise<JoinResult> {
  const call = httpsCallable<{ code: string }, JoinResult>(functions, 'joinVideoCall');
  const { data } = await call({ code });
  return data;
}

export async function endVideoCall(matchId: string, callId: string) {
  const call = httpsCallable<
    { matchId: string; callId: string },
    { ok: boolean; transcriptCount: number; leaksFound: number }
  >(functions, 'endVideoCall');
  const { data } = await call({ matchId, callId });
  return data;
}
