import type { MbtiType } from '@/types/schema';

const TYPES: MbtiType[] = [
  'ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
  'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ',
];

// 16x16 궁합 점수 매트릭스 (행 = A, 열 = B, 대칭)
// 점수 기준: 95~100 천생연분, 80~94 좋음, 60~79 보통, 40~59 노력 필요
const MATRIX: number[][] = [
  //ISTJ ISFJ INFJ INTJ ISTP ISFP INFP INTP ESTP ESFP ENFP ENTP ESTJ ESFJ ENFJ ENTJ
  [ 65,  72,  60,  70,  68,  55,  50,  65,  78,  62,  85,  75,  70,  68,  62,  80], // ISTJ
  [ 72,  65,  68,  55,  58,  70,  62,  50,  65,  72,  78,  60,  68,  72,  75,  58], // ISFJ
  [ 60,  68,  62,  72,  48,  55,  68,  65,  55,  58,  80,  78,  52,  62,  70,  92], // INFJ
  [ 70,  55,  72,  62,  65,  48,  55,  72,  62,  50,  75,  80,  65,  52,  92,  70], // INTJ
  [ 68,  58,  48,  65,  60,  62,  50,  68,  72,  68,  72,  70,  78,  55,  55,  72], // ISTP
  [ 55,  70,  55,  48,  62,  60,  65,  50,  68,  72,  68,  55,  58,  78,  72,  52], // ISFP
  [ 50,  62,  68,  55,  50,  65,  58,  62,  55,  68,  65,  58,  48,  68,  85,  72], // INFP
  [ 65,  50,  65,  72,  68,  50,  62,  58,  70,  55,  60,  72,  72,  48,  70,  85], // INTP
  [ 78,  65,  55,  62,  72,  68,  55,  70,  62,  65,  68,  72,  75,  62,  58,  68], // ESTP
  [ 62,  72,  58,  50,  68,  72,  68,  55,  65,  62,  72,  65,  62,  75,  70,  55], // ESFP
  [ 85,  78,  80,  75,  72,  68,  65,  60,  68,  72,  58,  65,  72,  78,  75,  72], // ENFP
  [ 75,  60,  78,  80,  70,  55,  58,  72,  72,  65,  65,  58,  70,  58,  72,  78], // ENTP
  [ 70,  68,  52,  65,  78,  58,  48,  72,  75,  62,  72,  70,  62,  65,  55,  75], // ESTJ
  [ 68,  72,  62,  52,  55,  78,  68,  48,  62,  75,  78,  58,  65,  62,  72,  55], // ESFJ
  [ 62,  75,  70,  92,  55,  72,  85,  70,  58,  70,  75,  72,  55,  72,  62,  70], // ENFJ
  [ 80,  58,  92,  70,  72,  52,  72,  85,  68,  55,  72,  78,  75,  55,  70,  62], // ENTJ
];

export type CompatGrade = '천생연분' | '좋음' | '보통' | '노력 필요';

function scoreToGrade(score: number): CompatGrade {
  if (score >= 90) return '천생연분';
  if (score >= 75) return '좋음';
  if (score >= 60) return '보통';
  return '노력 필요';
}

const GRADE_COLOR: Record<CompatGrade, string> = {
  '천생연분': 'text-rose-600',
  '좋음': 'text-blue-600',
  '보통': 'text-slate-600',
  '노력 필요': 'text-amber-600',
};

// 조합별 해설 (주요 조합만, 나머지는 일반 해설)
const DESCRIPTIONS: Record<string, string> = {
  'INFJ_ENTJ': '직관과 전략이 만나는 이상적 조합. 깊은 대화와 함께 목표를 향해 나아갈 수 있습니다.',
  'ENTJ_INFJ': '직관과 전략이 만나는 이상적 조합. 깊은 대화와 함께 목표를 향해 나아갈 수 있습니다.',
  'INTJ_ENFJ': '비전을 공유하며 서로의 성장을 돕는 관계. 깊은 유대감을 형성합니다.',
  'ENFJ_INTJ': '비전을 공유하며 서로의 성장을 돕는 관계. 깊은 유대감을 형성합니다.',
  'INFP_ENFJ': '감성과 따뜻함이 만나는 조합. 서로의 감정을 깊이 이해합니다.',
  'ENFJ_INFP': '감성과 따뜻함이 만나는 조합. 서로의 감정을 깊이 이해합니다.',
  'INTP_ENTJ': '논리와 전략의 만남. 지적 대화를 즐기며 함께 문제를 해결합니다.',
  'ENTJ_INTP': '논리와 전략의 만남. 지적 대화를 즐기며 함께 문제를 해결합니다.',
  'ISTJ_ENFP': '안정과 활력의 균형. 서로의 부족한 면을 채워주는 보완적 관계입니다.',
  'ENFP_ISTJ': '안정과 활력의 균형. 서로의 부족한 면을 채워주는 보완적 관계입니다.',
  'ISFJ_ENFP': '헌신과 열정이 만나는 조합. 따뜻하고 안정적인 관계를 만듭니다.',
  'ENFP_ISFJ': '헌신과 열정이 만나는 조합. 따뜻하고 안정적인 관계를 만듭니다.',
  'INFJ_ENFP': '이상주의자끼리 통하는 깊은 교감. 의미 있는 대화가 끊이지 않습니다.',
  'ENFP_INFJ': '이상주의자끼리 통하는 깊은 교감. 의미 있는 대화가 끊이지 않습니다.',
};

function getDescription(a: MbtiType, b: MbtiType, score: number): string {
  const key = `${a}_${b}`;
  if (DESCRIPTIONS[key]) return DESCRIPTIONS[key];

  const grade = scoreToGrade(score);
  if (grade === '천생연분') return '서로를 깊이 이해하고 보완하는 최적의 파트너입니다.';
  if (grade === '좋음') return '서로의 장점을 살려주며 안정적인 관계를 만들 수 있습니다.';
  if (grade === '보통') return '서로 다른 점을 이해하려는 노력이 좋은 관계로 이어집니다.';
  return '성격 차이가 있지만, 서로의 다름을 존중하면 성장하는 관계가 됩니다.';
}

export type MbtiCompatResult = {
  score: number;
  grade: CompatGrade;
  gradeColor: string;
  description: string;
};

export function getMbtiCompat(a: MbtiType, b: MbtiType): MbtiCompatResult {
  const ai = TYPES.indexOf(a);
  const bi = TYPES.indexOf(b);
  if (ai === -1 || bi === -1) {
    return { score: 50, grade: '보통', gradeColor: GRADE_COLOR['보통'], description: 'MBTI 정보가 필요합니다.' };
  }
  const row = MATRIX[ai];
  const score = row ? row[bi] ?? 50 : 50;
  const grade = scoreToGrade(score);
  return {
    score,
    grade,
    gradeColor: GRADE_COLOR[grade],
    description: getDescription(a, b, score),
  };
}

export { TYPES as MBTI_TYPES };
