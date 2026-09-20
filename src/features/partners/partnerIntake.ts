// 현지 자료에서 칸을 뽑아 오는 일 — 붙여넣기 상자와 사진 올리기가 같이 쓴다
//
// 두 곳에서 같은 서버 함수를 부른다. 한쪽만 고치면 다른 쪽이 어긋나므로 여기 모아 둔다.

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { PartnerForm } from './usePartners';

/** 서버와 같은 모양. functions/src/domain/partnerProfileCheck.ts */
export type Draft = {
  name: string | null;
  nationality: string | null;
  birthDate: string | null;
  gender: 'M' | 'F' | null;
  region: string | null;
  occupation: string | null;
  education: string | null;
  religion: string | null;
  maritalHistory: string | null;
  languages: string | null;
  heightCm: number | null;
  weightKg: number | null;
  memo: string | null;
};

export type ProfileWarning = {
  kind: 'legal' | 'conflict' | 'safety' | 'missing';
  field?: string;
  message: string;
  remedy: string;
  legalBasis?: string;
};

export type IntakeResult = {
  draft: Draft;
  fromText: Draft | null;
  fromImages: Draft[];
  warnings: ProfileWarning[];
  confidence: 'high' | 'medium' | 'low';
};

export type EncodedImage = { mimeType: string; dataBase64: string };

export async function encodeImage(file: File): Promise<EncodedImage & { preview: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  return { mimeType: file.type, dataBase64: dataUrl.slice(comma + 1), preview: dataUrl };
}

export async function extractPartnerProfile(input: {
  text?: string;
  images?: EncodedImage[];
}): Promise<IntakeResult> {
  const call = httpsCallable<
    { text: string; images: EncodedImage[] },
    IntakeResult
  >(functions, 'extractPartnerProfile');
  const { data } = await call({ text: input.text ?? '', images: input.images ?? [] });
  return data;
}

/** 서버가 준 값을 화면 폼 모양으로. null은 빈 문자열이 된다 */
export function toFormValues(draft: Draft): Partial<PartnerForm> {
  return {
    name: draft.name ?? '',
    nationality: draft.nationality ?? '',
    birthDate: draft.birthDate ?? '',
    gender: draft.gender ?? '',
    region: draft.region ?? '',
    occupation: draft.occupation ?? '',
    education: draft.education ?? '',
    religion: draft.religion ?? '',
    maritalHistory: draft.maritalHistory ?? '',
    languages: draft.languages ?? '',
    height: draft.heightCm != null ? String(draft.heightCm) : '',
    weight: draft.weightKg != null ? String(draft.weightKg) : '',
    memo: draft.memo ?? '',
  };
}

/** 뽑아낸 것이 하나라도 있는가. 얼굴만 찍힌 사진이면 없다 */
export function hasAnything(draft: Draft): boolean {
  return Object.values(draft).some((v) => v !== null && v !== '');
}

/** 채워진 칸 이름을 한국어로. 「무엇이 채워졌는지」를 사람에게 보여 주려고 쓴다 */
export const FIELD_LABEL: Record<string, string> = {
  name: '이름',
  nationality: '국적',
  birthDate: '생년월일',
  gender: '성별',
  region: '거주지',
  occupation: '직업',
  education: '학력',
  religion: '종교',
  maritalHistory: '혼인 이력',
  languages: '언어',
  height: '키',
  weight: '몸무게',
  memo: '메모',
};

/**
 * 사진 한 장을 올렸을 때 보여 줄 경고만 고른다.
 *
 * 프로필 사진을 올렸을 뿐인데 「범죄경력 증명서가 없습니다」가 뜨면 시끄럽기만 하다.
 * 그건 자료 전체를 넣었을 때 할 말이다. 사진에서 읽은 값 자체가 이상한 것(나이·몸무게)과
 * 다른 자료와 어긋나는 것만 남긴다.
 */
export function warningsForPhoto(warnings: ProfileWarning[]): ProfileWarning[] {
  return warnings.filter((w) => w.kind === 'safety' || w.kind === 'conflict');
}
