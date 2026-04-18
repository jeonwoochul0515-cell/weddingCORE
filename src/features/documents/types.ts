import type { ClientDocument } from '@/types/schema';

export type DocType = ClientDocument['type'];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  contract: '계약서',
  background_info: '신상정보',
  rights_notice: '권리고지서',
  criminal_record: '범죄경력증명서',
  health_cert: '건강진단서',
  income_proof: '소득증명',
  marital_cert: '혼인관계증명서',
  passport: '여권',
  other: '기타',
};

/**
 * 서류 유형별 기본 유효기간 (개월).
 * 발급일로부터 기본 유효기간. passport는 여권 자체 만료일 사용.
 */
export const DEFAULT_VALIDITY_MONTHS: Partial<Record<DocType, number>> = {
  criminal_record: 6,
  health_cert: 6,
  marital_cert: 3,
  income_proof: 3,
  background_info: 12,
  contract: 12,
  rights_notice: 12,
};

export function computeValidUntil(type: DocType, issuedAt: Date): Date | null {
  const months = DEFAULT_VALIDITY_MONTHS[type];
  if (!months) return null;
  const d = new Date(issuedAt);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function validityStatus(validUntil: Date | null): {
  level: 'ok' | 'warning' | 'expired';
  label: string;
  daysLeft: number | null;
} {
  if (!validUntil) return { level: 'ok', label: '유효기간 없음', daysLeft: null };
  const d = daysUntil(validUntil);
  if (d < 0) return { level: 'expired', label: `만료 (${-d}일 경과)`, daysLeft: d };
  if (d <= 30) return { level: 'warning', label: `D-${d}`, daysLeft: d };
  return { level: 'ok', label: `D-${d}`, daysLeft: d };
}
