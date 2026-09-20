// 현지 에이전트가 보낸 후보 자료를 받아 들일 만한지 본다
//
// 왜 이걸 코드가 하나. 자료는 카톡으로 온다 — 텍스트 몇 줄과 「신부 프로필」 카드 그림.
// 거기 적힌 것을 그대로 명부에 넣으면 두 가지가 벌어진다.
//
//  1) 법이 요구하는 신상정보가 빠진 채로 맞선까지 간다. 건강상태와 범죄경력은
//     자료에 「건강하고 튼튼함」이라고 적혀 있어도 채워지지 않는다. 그건 진술이지 증빙이 아니다.
//  2) 자료 안에서 서로 어긋나는 것을 아무도 못 본다. 키 155cm에 몸무게 35kg인데
//     같은 자료에 「건강하고 튼튼함」이라고 적혀 있는 식이다.
//
// 그래서 판정을 모델에게 맡기지 않는다. 뽑아내는 일만 모델이 하고, 받아들일지는 여기서 본다.
// 모델은 그럴듯한 말을 만들지만 이 판단은 틀리면 사람이 다친다.

/** 모델이 자료에서 뽑아낸 값. 화면 폼과 같은 모양이다 */
export type PartnerDraft = {
  name: string | null;
  nationality: string | null;
  /** 'YYYY-MM-DD' */
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
  /** 폼 칸에 안 들어가는 나머지 — 가족관계, 성격, 취미, 희망 배우자상 */
  memo: string | null;
};

export type ProfileWarning = {
  /**
   * legal   — 법이 요구하는데 자료에 없다
   * conflict— 자료 안에서 서로 어긋난다
   * safety  — 사람 몸이나 나이에 관한 것. 넘기면 안 된다
   * missing — 일을 진행하려면 필요한데 비어 있다
   */
  kind: 'legal' | 'conflict' | 'safety' | 'missing';
  /** 어느 칸 이야기인지. 화면에서 그 칸을 짚어 준다 */
  field?: keyof PartnerDraft;
  message: string;
  remedy: string;
  /** 법 근거. 없는 의무를 있다고 적지 않는다 — 우리 운영 기준이면 비워 둔다 */
  legalBasis?: string;
};

/** 혼인적령. 민법 제807조 */
const MARRIAGEABLE_AGE = 18;

/**
 * 「건강하다」는 말이 자료에 있는가.
 *
 * 몸무게와 어긋나는지 보려면 먼저 그런 말이 있었는지를 알아야 한다.
 * 없으면 어긋날 것도 없다.
 *
 * ★ 「건강」 한 마디로 보면 안 된다. 「건강진단서 첨부」까지 「건강하다는 주장」으로
 * 읽혀, 서류를 제대로 보낸 에이전트에게 「말과 몸무게가 어긋난다」고 되넘기게 된다.
 * 서류 이름과 상태 진술을 가르는 것이 이 정규식의 일이다.
 */
const HEALTH_CLAIM = /건강하|건강함|건강상태는|튼튼|양호|healthy|khỏe mạnh/i;

/** 증빙 서류를 가리키는 말 */
const HEALTH_DOC = /진단서|검진|소견서|건강진단|medical (certificate|report)/i;
const CRIMINAL_DOC = /범죄경력|수사경력|경찰증명|criminal record|police (clearance|certificate)/i;
const PASSPORT = /여권|passport|ບັດຜ່ານແດນ/i;

export function ageOn(birthDate: string, on: Date): number | null {
  const born = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return null;
  let age = on.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < born.getUTCMonth() ||
    (on.getUTCMonth() === born.getUTCMonth() && on.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** 체질량지수. 키가 cm, 몸무게가 kg */
export function bmiOf(heightCm: number, weightKg: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * 자료를 훑어 걸리는 것을 모두 돌려준다.
 *
 * 하나 걸렸다고 멈추지 않는다 — 한 번에 다 보여 줘야 사장이 현지에 한 번만 연락한다.
 * `raw`는 에이전트가 보낸 원문이다. 증빙 서류 이야기가 나왔는지 여기서 본다.
 */
export function checkPartnerProfile(
  draft: PartnerDraft,
  raw: string,
  now: Date = new Date(),
): ProfileWarning[] {
  const warnings: ProfileWarning[] = [];
  const source = raw ?? '';

  // ── 나이 ──────────────────────────────────────────
  if (!draft.birthDate) {
    warnings.push({
      kind: 'missing',
      field: 'birthDate',
      message: '생년월일이 없습니다.',
      remedy: '현지 에이전트에게 여권에 적힌 생년월일을 받아 주세요.',
    });
  } else {
    const age = ageOn(draft.birthDate, now);
    if (age !== null && age < MARRIAGEABLE_AGE) {
      warnings.push({
        kind: 'safety',
        field: 'birthDate',
        message: `만 ${age}세입니다. 혼인할 수 없는 나이입니다.`,
        remedy: '이 건은 진행하지 마시고 현지 에이전트에게 사유를 남겨 주세요.',
        legalBasis: '민법 제807조 (혼인적령 만 18세)',
      });
    } else if (age !== null && age < 20) {
      warnings.push({
        kind: 'safety',
        field: 'birthDate',
        message: `만 ${age}세입니다. 혼인은 가능하지만 나이가 아주 어립니다.`,
        remedy:
          '본인 의사로 온 것인지 통역을 통해 직접 확인하고, 확인한 내용을 기록으로 남겨 주세요.',
      });
    }
  }

  // ── 몸 ────────────────────────────────────────────
  //
  // 저체중 자체를 문제 삼는 것이 아니다. 자료가 스스로 어긋나는 것이 문제다.
  // 「건강하고 튼튼함」이라고 적어 보낸 사람이 BMI 15를 같이 적어 보냈다면,
  // 둘 중 하나는 사실이 아니거나 확인 없이 쓴 말이다.
  if (draft.heightCm && draft.weightKg) {
    const bmi = bmiOf(draft.heightCm, draft.weightKg);
    if (bmi !== null && bmi < 16) {
      const claimed = HEALTH_CLAIM.test(source);
      warnings.push({
        kind: claimed ? 'conflict' : 'safety',
        field: 'weightKg',
        message: claimed
          ? `키 ${draft.heightCm}cm에 몸무게 ${draft.weightKg}kg이면 체질량지수 ${bmi.toFixed(1)}입니다. ` +
            '같은 자료의 「건강하다」는 말과 맞지 않습니다.'
          : `체질량지수 ${bmi.toFixed(1)}로 심한 저체중입니다.`,
        remedy: '건강진단서로 확인하기 전에는 건강상태를 「양호」로 적지 마세요.',
        legalBasis: '결혼중개업법 제10조의2 (건강상태는 확인된 사실로 제공해야 한다)',
      });
    }
  }

  // ── 법이 요구하는 신상정보 ─────────────────────────
  //
  // 세 가지다. 자료에 말로 적혀 있는 것과, 서류로 확인된 것은 다르다.
  // 여기서 보는 것은 「서류 이야기가 나왔는가」다.
  if (!draft.maritalHistory) {
    warnings.push({
      kind: 'legal',
      field: 'maritalHistory',
      message: '혼인경력이 자료에 없습니다.',
      remedy: '미혼·이혼·사별 중 무엇인지, 자녀가 있는지까지 받아 주세요.',
      legalBasis: '결혼중개업법 제10조의2 제1항 (혼인경력)',
    });
  }

  if (!HEALTH_DOC.test(source)) {
    warnings.push({
      kind: 'legal',
      message: '건강진단서가 자료에 없습니다.',
      remedy:
        HEALTH_CLAIM.test(source)
          ? '자료에 건강하다는 말은 있지만 그것은 진술입니다. 진단서를 받아야 신상정보가 채워집니다.'
          : '현지 병원 건강진단서를 받아 주세요.',
      legalBasis: '결혼중개업법 제10조의2 제1항 (건강상태)',
    });
  }

  if (!CRIMINAL_DOC.test(source)) {
    warnings.push({
      kind: 'legal',
      message: '범죄경력 증명이 자료에 없습니다.',
      remedy: '현지 경찰이 발급한 범죄경력 증명서를 받아 주세요.',
      legalBasis: '결혼중개업법 제10조의2 제1항 (범죄경력)',
    });
  }

  if (!PASSPORT.test(source)) {
    warnings.push({
      kind: 'missing',
      message: '여권 정보가 자료에 없습니다.',
      remedy:
        '여권 사본을 받아 이름 철자와 생년월일을 대조해 주세요. 자료의 이름과 여권이 다른 경우가 있습니다.',
    });
  }

  // ── 있어야 일이 되는 것 ───────────────────────────
  if (!draft.name) {
    warnings.push({
      kind: 'missing',
      field: 'name',
      message: '이름이 없습니다.',
      remedy: '여권 표기 그대로 받아 주세요.',
    });
  }
  if (!draft.nationality) {
    warnings.push({
      kind: 'missing',
      field: 'nationality',
      message: '국적이 없습니다.',
      remedy: '국적에 따라 필요한 서류와 절차가 달라집니다. 반드시 채워 주세요.',
    });
  }

  return warnings;
}

/**
 * 자료가 여러 장일 때 서로 다른 사람을 가리키지 않는지 본다.
 *
 * 카톡으로 받다 보면 텍스트는 이 사람인데 그림은 저 사람인 일이 생긴다.
 * 그대로 명부에 넣으면 손님에게 다른 사람 사진을 보여 주게 된다.
 */
export function crossCheckSources(
  fromText: Pick<PartnerDraft, 'name' | 'nationality' | 'birthDate'> | null,
  fromImages: Array<Pick<PartnerDraft, 'name' | 'nationality' | 'birthDate'>>,
): ProfileWarning[] {
  if (!fromText || fromImages.length === 0) return [];
  const warnings: ProfileWarning[] = [];

  const same = (a: string | null, b: string | null) =>
    !a || !b || a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();

  for (const image of fromImages) {
    if (!same(fromText.name, image.name)) {
      warnings.push({
        kind: 'conflict',
        field: 'name',
        message: `글의 이름(${fromText.name})과 사진 속 이름(${image.name})이 다릅니다.`,
        remedy: '어느 사진이 누구 것인지 현지에 확인하고, 한 사람씩 나눠 등록해 주세요.',
      });
      continue;
    }
    if (!same(fromText.nationality, image.nationality)) {
      warnings.push({
        kind: 'conflict',
        field: 'nationality',
        message: `글의 국적(${fromText.nationality})과 사진 속 국적(${image.nationality})이 다릅니다.`,
        remedy: '같은 사람의 자료가 맞는지 확인해 주세요.',
      });
    }
  }

  return warnings;
}
