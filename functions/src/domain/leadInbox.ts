// 웨딩코어 자체 상담(하람 대화·문의)을 중앙 접수함(lead-inbox)에 넘길 때 쓰는 순수 계산 — 보낼 값과 비상 문자 판단
//
// 접수 알림 문자 규칙(2026-09-24 대표 결정): 문자는 중앙 접수함이 한 틀로 만들어 보낸다.
// 우리는 정보만 넘기고, 접수함 응답의 alert 값을 보고 비상 문자를 보낼지 정한다.
//   · queued(접수함이 보냄) / skipped(보낼 일 아님) → 우리는 보내지 않는다.
//   · off(접수함이 못 보냄)·응답 없음·비정상 응답 → 종전 문자를 비상용으로 보낸다(접수 누락 방지).

export type InboxLeadInput = {
  name: string;
  phone: string;
  /** 대화 전달에 동의한 건의 대화 전문. 미동의면 빈 문자열 */
  transcript: string;
  shareChat: boolean;
  page: string;
  /** liveSessions 문서 id. 저장에 실패했으면 null */
  sessionId: string | null;
  /** 저장에 실패해 접수함 기록이 유일할 때 true */
  storeFailed: boolean;
  /** 이 사이트 알림을 받는 번호(종전 수신 번호 그대로) */
  alertTo: string;
};

export type InboxPayload = {
  site: string;
  name: string;
  phone: string;
  detail: string;
  source: string;
  intent: string;
  alertTo: string;
  extKey?: string;
};

export function buildInboxPayload(input: InboxLeadInput): InboxPayload {
  const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
  const page = oneLine(input.page).slice(0, 120);
  const detail = [
    input.storeFailed ? '[주의] weddingCORE 저장 실패 — 이 기록이 유일합니다.' : '',
    input.shareChat && input.transcript.trim()
      ? input.transcript.trim()
      : '대화 전달 미동의 — 성함·연락처만 받았습니다. 대화 내용은 첫 통화에서 여쭤야 합니다.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const payload: InboxPayload = {
    site: 'weddingCORE',
    name: oneLine(input.name).slice(0, 40),
    phone: input.phone.replace(/\D/g, ''),
    detail,
    source: `weddingcore.net 하람 상담${page ? ` · ${page}` : ''}`,
    intent: `대화전달 ${input.shareChat ? '동의' : '미동의'}`,
    alertTo: input.alertTo.replace(/[^0-9,]/g, ''),
  };
  // 같은 접수가 두 번 들어와도 접수함에 한 줄로 남게 한다. 세션이 없으면 매번 새 줄이다.
  if (input.sessionId) payload.extKey = `weddingCORE:${input.sessionId}`;
  return payload;
}

/** 접수함 응답의 alert 값으로 비상 문자를 보낼지 정한다. 응답을 못 받았으면 null을 넘긴다. */
export function needsFallbackSms(alert: string | null | undefined): boolean {
  return alert !== 'queued' && alert !== 'skipped';
}
