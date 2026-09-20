// 올려 둔 서류로 법정의무를 채운다
//
// 지금까지는 같은 일을 두 번 했다. 범죄경력 증명서를 서류함에 올리고,
// 타임라인에 가서 「한국인 측 범죄경력 서면제공」을 다시 완료로 바꿨다.
// 한쪽만 하면 통화를 열 때 「끝나지 않았습니다」가 뜬다 — 서류는 이미 있는데.
//
// 서류에는 무엇인지(type)와 누구 것인지(subject)가 이미 적혀 있다.
// 그러면 어느 의무를 채우는지도 정해진다. 사람이 다시 고를 이유가 없다.

/** 서류함이 쓰는 분류. src/types/schema.ts ClientDocument['type'] 과 같다 */
export type DocType =
  | 'contract'
  | 'background_info'
  | 'rights_notice'
  | 'criminal_record'
  | 'health_cert'
  | 'income_proof'
  | 'marital_cert'
  | 'passport'
  | 'other';

export type DocSubject = 'korean' | 'partner' | 'both';

export type EvidenceDoc = {
  docId: string;
  type: DocType;
  subject: DocSubject;
};

/**
 * 서류 한 장이 채우는 의무들.
 *
 * `both`로 올린 서류는 양쪽 의무를 함께 채운다 — 신상정보 확인서처럼
 * 한 장에 둘이 같이 적히는 서식이 실제로 있다.
 *
 * 여기 없는 서류(contract·passport·other)는 아무 의무도 채우지 않는다.
 * 계약서와 여권은 중요하지만 제10조의2가 말하는 신상정보가 아니다.
 * **모르는 것을 채운 것으로 만들지 않는다** — 채워진 척하면 아무도 다시 안 본다.
 */
export function obligationsFor(doc: EvidenceDoc): string[] {
  const korean: string[] = [];
  const partner: string[] = [];

  switch (doc.type) {
    case 'criminal_record':
      korean.push('BG_KOR_CRIMINAL');
      partner.push('BG_PARTNER_CRIMINAL');
      break;
    case 'health_cert':
      korean.push('BG_KOR_HEALTH');
      partner.push('BG_PARTNER_HEALTH');
      break;
    case 'income_proof':
      // 소득·재산은 한국인 측 의무다. 외국인 후보에게는 같은 의무가 없다.
      korean.push('BG_KOR_INCOME');
      break;
    case 'marital_cert':
      korean.push('BG_KOR_MARITAL_HISTORY');
      partner.push('BG_PARTNER_MARITAL_HISTORY');
      break;
    case 'background_info':
      // 신상정보 확인서를 양쪽에 주고받았다는 서면. 한쪽 것만 올렸다면
      // 아직 「상호」가 아니므로 both 일 때만 채운다.
      if (doc.subject === 'both') return ['BG_MUTUAL_DELIVERY'];
      return [];
    default:
      return [];
  }

  if (doc.subject === 'korean') return korean;
  if (doc.subject === 'partner') return partner;
  return [...korean, ...partner];
}

export type TimelineRow = {
  id: string;
  templateCode: string;
  status: string;
  /** 이미 붙어 있는 증거 문서 id */
  evidenceDocIds: string[];
};

export type SyncPlan = {
  /** 완료로 바꿀 항목 */
  complete: Array<{ itemId: string; templateCode: string; docId: string }>;
  /** 이미 끝나 있어 건드리지 않는 항목 */
  alreadyDone: string[];
  /** 서류가 없어 못 채우는 의무 */
  missing: string[];
};

/**
 * 지금 올라와 있는 서류로 무엇을 채울 수 있는지 계산한다.
 *
 * 쓰기는 하지 않는다. 무엇을 바꿀지 먼저 돌려주고, 부르는 쪽이 그대로 실행한다 —
 * 이렇게 나눠야 「눌렀더니 무엇이 바뀌었나」를 사람에게 보여 줄 수 있다.
 *
 * `required`는 통화를 열기 위해 필요한 의무 코드들이다. 여기 없는 의무는
 * 서류가 있어도 건드리지 않는다 — 통화와 무관한 항목까지 임의로 완료시키면
 * 나중에 누가 확인한 것인지 알 수 없게 된다.
 */
export function planObligationSync(
  documents: EvidenceDoc[],
  timeline: TimelineRow[],
  required: string[],
): SyncPlan {
  const rowByCode = new Map(timeline.map((r) => [r.templateCode, r]));
  const complete: SyncPlan['complete'] = [];
  const alreadyDone: string[] = [];
  const satisfied = new Set<string>();

  for (const doc of documents) {
    for (const code of obligationsFor(doc)) {
      if (!required.includes(code)) continue;
      const row = rowByCode.get(code);
      if (!row) continue;
      if (row.status === 'done') {
        if (!alreadyDone.includes(code)) alreadyDone.push(code);
        satisfied.add(code);
        continue;
      }
      // 같은 의무를 채우는 서류가 여럿이면 처음 것만 쓴다. 증거는 한 장이면 충분하고,
      // 나머지는 서류함에 그대로 있다.
      if (satisfied.has(code)) continue;
      satisfied.add(code);
      complete.push({ itemId: row.id, templateCode: code, docId: doc.docId });
    }
  }

  const missing = required.filter((code) => !satisfied.has(code));
  return { complete, alreadyDone, missing };
}
