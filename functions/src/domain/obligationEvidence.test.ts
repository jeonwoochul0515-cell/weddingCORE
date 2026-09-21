import { describe, it, expect } from 'vitest';
import {
  deliverySatisfied,
  obligationsFor,
  planObligationSync,
  translationSatisfied,
  type EvidenceDoc,
  type TimelineRow,
} from './obligationEvidence.js';

const REQUIRED = [
  'BG_KOR_CRIMINAL',
  'BG_KOR_INCOME',
  'BG_PARTNER_MARITAL_HISTORY',
  'BG_PARTNER_HEALTH',
  'BG_PARTNER_CRIMINAL',
  'BG_TRANSLATION',
  'BG_MUTUAL_DELIVERY',
  'BG_CERTIFICATE',
];

function row(code: string, status = 'pending'): TimelineRow {
  return { id: `t_${code}`, templateCode: code, status, evidenceDocIds: [] };
}

const TIMELINE = REQUIRED.map((c) => row(c));

describe('obligationsFor — 서류 한 장이 채우는 의무', () => {
  it('한국인 범죄경력 증명서는 한국인 쪽만 채운다', () => {
    expect(obligationsFor({ docId: 'd1', type: 'criminal_record', subject: 'korean' })).toEqual([
      'BG_KOR_CRIMINAL',
    ]);
  });

  it('외국인 범죄경력 증명서는 외국인 쪽만 채운다', () => {
    expect(obligationsFor({ docId: 'd1', type: 'criminal_record', subject: 'partner' })).toEqual([
      'BG_PARTNER_CRIMINAL',
    ]);
  });

  it('양쪽이 함께 적힌 서식은 둘 다 채운다', () => {
    expect(obligationsFor({ docId: 'd1', type: 'criminal_record', subject: 'both' })).toEqual([
      'BG_KOR_CRIMINAL',
      'BG_PARTNER_CRIMINAL',
    ]);
  });

  it('소득 증빙은 한국인 의무만 있다 — 외국인 것으로 올려도 채우지 않는다', () => {
    expect(obligationsFor({ docId: 'd1', type: 'income_proof', subject: 'korean' })).toEqual([
      'BG_KOR_INCOME',
    ]);
    expect(obligationsFor({ docId: 'd1', type: 'income_proof', subject: 'partner' })).toEqual([]);
  });

  it('신상정보 확인서는 양쪽이 주고받았을 때만 상호 제공이 된다', () => {
    expect(obligationsFor({ docId: 'd1', type: 'background_info', subject: 'both' })).toEqual([
      'BG_MUTUAL_DELIVERY',
    ]);
    expect(obligationsFor({ docId: 'd1', type: 'background_info', subject: 'korean' })).toEqual([]);
  });

  it('계약서는 서면계약 의무를 채운다 (법 제10조 ①)', () => {
    expect(obligationsFor({ docId: 'd1', type: 'contract', subject: 'both' })).toEqual([
      'CONTRACT_WRITTEN',
    ]);
  });

  it('★ 여권과 기타 서류는 아무 의무도 채우지 않는다', () => {
    // 중요한 서류지만 제10조의의 가 말하는 신상정보가 아니다.
    // 채운 것으로 만들면 아무도 다시 안 본다.
    expect(obligationsFor({ docId: 'd1', type: 'passport', subject: 'partner' })).toEqual([]);
    expect(obligationsFor({ docId: 'd1', type: 'other', subject: 'both' })).toEqual([]);
  });
});

describe('planObligationSync', () => {
  it('서류가 없으면 채울 것도 없고 전부 남는다', () => {
    const plan = planObligationSync([], TIMELINE, REQUIRED);
    expect(plan.complete).toEqual([]);
    expect(plan.missing).toEqual(REQUIRED);
  });

  it('올라온 서류만큼 채우고 나머지는 남긴다', () => {
    const docs: EvidenceDoc[] = [
      { docId: 'd1', type: 'criminal_record', subject: 'korean' },
      { docId: 'd2', type: 'health_cert', subject: 'partner' },
    ];
    const plan = planObligationSync(docs, TIMELINE, REQUIRED);
    expect(plan.complete.map((c) => c.templateCode)).toEqual([
      'BG_KOR_CRIMINAL',
      'BG_PARTNER_HEALTH',
    ]);
    expect(plan.missing).toContain('BG_PARTNER_CRIMINAL');
    expect(plan.missing).not.toContain('BG_KOR_CRIMINAL');
  });

  it('어느 서류로 채웠는지 남긴다 — 나중에 근거를 되짚는다', () => {
    const plan = planObligationSync(
      [{ docId: 'doc-abc', type: 'criminal_record', subject: 'korean' }],
      TIMELINE,
      REQUIRED,
    );
    expect(plan.complete[0].docId).toBe('doc-abc');
    expect(plan.complete[0].itemId).toBe('t_BG_KOR_CRIMINAL');
  });

  it('이미 끝난 항목은 건드리지 않는다', () => {
    const timeline = TIMELINE.map((r) =>
      r.templateCode === 'BG_KOR_CRIMINAL' ? { ...r, status: 'done' } : r,
    );
    const plan = planObligationSync(
      [{ docId: 'd1', type: 'criminal_record', subject: 'korean' }],
      timeline,
      REQUIRED,
    );
    expect(plan.complete).toEqual([]);
    expect(plan.alreadyDone).toEqual(['BG_KOR_CRIMINAL']);
    expect(plan.missing).not.toContain('BG_KOR_CRIMINAL');
  });

  it('같은 의무를 채우는 서류가 여럿이면 한 장만 쓴다', () => {
    const docs: EvidenceDoc[] = [
      { docId: 'old', type: 'criminal_record', subject: 'korean' },
      { docId: 'new', type: 'criminal_record', subject: 'korean' },
    ];
    const plan = planObligationSync(docs, TIMELINE, REQUIRED);
    expect(plan.complete).toHaveLength(1);
    expect(plan.complete[0].docId).toBe('old');
  });

  it('★ 통화에 필요 없는 의무는 서류가 있어도 건드리지 않는다', () => {
    // BG_KOR_HEALTH 는 이 통화의 필수 목록에 없다. 서류가 있다고 임의로
    // 완료시키면 나중에 누가 확인한 것인지 알 수 없다.
    const timeline = [...TIMELINE, row('BG_KOR_HEALTH')];
    const plan = planObligationSync(
      [{ docId: 'd1', type: 'health_cert', subject: 'both' }],
      timeline,
      REQUIRED,
    );
    expect(plan.complete.map((c) => c.templateCode)).toEqual(['BG_PARTNER_HEALTH']);
  });

  it('타임라인에 없는 의무는 만들지 않는다', () => {
    const plan = planObligationSync(
      [{ docId: 'd1', type: 'criminal_record', subject: 'korean' }],
      [],
      REQUIRED,
    );
    expect(plan.complete).toEqual([]);
    expect(plan.missing).toEqual(REQUIRED);
  });

  it('서류로는 절대 안 채워지는 의무가 남는다', () => {
    // 번역·교환완료 증명서는 서류를 받는 일이 아니라 우리가 하는 일이다.
    // 번역·교환완료 증명서는 서류를 받는 일이 아니라 우리가 하는 일이다.
    const docs: EvidenceDoc[] = [
      { docId: 'd1', type: 'criminal_record', subject: 'both' },
      { docId: 'd2', type: 'health_cert', subject: 'partner' },
      { docId: 'd3', type: 'income_proof', subject: 'korean' },
      { docId: 'd4', type: 'marital_cert', subject: 'partner' },
      { docId: 'd5', type: 'background_info', subject: 'both' },
    ];
    const plan = planObligationSync(docs, TIMELINE, REQUIRED);
    expect(plan.missing).toEqual(['BG_TRANSLATION', 'BG_CERTIFICATE']);
  });
});

describe('translationSatisfied — 모국어 번역', () => {
  const both = [
    { infoId: 'i1', subject: 'korean' as const, lang: 'lo', signed: true },
    { infoId: 'i2', subject: 'partner' as const, lang: 'ko', signed: true },
  ];

  it('양쪽이 서명까지 끝나야 채워진다', () => {
    expect(translationSatisfied(both, 'lo')).toBe(true);
  });

  it('★ 서명이 없으면 안 된다 — 만들어 놓기만 한 번역은 확인된 것이 아니다', () => {
    const draft = both.map((t) => ({ ...t, signed: false }));
    expect(translationSatisfied(draft, 'lo')).toBe(false);
  });

  it('한국인 신상정보만 번역했으면 안 된다', () => {
    expect(translationSatisfied([both[0]!], 'lo')).toBe(false);
  });

  it('후보 신상정보만 번역했으면 안 된다', () => {
    expect(translationSatisfied([both[1]!], 'lo')).toBe(false);
  });

  it('엉뚱한 언어로 번역했으면 안 된다 — 라오스 후보에게 베트남어를 주면 못 읽는다', () => {
    expect(translationSatisfied(both, 'vi')).toBe(false);
  });

  it('후보 언어를 모르면 판단하지 않는다', () => {
    expect(translationSatisfied(both, '')).toBe(false);
  });
});

describe('deliverySatisfied — 상호 제공', () => {
  const full = [
    { infoId: 'i1', to: 'partner' as const, receiptConfirmed: true, explained: true },
    { infoId: 'i2', to: 'korean' as const, receiptConfirmed: true, explained: true },
  ];

  it('양방향으로 건네고 확인받고 설명했으면 채워진다', () => {
    expect(deliverySatisfied(full)).toBe(true);
  });

  it('한쪽에만 건넘으면 「상호」가 아니다', () => {
    expect(deliverySatisfied([full[0]!])).toBe(false);
  });

  it('★ 수령 확인이 없으면 안 된다 — 보냈다는 것과 받았다는 것은 다르다', () => {
    const noReceipt = full.map((d) => ({ ...d, receiptConfirmed: false }));
    expect(deliverySatisfied(noReceipt)).toBe(false);
  });

  it('★ 설명하지 않았으면 안 된다 — 서면만 건네고 끝내는 항변은 기각됐다', () => {
    const noExplain = full.map((d) => ({ ...d, explained: false }));
    expect(deliverySatisfied(noExplain)).toBe(false);
  });

  it('기록이 없으면 안 된다', () => {
    expect(deliverySatisfied([])).toBe(false);
  });
});
