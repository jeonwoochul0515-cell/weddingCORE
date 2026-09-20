// 영상통화 개시 판정
//
// 무엇을 정하나. 「지금 이 한국인 고객과 이 외국인 후보의 영상통화를 열어도 되는가」다.
// 열어도 되면 어떤 참가자와 어떤 설정으로 열어야 하는지까지 같이 돌려준다.
//
// 왜 떼어냈나. 이 판정이 무너지면 업체가 영업정지를 받는다. 그런데 Firestore·미디어 벤더에
// 묶어 두면 검증하려면 둘 다 띄워야 하고, 그러면 아무도 검증하지 않게 된다.
// (creditMath·orderCheck·rateLimitMath를 떼어낸 것과 같은 이유다)
//
// 그리고 하나 더. 미디어 벤더(LiveKit/Agora)는 아직 안 정해졌다. 벤더가 바뀌어도 이 판정은
// 안 바뀐다. 바뀌는 것과 안 바뀌는 것을 갈라 둬야 벤더를 갈아끼울 때 법 판단을 다시 안 한다.
//
// ─────────────────────────────────────────────────────────────
// 기술로 못 막는 것부터 적어 둔다.
//
// 영상통화 중에 종이에 번호를 적어 카메라에 비추거나 입으로 부르는 것은 **막을 수 없다.**
// 채팅·파일전송·화면공유를 끄면 쉬운 경로가 닫힐 뿐이다. 그래서 이 모듈의 목적은 차단이
// 아니라 두 가지다.
//   1) 법정의무가 덜 끝난 상태로 만남이 이뤄지는 것을 막는다 (영업정지 방지)
//   2) 무슨 일이 있었는지 증거로 남긴다 (계약 위반 청구의 근거)
//
// ─────────────────────────────────────────────────────────────
// 법적 전제 — 2026-09-19 법제처 원문 대조 (법령일련번호 281951, 2026-07-01 시행)
//
// · 법 제10조의2 : 신상정보 제공. ③ 이용자와 상대방이 이해할 수 있는 언어로 작성.
//                  ④ 제공 시기·절차·입증방법은 대통령령(시행령 제3조의2)으로.
// · 시행령 제3조의2 : 공증 인증 → 확인서 작성 → 양쪽 사실확인·제공 동의 서면 →
//                  각자 이해할 언어로 번역·제공 → **양쪽이 모두 만남에 서면 동의** →
//                  그때 만남을 주선. 이 순서가 이 모듈의 뼈대다.
// · 법 제10조의3 : 통역·번역서비스 제공 의무.
//   시행규칙 제9조의3 ① 직접 또는 통역·번역 전문업체를 이용해 제공할 수 있다.
//                    ②③ 이용자에게는 국어, 상대방에게는 상대방 국가 언어가 원칙.
//   → 자격증 요건도 이해관계인 배제 요건도 법에 없다. 다만 「제공」했다는 기록은 있어야 한다.
// · 법 제10조의4 : 기록보존. 시행규칙 제9조가 **5년**으로 정한다.
//
// ★ 미확정 : 영상통화가 시행령 제3조의2의 '만남'에 해당하는지는 아직 확인 전이다.
//   제휴 법률사무소 회신 전까지 CONSERVATIVE_POLICY(만남으로 본다)를 기본값으로 쓴다.
//   회신이 「만남이 아니다」로 오면 policy.treatAsMeeting만 false로 바꾸면 된다.

/** 타임라인 항목 중 이 판정에 필요한 것만. 저장소 형태에 기대지 않는다. */
export type ObligationState = {
  templateCode: string;
  /** 'done'만 충족으로 본다. blocked·violated는 물론 pending도 미충족이다 */
  status: string;
};

/** 통역·번역서비스를 누가 어떻게 제공하는가 (법 제10조의3, 시행규칙 제9조의3 ①) */
export type InterpretationPlan =
  /** 업체가 직접 — 사람 통역자를 붙인다 */
  | { mode: 'in_house'; interpreterId: string; active: boolean }
  /** 통역·번역 전문업체 */
  | { mode: 'vendor'; vendorName: string; contractOnFile: boolean }
  /**
   * 현지 파트너가 통역을 붙인다.
   *
   * 현장에서 가장 흔한 형태다. 통역사가 현지 에이전시 쪽 사람이고 업체가 통역료를
   * 직접 주지도 않는다(2026-09-20 현장 확인 — 하루 100달러, 현지에서 지급).
   * 그런 사람을 우리 통역자 명단에 올려 두는 건 실제와 어긋난다.
   *
   * 법으로는 이렇게 본다. 제10조의3의 제공 의무는 **국내 중개업자인 우리에게** 있고,
   * 시행규칙 제9조의3 ①은 직접 제공하거나 전문업체를 쓰는 길을 연다. 현지 파트너를
   * 통한 제공이 여기 그대로 들어맞는다고 단정하지는 않는다 — 다만 제공 의무를 지는 쪽은
   * 여전히 우리이므로, **누가 제공했는지와 그 파트너와 서면계약이 있는지**를 남긴다.
   * 서면계약은 어차피 법 제14조의2 ①이 따로 요구하는 것이기도 하다.
   */
  | { mode: 'local_partner'; partnerId: string; partnerName: string; writtenContract: boolean; active: boolean }
  /** 없음 */
  | { mode: 'none' };

/**
 * 통화에 배석하는 업체 담당자. 현장에서 「에이전트」라고 부르는 그 사람이다.
 *
 * 왜 자리를 따로 두나. 실무에서 화상맞선은 양측 둘만 하는 게 아니다. 통역과 담당자가
 * 같이 들어와 진행을 잡고, 무슨 말이 오갔는지 본다. 그 사람이 없으면 사실상 업체를
 * 거치지 않은 사적 만남이 되고, 나중에 「업체가 주선한 자리였다」고 말할 근거가 얇아진다.
 *
 * 법이 배석을 직접 요구하지는 않는다. 그래서 막는 근거를 법으로 적지 않는다
 * (녹화를 다루는 방식과 같다 — 없는 의무를 있다고 말하지 않는다).
 */
export type AgentAssignment =
  /** 배석할 직원이 정해졌다 */
  | { assigned: true; staffId: string; active: boolean }
  /** 아직 정해지지 않았다 */
  | { assigned: false };

export type CallPolicy = {
  /**
   * 영상통화를 결혼중개업법상 '만남'으로 볼 것인가.
   * true면 시행령 제3조의2의 선행 의무를 전부 요구한다.
   */
  treatAsMeeting: boolean;
  /** 녹화를 요구할 것인가. 기록보존(제10조의4)과 분쟁 대비의 핵심이다 */
  requireRecording: boolean;
  /**
   * 업체 담당자 배석을 요구할 것인가.
   * 1인 업체는 대표가 곧 담당자이므로 끄지 않아도 걸리지 않는다.
   */
  requireAgentAttendance: boolean;
};

/** 법률 회신 전 기본값. 의심스러우면 막는 쪽이다 */
export const CONSERVATIVE_POLICY: CallPolicy = {
  treatAsMeeting: true,
  requireRecording: true,
  requireAgentAttendance: true,
};

export type CallRequest = {
  /** 한국인 고객의 타임라인 상태 */
  obligations: ObligationState[];
  /**
   * 양쪽이 만남에 서면 동의했는가 (시행령 제3조의2).
   * 타임라인 의무 코드가 아직 없어 따로 받는다 — 아래 MISSING_TEMPLATE 주석 참고.
   */
  meetingConsent: { client: boolean; partner: boolean };
  interpretation: InterpretationPlan;
  /** 배석할 업체 담당자 */
  agent: AgentAssignment;
  /** 녹화 동의. 영상은 개인정보라 양쪽 동의가 따로 필요하다 */
  recordingConsent: { client: boolean; partner: boolean };
  /**
   * 국외 이전 동의. 상대방이 국내에 없으면 녹화본 보관이 국외 이전에 해당할 수 있다.
   * 상대가 국내에 있으면 null을 넣는다.
   */
  crossBorderConsent: boolean | null;
};

/**
 * 시행령 제3조의2가 만남 이전에 요구하는 것들.
 * 우리 의무 템플릿 코드와 1:1로 맞춰 둔다.
 */
export const PRE_MEETING_CODES = [
  'BG_KOR_CRIMINAL',
  'BG_KOR_INCOME',
  'BG_PARTNER_MARITAL_HISTORY',
  'BG_PARTNER_HEALTH',
  'BG_PARTNER_CRIMINAL',
  'BG_TRANSLATION',
  'BG_MUTUAL_DELIVERY',
  'BG_CERTIFICATE',
] as const;

// MISSING_TEMPLATE
// 시행령 제3조의2는 「양쪽이 모두 만남에 서면 동의」를 만남 주선의 마지막 선행 조건으로
// 두는데, 여기에 대응하는 의무 템플릿이 없다(44개 중 없음). 그래서 meetingConsent를
// 인자로 따로 받는다. 템플릿을 추가하면 기존 고객 타임라인 전개에 영향이 가므로
// 별도 작업으로 다룬다.

/** 막힌 이유 하나. 사장이 읽고 바로 무엇을 할지 알 수 있어야 한다 */
export type Blocker = {
  /** 화면에서 묶어 보여주기 위한 분류 */
  kind: 'obligation' | 'consent' | 'interpretation' | 'agent' | 'recording' | 'privacy';
  /** 무엇이 막혔는지 */
  reason: string;
  /** 무엇을 하면 풀리는지 */
  remedy: string;
  /** 왜 필요한지. 근거 없는 요구는 하지 않는다 */
  legalBasis: string;
};

export type CallVerdict =
  | {
      allow: true;
      /** 방에 반드시 들어와야 하는 역할 */
      requiredParticipants: Array<'client' | 'partner' | 'interpreter' | 'agent'>;
      /** 방 설정. 쉬운 연락처 교환 경로를 닫는다 */
      room: {
        recording: boolean;
        chat: false;
        fileTransfer: false;
        screenShare: false;
      };
    }
  | { allow: false; blockers: Blocker[] };

const DONE = 'done';

/** 의무 코드 → 사장이 읽는 이름. 코드만 보여주면 무엇을 하라는지 모른다 */
const OBLIGATION_LABEL: Record<string, string> = {
  BG_KOR_CRIMINAL: '한국인 측 범죄경력 서면제공',
  BG_KOR_INCOME: '한국인 측 직업·소득·재산 서면제공',
  BG_PARTNER_MARITAL_HISTORY: '외국인 측 혼인경력 확인',
  BG_PARTNER_HEALTH: '외국인 측 건강상태 확인',
  BG_PARTNER_CRIMINAL: '외국인 측 범죄경력 확인',
  BG_TRANSLATION: '신상정보 모국어 번역',
  BG_MUTUAL_DELIVERY: '상호 서면제공 및 수령확인',
  BG_CERTIFICATE: '신상정보 교환완료 증명서',
};

/**
 * 통화를 열어도 되는지 판정한다.
 *
 * 막을 이유가 하나라도 있으면 전부 모아서 돌려준다 — 하나씩 고치고 다시 누르게 하면
 * 사장이 몇 번을 헛걸음한다.
 */
export function evaluateCallRequest(
  request: CallRequest,
  policy: CallPolicy = CONSERVATIVE_POLICY,
): CallVerdict {
  const blockers: Blocker[] = [];
  const done = new Set(
    request.obligations.filter((item) => item.status === DONE).map((item) => item.templateCode),
  );

  if (policy.treatAsMeeting) {
    for (const code of PRE_MEETING_CODES) {
      if (done.has(code)) continue;
      blockers.push({
        kind: 'obligation',
        reason: `${OBLIGATION_LABEL[code] ?? code}가 끝나지 않았습니다.`,
        remedy: '고객 상세 화면의 법정의무 타임라인에서 해당 항목을 완료해 주세요.',
        legalBasis: '결혼중개업법 제10조의2, 시행령 제3조의2',
      });
    }

    // 만남 동의는 시행령이 정한 마지막 선행 조건이다. 한쪽만 동의해도 안 된다.
    if (!request.meetingConsent.client) {
      blockers.push({
        kind: 'consent',
        reason: '한국인 고객의 만남 서면 동의가 없습니다.',
        remedy: '만남 동의서를 받아 등록해 주세요.',
        legalBasis: '시행령 제3조의2 (양쪽이 모두 만남에 서면 동의한 경우에만 주선)',
      });
    }
    if (!request.meetingConsent.partner) {
      blockers.push({
        kind: 'consent',
        reason: '외국인 후보의 만남 서면 동의가 없습니다.',
        remedy: '현지 파트너를 통해 만남 동의서를 받아 등록해 주세요.',
        legalBasis: '시행령 제3조의2 (양쪽이 모두 만남에 서면 동의한 경우에만 주선)',
      });
    }
  }

  // 통역·번역서비스는 만남 여부와 무관하게 필요하다.
  // 법 제10조의3은 「이용자와 상대방 간의 원활한 의사소통 지원」을 요구하고, 영상통화는
  // 정확히 그 의사소통이다. 자격은 안 따지지만 제공은 해야 한다.
  const plan = request.interpretation;
  if (plan.mode === 'none') {
    blockers.push({
      kind: 'interpretation',
      reason: '통역·번역서비스 제공 계획이 없습니다.',
      remedy: '사무소 화면에서 통역자를 배정하거나 통역·번역 전문업체를 지정해 주세요.',
      legalBasis: '결혼중개업법 제10조의3, 시행규칙 제9조의3 ①',
    });
  } else if (plan.mode === 'in_house' && !plan.active) {
    blockers.push({
      kind: 'interpretation',
      reason: '배정한 통역자가 비활성 상태입니다.',
      remedy: '활성 통역자를 배정하거나 전문업체로 바꿔 주세요.',
      legalBasis: '결혼중개업법 제10조의3',
    });
  } else if (plan.mode === 'local_partner' && !plan.active) {
    blockers.push({
      kind: 'interpretation',
      reason: `통역을 맡기기로 한 현지 파트너(${plan.partnerName})가 거래 중단 상태입니다.`,
      remedy: '활성 파트너로 바꾸거나 다른 통역 방법을 정해 주세요.',
      legalBasis: '결혼중개업법 제10조의3',
    });
  } else if (plan.mode === 'local_partner' && !plan.writtenContract) {
    blockers.push({
      kind: 'interpretation',
      reason: `현지 파트너(${plan.partnerName})와 서면계약이 없습니다.`,
      remedy: '업체 정보 화면의 「현지 파트너」에서 서면계약 체결을 표시하고 계약서를 보관해 주세요.',
      // 서면계약은 통역 여부와 무관하게 그 자체로 의무다. 통역까지 맡긴다면 더더욱 있어야 한다.
      legalBasis: '결혼중개업법 제14조의2 ① (현지 중개업자와 서면계약), 제10조의3',
    });
  } else if (plan.mode === 'vendor' && !plan.contractOnFile) {
    blockers.push({
      kind: 'interpretation',
      reason: `통역 전문업체(${plan.vendorName}) 계약 증빙이 없습니다.`,
      remedy: '계약서 또는 거래 증빙을 등록해 주세요. 제공 사실을 입증할 자료가 됩니다.',
      legalBasis: '결혼중개업법 제10조의3, 시행규칙 제9조의3 ①',
    });
  }

  // 담당자 배석. 통역과 함께 들어와 진행을 잡는 사람이다.
  if (policy.requireAgentAttendance) {
    if (!request.agent.assigned) {
      blockers.push({
        kind: 'agent',
        reason: '통화에 배석할 담당 직원이 정해지지 않았습니다.',
        remedy: '맞선 건에서 담당 직원을 지정해 주세요. 통역과 함께 통화에 들어옵니다.',
        legalBasis:
          '법이 배석을 직접 요구하지는 않습니다. 업체가 주선한 자리라는 기록을 남기기 위한 운영 정책입니다.',
      });
    } else if (!request.agent.active) {
      blockers.push({
        kind: 'agent',
        reason: '배정한 담당 직원이 퇴사했거나 비활성 상태입니다.',
        remedy: '현재 근무 중인 직원으로 다시 지정해 주세요.',
        legalBasis: '업체 운영 정책',
      });
    }
  }

  if (policy.requireRecording) {
    // 녹화는 법이 직접 요구하는 것이 아니라 우리 정책이다.
    // 근거를 법으로 적지 않는다 — 없는 의무를 있다고 말하지 않기 위해서다.
    if (!request.recordingConsent.client || !request.recordingConsent.partner) {
      const who = !request.recordingConsent.client ? '한국인 고객' : '외국인 후보';
      blockers.push({
        kind: 'recording',
        reason: `${who}의 녹화 동의가 없습니다.`,
        remedy: '녹화 목적과 보관기간을 설명하고 동의를 받아 주세요.',
        legalBasis: '개인정보보호법 (영상정보 수집·이용 동의). 녹화는 우리 운영 정책입니다.',
      });
    }
    // 상대가 국외에 있으면 녹화본 보관이 국외 이전이 될 수 있다.
    if (request.crossBorderConsent === false) {
      blockers.push({
        kind: 'privacy',
        reason: '개인정보 국외 이전 동의가 없습니다.',
        remedy: '상대방에게 국외 이전 동의를 받아 주세요.',
        legalBasis: '개인정보보호법 (국외 이전 별도 동의)',
      });
    }
  }

  if (blockers.length > 0) return { allow: false, blockers };

  return {
    allow: true,
    // 통역자는 필수다. 법 때문만이 아니라, 통역 없이 대화가 되면 둘이 직접 연락해도
    // 대화가 된다는 뜻이라 업체를 거치게 하려는 목적 자체가 무너진다.
    // 담당자도 같은 이유로 들어온다. 넷이 각자 자기 자리에서 접속한다.
    requiredParticipants: [
      'client',
      'partner',
      // 사람이 통화에 들어오는 두 경우에만 자리를 잡는다. 전문업체는 전화통역처럼
      // 화면 밖에서 제공될 수 있어 참가를 강제하지 않는다(기존 판단 유지).
      ...(plan.mode === 'in_house' || plan.mode === 'local_partner'
        ? (['interpreter'] as const)
        : []),
      ...(policy.requireAgentAttendance ? (['agent'] as const) : []),
    ],
    room: {
      recording: policy.requireRecording,
      // 쉬운 연락처 교환 경로는 닫는다. 입으로 부르는 것까지는 못 막는다(파일 머리 참고).
      chat: false,
      fileTransfer: false,
      screenShare: false,
    },
  };
}
