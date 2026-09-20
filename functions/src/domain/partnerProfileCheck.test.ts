import { describe, it, expect } from 'vitest';
import {
  ageOn,
  bmiOf,
  checkPartnerProfile,
  crossCheckSources,
  type PartnerDraft,
} from './partnerProfileCheck.js';

const NOW = new Date('2026-09-20T00:00:00Z');

const FULL: PartnerDraft = {
  name: 'Nguyen Thi A',
  nationality: '베트남',
  birthDate: '1996-01-16',
  gender: 'F',
  region: '호치민',
  occupation: '회사원',
  education: '고졸',
  religion: '무교',
  maritalHistory: '미혼',
  languages: '베트남어',
  heightCm: 162,
  weightKg: 52,
  memo: null,
};

/** 서류가 다 갖춰진 원문. 이게 있어야 법정 경고가 안 뜬다 */
const RAW_COMPLETE = '여권 사본 첨부. 건강진단서 2026-08 발급. 범죄경력 증명서 첨부.';

const kinds = (ws: ReturnType<typeof checkPartnerProfile>) => ws.map((w) => w.kind);
const messages = (ws: ReturnType<typeof checkPartnerProfile>) => ws.map((w) => w.message).join(' | ');

describe('ageOn', () => {
  it('생일이 지났으면 그해 나이를 센다', () => {
    expect(ageOn('2006-01-13', NOW)).toBe(20);
  });

  it('생일이 아직 안 왔으면 한 살 뺀다', () => {
    expect(ageOn('2006-12-31', NOW)).toBe(19);
  });

  it('생일 당일은 이미 그 나이다', () => {
    expect(ageOn('2006-09-20', NOW)).toBe(20);
  });

  it('읽을 수 없는 날짜는 null', () => {
    expect(ageOn('아무거나', NOW)).toBeNull();
  });
});

describe('bmiOf', () => {
  it('키와 몸무게로 계산한다', () => {
    expect(bmiOf(155, 36)).toBeCloseTo(14.98, 1);
  });

  it('0이나 음수는 계산하지 않는다', () => {
    expect(bmiOf(0, 50)).toBeNull();
    expect(bmiOf(160, -1)).toBeNull();
  });
});

describe('checkPartnerProfile — 서류', () => {
  it('세 가지가 다 있으면 법정 경고가 없다', () => {
    const ws = checkPartnerProfile(FULL, RAW_COMPLETE, NOW);
    expect(kinds(ws)).not.toContain('legal');
  });

  it('건강진단서가 없으면 걸린다', () => {
    const ws = checkPartnerProfile(FULL, '여권 사본 첨부. 범죄경력 증명서 첨부.', NOW);
    expect(messages(ws)).toContain('건강진단서가 자료에 없습니다');
  });

  it('범죄경력 증명이 없으면 걸린다', () => {
    const ws = checkPartnerProfile(FULL, '여권 사본. 건강진단서 첨부.', NOW);
    expect(messages(ws)).toContain('범죄경력 증명이 자료에 없습니다');
  });

  it('여권 이야기가 없으면 걸린다', () => {
    const ws = checkPartnerProfile(FULL, '건강진단서. 범죄경력 증명서.', NOW);
    expect(messages(ws)).toContain('여권 정보가 자료에 없습니다');
  });

  it('서류 이름인 「건강진단서」를 상태 진술로 읽지 않는다', () => {
    const ws = checkPartnerProfile(
      { ...FULL, heightCm: 155, weightKg: 36 },
      RAW_COMPLETE,
      NOW,
    );
    // RAW_COMPLETE 에는 「건강진단서」가 있지만 건강하다는 주장은 없다.
    expect(ws.find((x) => x.field === 'weightKg')?.kind).toBe('safety');
  });

  it('「건강하다」는 말은 진단서를 대신하지 못한다', () => {
    const ws = checkPartnerProfile(FULL, '여권 사본. 범죄경력 증명서. 건강하고 튼튼함', NOW);
    const health = ws.find((w) => w.message.includes('건강진단서'));
    expect(health?.remedy).toContain('진술');
  });

  it('혼인경력이 비면 걸린다', () => {
    const ws = checkPartnerProfile({ ...FULL, maritalHistory: null }, RAW_COMPLETE, NOW);
    expect(messages(ws)).toContain('혼인경력이 자료에 없습니다');
  });
});

describe('checkPartnerProfile — 나이', () => {
  it('혼인적령 미만은 진행을 멈추게 한다', () => {
    const ws = checkPartnerProfile({ ...FULL, birthDate: '2009-05-01' }, RAW_COMPLETE, NOW);
    const w = ws.find((x) => x.field === 'birthDate');
    expect(w?.kind).toBe('safety');
    expect(w?.remedy).toContain('진행하지 마시고');
    expect(w?.legalBasis).toContain('807');
  });

  it('만 18·19세는 막지 않되 본인 의사를 확인하게 한다', () => {
    const ws = checkPartnerProfile({ ...FULL, birthDate: '2007-01-13' }, RAW_COMPLETE, NOW);
    const w = ws.find((x) => x.field === 'birthDate');
    expect(w?.kind).toBe('safety');
    expect(w?.remedy).toContain('통역');
  });

  it('만 20세부터는 나이 경고가 없다', () => {
    const ws = checkPartnerProfile({ ...FULL, birthDate: '2006-01-13' }, RAW_COMPLETE, NOW);
    expect(ws.some((x) => x.field === 'birthDate')).toBe(false);
  });

  it('생년월일이 없으면 걸린다', () => {
    const ws = checkPartnerProfile({ ...FULL, birthDate: null }, RAW_COMPLETE, NOW);
    expect(messages(ws)).toContain('생년월일이 없습니다');
  });
});

describe('checkPartnerProfile — 몸', () => {
  it('심한 저체중인데 건강하다고 적혀 있으면 어긋남으로 본다', () => {
    const ws = checkPartnerProfile(
      { ...FULL, heightCm: 155, weightKg: 36 },
      `${RAW_COMPLETE} 건강하고 튼튼함`,
      NOW,
    );
    const w = ws.find((x) => x.field === 'weightKg');
    expect(w?.kind).toBe('conflict');
    expect(w?.message).toContain('맞지 않습니다');
  });

  it('건강하다는 말이 없으면 어긋남이 아니라 몸 이야기로 본다', () => {
    const ws = checkPartnerProfile(
      { ...FULL, heightCm: 155, weightKg: 36 },
      RAW_COMPLETE,
      NOW,
    );
    const w = ws.find((x) => x.field === 'weightKg');
    expect(w?.kind).toBe('safety');
  });

  it('정상 체중이면 아무 말도 하지 않는다', () => {
    const ws = checkPartnerProfile(
      { ...FULL, heightCm: 162, weightKg: 58 },
      `${RAW_COMPLETE} 건강함`,
      NOW,
    );
    expect(ws.some((x) => x.field === 'weightKg')).toBe(false);
  });

  it('키나 몸무게 한쪽만 있으면 계산하지 않는다', () => {
    const ws = checkPartnerProfile({ ...FULL, weightKg: null }, RAW_COMPLETE, NOW);
    expect(ws.some((x) => x.field === 'weightKg')).toBe(false);
  });
});

describe('checkPartnerProfile — 빈 칸', () => {
  it('이름과 국적이 없으면 각각 걸린다', () => {
    const ws = checkPartnerProfile(
      { ...FULL, name: null, nationality: null },
      RAW_COMPLETE,
      NOW,
    );
    expect(messages(ws)).toContain('이름이 없습니다');
    expect(messages(ws)).toContain('국적이 없습니다');
  });
});

describe('crossCheckSources', () => {
  const text = { name: '지허', nationality: '라오스', birthDate: '2006-01-13' };

  it('글과 사진의 이름이 다르면 걸린다', () => {
    const ws = crossCheckSources(text, [
      { name: 'Nguyen Thi Huyen', nationality: '베트남', birthDate: '1990-10-20' },
    ]);
    expect(ws[0].kind).toBe('conflict');
    expect(ws[0].message).toContain('지허');
    expect(ws[0].message).toContain('Nguyen Thi Huyen');
  });

  it('이름이 같고 국적이 다르면 국적으로 걸린다', () => {
    const ws = crossCheckSources(text, [
      { name: '지허', nationality: '베트남', birthDate: '2006-01-13' },
    ]);
    expect(ws[0].field).toBe('nationality');
  });

  it('같은 사람이면 아무 말도 하지 않는다', () => {
    const ws = crossCheckSources(text, [
      { name: '지허', nationality: '라오스', birthDate: '2006-01-13' },
    ]);
    expect(ws).toEqual([]);
  });

  it('한쪽 값이 비면 다르다고 하지 않는다 — 없는 것은 어긋난 것이 아니다', () => {
    const ws = crossCheckSources(text, [
      { name: null, nationality: null, birthDate: null },
    ]);
    expect(ws).toEqual([]);
  });

  it('사진이 없으면 볼 것이 없다', () => {
    expect(crossCheckSources(text, [])).toEqual([]);
  });
});

// ── 실제로 받은 자료 ────────────────────────
//
// 2026-09-20에 현지 에이전트가 보낸 것을 그대로 즌겼다. 사람이 지어낸 예시가 아니다.
// 이 자료에서 무엇이 걸려야 하는지를 못 박아 둔다 — 규칙을 손볼 때 이게 지켜지는지 본다.
describe('실제 자료 — 라오스 지허 건 (2026-09-20)', () => {
  const RAW = [
    '이름: 지허 / 국정:라오스 / 종교: 몽족 종교 / 생년월일: 2006.1.13/20세',
    '루았프라방 주 폰싸군 반 팩아 동 / 현재 거주지: 루았프라방',
    '키: 155cm / 몸무게: 35~36kg / 학력: 중학교 졸업 / 직업: 무직 / 혼인 여부: 미혼',
    '건강하고 튼튼함 / 아버지: 37세 어머니: 35세 남동생 2명 / 아버지직업: 장사',
    '성격: 쫐활함 / 취미: 요리하기, 남편과 놀러 가는 것',
    '횝터 : 없음 / 성형 수술 경험 없음',
    '결혼 상대: 사랑과 가족을 소중히 여기는 사람과 결혼하고 싶습니다',
  ].join('\n');

  const JIHEO: PartnerDraft = {
    name: '지허',
    nationality: '라오스',
    birthDate: '2006-01-13',
    gender: 'F',
    region: '루았프라방',
    occupation: '무직',
    education: '중졸',
    religion: '몽족 종교',
    maritalHistory: '미혼',
    languages: null,
    heightCm: 155,
    weightKg: 35,
    memo: '아버지 37세, 어머니 35세, 남동생 2명. 성격 쫐활.',
  };

  const ws = checkPartnerProfile(JIHEO, RAW, NOW);

  it('「건강하고 튼튼함」과 몸무게가 어긋나는 것을 잡는다', () => {
    const w = ws.find((x) => x.field === 'weightKg');
    expect(w?.kind).toBe('conflict');
    // 155cm 35kg = BMI 14.6
    expect(w?.message).toContain('14.6');
  });

  it('법이 요구하는 서류 중 없는 둘을 짚는다', () => {
    expect(messages(ws)).toContain('건강진단서가 자료에 없습니다');
    expect(messages(ws)).toContain('범죄경력 증명이 자료에 없습니다');
    // 혼인 여부는 자료에 있으므로 이건 안 걸려야 한다
    expect(messages(ws)).not.toContain('혼인경력이 자료에 없습니다');
  });

  it('여권이 없어 이름 철자를 대조할 수 없다고 알린다', () => {
    expect(messages(ws)).toContain('여권 정보가 자료에 없습니다');
  });

  it('만 20세라 나이로는 막지 않는다', () => {
    expect(ws.some((x) => x.field === 'birthDate')).toBe(false);
  });

  it('같이 온 사진 석 장이 모두 다른 사람임을 잡는다', () => {
    const conflicts = crossCheckSources(
      { name: '지허', nationality: '라오스', birthDate: '2006-01-13' },
      [
        { name: 'Nguyen Thi Huyen', nationality: '베트남', birthDate: '1990-10-20' },
        { name: 'Nguyen Ha Bang Ngan', nationality: '베트남', birthDate: '1996-01-16' },
        { name: 'Le Thi Tieu Hong', nationality: '베트남', birthDate: '1999-06-13' },
      ],
    );
    expect(conflicts).toHaveLength(3);
    expect(conflicts.every((c) => c.kind === 'conflict')).toBe(true);
  });
});
