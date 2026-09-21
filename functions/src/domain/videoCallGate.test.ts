// 영상통화 개시 판정 검증 — 의무가 덜 끝난 만남을 막는다
import { describe, expect, it } from 'vitest';
import {
  CONSERVATIVE_POLICY,
  evaluateCallRequest,
  type CallRequest,
  type ObligationState,
} from './videoCallGate.js';

const ALL_CODES = [
  'BG_KOR_CRIMINAL',
  'BG_KOR_INCOME',
  'BG_PARTNER_MARITAL_HISTORY',
  'BG_PARTNER_HEALTH',
  'BG_PARTNER_CRIMINAL',
  'BG_TRANSLATION',
  'BG_MUTUAL_DELIVERY',
  'BG_CERTIFICATE',
];

const allDone = (): ObligationState[] =>
  ALL_CODES.map((templateCode) => ({ templateCode, status: 'done' }));

/** 전부 통과하는 요청. 각 시험은 여기서 하나씩만 무너뜨린다 */
const ready = (over: Partial<CallRequest> = {}): CallRequest => ({
  obligations: allDone(),
  meetingConsent: { client: true, partner: true },
  interpretation: { mode: 'in_house', interpreterId: 'itp_1', active: true },
  agent: { assigned: true, staffId: 'stf_1', active: true },
  recordingConsent: { client: true, partner: true },
  crossBorderConsent: true,
  ...over,
});

const reasons = (r: ReturnType<typeof evaluateCallRequest>) =>
  r.allow ? [] : r.blockers.map((b) => b.reason);

describe('evaluateCallRequest — 통과', () => {
  it('전부 갖추면 통화를 연다', () => {
    const v = evaluateCallRequest(ready());
    expect(v.allow).toBe(true);
  });

  it('통역자를 붙이면 참가자 셋이 필수다 — 통역 없이 대화되면 직접 연락을 막을 수 없다', () => {
    const v = evaluateCallRequest(ready());
    if (!v.allow) throw new Error('통과해야 한다');
    expect(v.requiredParticipants).toEqual(['client', 'partner', 'interpreter', 'agent']);
  });

  it('채팅·파일전송·화면공유는 언제나 꺼진다 — 쉬운 연락처 교환 경로', () => {
    const v = evaluateCallRequest(ready());
    if (!v.allow) throw new Error('통과해야 한다');
    expect(v.room).toMatchObject({ chat: false, fileTransfer: false, screenShare: false });
    expect(v.room.recording).toBe(true);
  });

  it('전문업체를 쓰면 통역자 참가는 요구하지 않는다 (시행규칙 제9조의3 ①)', () => {
    const v = evaluateCallRequest(
      ready({ interpretation: { mode: 'vendor', vendorName: 'A통번역', contractOnFile: true } }),
    );
    if (!v.allow) throw new Error('통과해야 한다');
    expect(v.requiredParticipants).toEqual(['client', 'partner', 'agent']);
  });

  it('상대가 국내에 있으면(null) 국외 이전 동의를 묻지 않는다', () => {
    expect(evaluateCallRequest(ready({ crossBorderConsent: null })).allow).toBe(true);
  });
});

describe('evaluateCallRequest — 법정의무 게이트', () => {
  it('신상정보 의무가 하나라도 남으면 막는다', () => {
    const obligations = allDone().map((o) =>
      o.templateCode === 'BG_TRANSLATION' ? { ...o, status: 'pending' } : o,
    );
    const v = evaluateCallRequest(ready({ obligations }));
    expect(v.allow).toBe(false);
    expect(reasons(v)).toContain('신상정보 모국어 번역가 끝나지 않았습니다.');
  });

  it('done이 아닌 상태는 전부 미충족이다 — violated도 blocked도 통과시키지 않는다', () => {
    for (const status of ['pending', 'in_progress', 'warning', 'violated', 'blocked']) {
      const obligations = allDone().map((o) =>
        o.templateCode === 'BG_CERTIFICATE' ? { ...o, status } : o,
      );
      expect(evaluateCallRequest(ready({ obligations })).allow).toBe(false);
    }
  });

  it('의무 기록이 통째로 없으면 8건 전부를 막을 이유로 돌려준다', () => {
    const v = evaluateCallRequest(ready({ obligations: [] }));
    expect(v.allow).toBe(false);
    if (v.allow) return;
    expect(v.blockers.filter((b) => b.kind === 'obligation')).toHaveLength(ALL_CODES.length);
  });

  it('막을 이유를 한 번에 모아 돌려준다 — 하나씩 고치고 다시 누르게 하지 않는다', () => {
    const v = evaluateCallRequest(
      ready({
        obligations: [],
        meetingConsent: { client: false, partner: false },
        interpretation: { mode: 'none' },
        recordingConsent: { client: false, partner: false },
      }),
    );
    expect(v.allow).toBe(false);
    if (v.allow) return;
    const kinds = new Set(v.blockers.map((b) => b.kind));
    expect(kinds).toEqual(new Set(['obligation', 'consent', 'interpretation', 'recording']));
  });

  it('막을 이유에는 무엇을 하면 풀리는지와 근거가 같이 온다', () => {
    const v = evaluateCallRequest(ready({ interpretation: { mode: 'none' } }));
    expect(v.allow).toBe(false);
    if (v.allow) return;
    for (const b of v.blockers) {
      expect(b.remedy.length).toBeGreaterThan(0);
      expect(b.legalBasis.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateCallRequest — 만남 서면 동의 (시행령 제3조의2)', () => {
  it('한쪽만 동의하면 막는다', () => {
    const v = evaluateCallRequest(ready({ meetingConsent: { client: true, partner: false } }));
    expect(v.allow).toBe(false);
    expect(reasons(v)).toContain('외국인 후보의 만남 서면 동의가 없습니다.');
  });

  it('양쪽 다 없으면 두 건을 막을 이유로 돌려준다', () => {
    const v = evaluateCallRequest(ready({ meetingConsent: { client: false, partner: false } }));
    if (v.allow) throw new Error('막아야 한다');
    expect(v.blockers.filter((b) => b.kind === 'consent')).toHaveLength(2);
  });
});

describe('evaluateCallRequest — 통역·번역서비스 (법 제10조의3)', () => {
  it('제공 계획이 없으면 막는다', () => {
    const v = evaluateCallRequest(ready({ interpretation: { mode: 'none' } }));
    expect(reasons(v)).toContain('통역·번역서비스 제공 계획이 없습니다.');
  });

  it('비활성 통역자는 배정으로 치지 않는다', () => {
    const v = evaluateCallRequest(
      ready({ interpretation: { mode: 'in_house', interpreterId: 'itp_1', active: false } }),
    );
    expect(v.allow).toBe(false);
  });

  it('전문업체는 계약 증빙이 있어야 한다 — 제공 사실을 입증할 자료다', () => {
    const v = evaluateCallRequest(
      ready({ interpretation: { mode: 'vendor', vendorName: 'A통번역', contractOnFile: false } }),
    );
    expect(v.allow).toBe(false);
    expect(reasons(v)[0]).toContain('A통번역');
  });

  it('자격증을 요구하지 않는다 — 법에 없는 요건이다', () => {
    // 통역자 정보에 자격 필드가 아예 없어도 통과해야 한다.
    const v = evaluateCallRequest(
      ready({ interpretation: { mode: 'in_house', interpreterId: 'itp_x', active: true } }),
    );
    expect(v.allow).toBe(true);
  });

  it('현지 파트너가 통역을 붙여도 된다 — 통역사는 대개 현지 에이전시 사람이다', () => {
    const v = evaluateCallRequest(
      ready({
        interpretation: {
          mode: 'local_partner',
          partnerId: 'lp_1',
          partnerName: '하노이A',
          writtenContract: true,
          active: true,
        },
      }),
    );
    expect(v.allow).toBe(true);
    if (!v.allow) return;
    // 사람이 들어오므로 통역 자리를 잡는다.
    expect(v.requiredParticipants).toContain('interpreter');
  });

  it('현지 파트너에 통역을 맡기려면 서면계약이 있어야 한다', () => {
    const v = evaluateCallRequest(
      ready({
        interpretation: {
          mode: 'local_partner',
          partnerId: 'lp_1',
          partnerName: '하노이A',
          writtenContract: false,
          active: true,
        },
      }),
    );
    expect(v.allow).toBe(false);
    expect(reasons(v)[0]).toContain('하노이A');
  });

  it('거래 중단한 현지 파트너는 배정으로 치지 않는다', () => {
    const v = evaluateCallRequest(
      ready({
        interpretation: {
          mode: 'local_partner',
          partnerId: 'lp_1',
          partnerName: '하노이A',
          writtenContract: true,
          active: false,
        },
      }),
    );
    expect(v.allow).toBe(false);
  });

  it('만남이 아니라고 보더라도 통역·번역서비스는 여전히 필요하다', () => {
    // 제10조의3은 '만남'을 전제하지 않는다. 의사소통이 있으면 적용된다.
    const v = evaluateCallRequest(ready({ obligations: [], interpretation: { mode: 'none' } }), {
      treatAsMeeting: false,
      requireRecording: false,
      requireAgentAttendance: true,
    });
    expect(v.allow).toBe(false);
    expect(reasons(v)).toEqual(['통역·번역서비스 제공 계획이 없습니다.']);
  });
});

describe('evaluateCallRequest — 담당자 배석', () => {
  it('배석할 직원이 없으면 막는다', () => {
    const v = evaluateCallRequest(ready({ agent: { assigned: false } }));
    expect(v.allow).toBe(false);
    expect(reasons(v)).toContain('통화에 배석할 담당 직원이 정해지지 않았습니다.');
  });

  it('퇴사한 직원은 배정으로 치지 않는다', () => {
    const v = evaluateCallRequest(
      ready({ agent: { assigned: true, staffId: 'stf_1', active: false } }),
    );
    expect(v.allow).toBe(false);
    expect(v.allow || v.blockers.some((b) => b.kind === 'agent')).toBe(true);
  });

  it('배석 요구의 근거를 법정의무로 적지 않는다 — 법에 없는 요건이다', () => {
    const v = evaluateCallRequest(ready({ agent: { assigned: false } }));
    if (v.allow) throw new Error('막아야 한다');
    const b = v.blockers.find((x) => x.kind === 'agent')!;
    expect(b.legalBasis).toContain('운영 정책');
    expect(b.legalBasis).not.toContain('제10조');
  });

  it('배석 요구를 끄면 담당자 없이도 열리고 참가자에서도 빠진다', () => {
    const v = evaluateCallRequest(ready({ agent: { assigned: false } }), {
      treatAsMeeting: true,
      requireRecording: true,
      requireAgentAttendance: false,
    });
    expect(v.allow).toBe(true);
    if (!v.allow) return;
    expect(v.requiredParticipants).not.toContain('agent');
  });

  it('담당자와 통역은 각자 접속한다 — 한 자리를 나눠 쓰지 않는다', () => {
    const v = evaluateCallRequest(ready());
    if (!v.allow) throw new Error('통과해야 한다');
    // 역할이 따로 잡혀야 입장 링크도 따로 나가고 누가 들어왔는지 가릴 수 있다.
    expect(new Set(v.requiredParticipants).size).toBe(v.requiredParticipants.length);
    expect(v.requiredParticipants).toContain('interpreter');
    expect(v.requiredParticipants).toContain('agent');
  });
});

describe('evaluateCallRequest — 녹화와 개인정보', () => {
  it('녹화 동의가 한쪽이라도 없으면 막는다', () => {
    const v = evaluateCallRequest(ready({ recordingConsent: { client: true, partner: false } }));
    expect(v.allow).toBe(false);
    expect(reasons(v)).toContain('외국인 후보의 녹화 동의가 없습니다.');
  });

  it('국외 이전 동의를 거부하면 막는다', () => {
    const v = evaluateCallRequest(ready({ crossBorderConsent: false }));
    expect(v.allow).toBe(false);
    expect(reasons(v)).toContain('개인정보 국외 이전 동의가 없습니다.');
  });

  it('녹화 요구를 끄면 녹화·국외이전 동의를 묻지 않는다', () => {
    const v = evaluateCallRequest(
      ready({ recordingConsent: { client: false, partner: false }, crossBorderConsent: false }),
      { treatAsMeeting: true, requireRecording: false, requireAgentAttendance: true },
    );
    expect(v.allow).toBe(true);
    if (!v.allow) return;
    expect(v.room.recording).toBe(false);
  });

  it('녹화 요구의 근거를 법정의무로 적지 않는다 — 없는 의무를 있다고 말하지 않는다', () => {
    const v = evaluateCallRequest(ready({ recordingConsent: { client: false, partner: true } }));
    if (v.allow) throw new Error('막아야 한다');
    const b = v.blockers.find((x) => x.kind === 'recording')!;
    expect(b.legalBasis).toContain('우리 운영 정책');
    expect(b.legalBasis).not.toContain('결혼중개업법');
  });
});

// ── 직접 만나는 자리 ────────────────────────
//
// 이 제품의 코어는 「사이트대로 하면 법에 어긋나지 않는다」이다. 그러려면 문이
// 한 군데만 있으면 안 된다. 법은 온라인과 오프라인을 가르지 않으므로,
// 현지에 나가 직접 만나는 약속도 같은 판정을 받는다. 다른 것은 녹화뿐이다.
describe('직접 만남 정책 — 녹화만 빠지고 나머지는 같다', () => {
  const OFFLINE = {
    treatAsMeeting: true,
    requireRecording: false,
    requireAgentAttendance: true,
  } as const;

  it('★ 신상정보 의무를 그대로 본다 — 현지에 나가 만나는 것이 더 무거운 만남이다', () => {
    const v = evaluateCallRequest(ready({ obligations: [] }), OFFLINE);
    expect(v.allow).toBe(false);
    if (!v.allow) {
      expect(v.blockers.some((b) => b.kind === 'obligation')).toBe(true);
    }
  });

  it('★ 양측 만남 동의도 그대로 본다', () => {
    const v = evaluateCallRequest(
      ready({ meetingConsent: { client: true, partner: false } }),
      OFFLINE,
    );
    expect(v.allow).toBe(false);
    if (!v.allow) {
      expect(v.blockers.some((b) => b.kind === 'consent')).toBe(true);
    }
  });

  it('통역 제공도 그대로 본다 — 말이 안 통하는 자리를 만들어 주면 안 된다', () => {
    const v = evaluateCallRequest(ready({ interpretation: { mode: 'none' } }), OFFLINE);
    expect(v.allow).toBe(false);
    if (!v.allow) {
      expect(v.blockers.some((b) => b.kind === 'interpretation')).toBe(true);
    }
  });

  it('담당자 동행도 그대로 본다 — 손님 혼자 현지에 보내지 않는다', () => {
    const v = evaluateCallRequest(ready({ agent: { assigned: false } }), OFFLINE);
    expect(v.allow).toBe(false);
    if (!v.allow) {
      expect(v.blockers.some((b) => b.kind === 'agent')).toBe(true);
    }
  });

  it('★ 녹화 동의는 묻지 않는다 — 호텔 로비에서 만나는 자리를 녹화할 방법도 근거도 없다', () => {
    const v = evaluateCallRequest(
      ready({
        recordingConsent: { client: false, partner: false },
        crossBorderConsent: false,
      }),
      OFFLINE,
    );
    expect(v.allow).toBe(true);
  });

  it('다 갖췔으면 통과하고 방 설정에 녹화가 꺼져 있다', () => {
    const v = evaluateCallRequest(ready({}), OFFLINE);
    expect(v.allow).toBe(true);
    if (v.allow) expect(v.room.recording).toBe(false);
  });
});

describe('evaluateCallRequest — 정책 전환', () => {
  it('기본값은 보수적이다 — 법률 회신 전까지 만남으로 본다', () => {
    expect(CONSERVATIVE_POLICY).toEqual({
      treatAsMeeting: true,
      requireRecording: true,
      requireAgentAttendance: true,
    });
  });

  it('만남이 아니라고 보면 신상정보·만남동의 게이트가 풀린다', () => {
    const v = evaluateCallRequest(
      ready({ obligations: [], meetingConsent: { client: false, partner: false } }),
      { treatAsMeeting: false, requireRecording: true, requireAgentAttendance: true },
    );
    expect(v.allow).toBe(true);
  });

  it('정책을 안 넘기면 보수적 기본값이 걸린다', () => {
    const bare = ready({ obligations: [] });
    expect(evaluateCallRequest(bare).allow).toBe(false);
  });
});
