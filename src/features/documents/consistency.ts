// 서류가 서로 어긋나지 않는지 점검한다 — 있는지가 아니라 말이 맞는지를 본다
//
// 왜 필요한가. 우리가 모은 판례·재결례를 읽어 보면 처분의 압도적 다수가 신상정보 관련이다.
// 서류를 안 준 것이 아니라 **때를 놓쳤거나 한쪽만 준** 경우가 많았다. 대법원은 신상정보
// 제공을 "이용자와 상대방이 만나기 이전에" 이행해야 하는 의무로 보았고(2018도7989),
// 재결례에서는 통역이 설명했다·나중에 번역해 줬다는 항변이 모두 기각됐다.
//
// 그래서 서류 목록만 보여주는 것으로는 부족하다. 맞선일과 서류 등록 시점을 대조해야
// "지금 위험한 상태인지"를 알 수 있다.
//
// 지키는 선
//  - 위반이라고 단정하지 않는다. "제재로 이어진 사례가 있다"까지다. 실제 제공 여부는
//    시스템이 알 수 없다(업로드 기록은 제공의 근사일 뿐이다).
//  - 각 항목에 근거를 붙이고, 해당 해설(/guides)로 연결해 사용자가 직접 확인하게 한다.

import type { ClientDocument } from '@/types/schema';
import { DOC_TYPE_LABEL, daysUntil, type DocType } from './types';

export type ConsistencyIssue = {
  level: 'critical' | 'warning';
  title: string;
  detail: string;
  /** 왜 문제인지의 근거 */
  basis: string;
  /** 자세히 읽을 해설 경로 */
  guideSlug?: string;
};

type DocLike = Pick<ClientDocument, 'type' | 'subject' | 'validUntil'> & {
  uploadedAt?: { toDate?: () => Date } | null;
};

const toDate = (v: { toDate?: () => Date } | null | undefined): Date | null => {
  if (!v?.toDate) return null;
  try {
    return v.toDate();
  } catch {
    return null;
  }
};

/** F-6 준비에서 빠지면 곤란한 서류들 */
const EXPECTED: DocType[] = [
  'contract',
  'rights_notice',
  'background_info',
  'marital_cert',
  'income_proof',
];

export function checkConsistency(input: {
  documents: DocLike[];
  /** 맞선 예정일 앵커. 없으면 시점 대조를 건너뛴다 */
  meetingAt: Date | null;
}): ConsistencyIssue[] {
  const { documents, meetingAt } = input;
  const issues: ConsistencyIssue[] = [];

  const has = (type: DocType) => documents.some((d) => d.type === type);
  const bySubject = (type: DocType, subject: 'korean' | 'partner') =>
    documents.some((d) => d.type === type && (d.subject === subject || d.subject === 'both'));

  // 1) 신상정보를 양쪽 다 갖췄는가.
  //    한쪽만 있는 상태는 재결례에서 실제로 처분으로 이어진 형태다.
  if (has('background_info')) {
    const missing: string[] = [];
    if (!bySubject('background_info', 'korean')) missing.push('이용자');
    if (!bySubject('background_info', 'partner')) missing.push('상대방');
    if (missing.length > 0) {
      issues.push({
        level: 'critical',
        title: `신상정보가 ${missing.join('·')} 쪽만 없습니다`,
        detail:
          '결혼중개업법은 이용자와 상대방 양쪽의 신상정보를 서로에게 제공하도록 정하고 있습니다. 한쪽만 등록된 상태입니다.',
        basis: '결혼중개업법 제10조의2 제1항',
        guideSlug: 'personal-info-disclosure-cases',
      });
    }
  } else {
    issues.push({
      level: 'critical',
      title: '신상정보 서류가 없습니다',
      detail:
        '신상정보 미제공은 영업정지 사유 중 가장 많이 나온 것이고, 형사 벌칙도 함께 정해져 있습니다.',
      basis: '결혼중개업법 제10조의2 제1항 · 제26조 제2항',
      guideSlug: 'personal-info-criminal',
    });
  }

  // 2) 신상정보가 맞선일 이전에 등록됐는가.
  //    대법원은 "만남 이전"에 이행할 의무로 보았다. 업로드 시점은 제공 시점의 근사이므로
  //    단정하지 않고 확인을 권하는 문구로 쓴다.
  if (meetingAt) {
    const infoDocs = documents.filter((d) => d.type === 'background_info');
    const uploaded = infoDocs.map((d) => toDate(d.uploadedAt)).filter((d): d is Date => d !== null);
    const late = uploaded.filter((d) => d.getTime() > meetingAt.getTime());
    if (uploaded.length > 0 && late.length === uploaded.length) {
      issues.push({
        level: 'critical',
        title: '신상정보가 맞선일 이후에 등록됐습니다',
        detail:
          '대법원은 신상정보 제공을 이용자와 상대방이 만나기 이전에 이행해야 하는 의무로 보았습니다. 실제 제공 시점이 맞선 전이었다면 증빙을 함께 보관해 주세요.',
        basis: '대법원 2018도7989 (2019-07-25)',
        guideSlug: 'personal-info-criminal',
      });
    }
  } else if (has('background_info')) {
    issues.push({
      level: 'warning',
      title: '맞선일이 기록되지 않아 제공 시점을 확인할 수 없습니다',
      detail:
        '타임라인에서 맞선 예정일을 기록하면 신상정보를 맞선 전에 갖췄는지 자동으로 점검합니다.',
      basis: '대법원 2018도7989 (2019-07-25)',
      guideSlug: 'personal-info-criminal',
    });
  }

  // 3) 유효기간이 지났거나 임박한 서류
  for (const d of documents) {
    const until = toDate(d.validUntil as unknown as { toDate?: () => Date } | null);
    if (!until) continue;
    const left = daysUntil(until);
    const label = DOC_TYPE_LABEL[d.type] ?? d.type;
    if (left < 0) {
      issues.push({
        level: 'critical',
        title: `${label} 유효기간이 지났습니다`,
        detail: `${Math.abs(left)}일 지났습니다. 접수 시점에 유효한 서류가 필요합니다.`,
        basis: '서류별 유효기간 기준',
      });
    } else if (left <= 30) {
      issues.push({
        level: 'warning',
        title: `${label} 유효기간이 ${left}일 남았습니다`,
        detail: '접수 전에 만료될 수 있습니다. 재발급 시점을 확인해 주세요.',
        basis: '서류별 유효기간 기준',
      });
    }
  }

  // 4) 아직 없는 서류
  const missingDocs = EXPECTED.filter((t) => !has(t));
  if (missingDocs.length > 0) {
    issues.push({
      level: 'warning',
      title: `아직 등록되지 않은 서류가 ${missingDocs.length}건 있습니다`,
      detail: missingDocs.map((t) => DOC_TYPE_LABEL[t] ?? t).join(', '),
      basis: 'F-6 준비 기준 서류',
    });
  }

  // 심각한 것부터 보여준다
  return issues.sort((a, b) => (a.level === b.level ? 0 : a.level === 'critical' ? -1 : 1));
}
