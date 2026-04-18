import type { MbtiLang } from './i18n';

/**
 * MBTI 간이 테스트 질문 (12문항, 각 축 3문항)
 * E/I, S/N, T/F, J/P 각 3개씩
 *
 * a = 앞 글자 (E, S, T, J), b = 뒤 글자 (I, N, F, P)
 */

type Localized = Record<MbtiLang, string>;

export type Question = {
  id: number;
  axis: 'EI' | 'SN' | 'TF' | 'JP';
  a: Localized; // E, S, T, J 방향
  b: Localized; // I, N, F, P 방향
};

export const QUESTIONS: Question[] = [
  // === E/I (외향/내향) ===
  {
    id: 1, axis: 'EI',
    a: {
      ko: '사람들과 함께 있으면 에너지가 충전됩니다',
      en: 'I feel energized when I\'m around people',
      vi: 'Tôi cảm thấy tràn đầy năng lượng khi ở bên mọi người',
      zh: '和人在一起时我会充满能量',
    },
    b: {
      ko: '혼자만의 시간이 에너지를 충전해줍니다',
      en: 'I recharge by spending time alone',
      vi: 'Tôi nạp lại năng lượng bằng cách dành thời gian một mình',
      zh: '独处时我会恢复精力',
    },
  },
  {
    id: 2, axis: 'EI',
    a: {
      ko: '새로운 사람과 대화하는 것이 즐겁습니다',
      en: 'I enjoy talking to new people',
      vi: 'Tôi thích trò chuyện với người mới',
      zh: '我喜欢和新认识的人聊天',
    },
    b: {
      ko: '가까운 소수와 깊은 대화를 선호합니다',
      en: 'I prefer deep conversations with a few close people',
      vi: 'Tôi thích trò chuyện sâu với vài người thân thiết',
      zh: '我更喜欢和少数亲近的人深入交谈',
    },
  },
  {
    id: 3, axis: 'EI',
    a: {
      ko: '생각을 말로 하면서 정리하는 편입니다',
      en: 'I think out loud to organize my thoughts',
      vi: 'Tôi sắp xếp suy nghĩ bằng cách nói ra',
      zh: '我习惯边说边整理思路',
    },
    b: {
      ko: '생각을 충분히 정리한 후에 말합니다',
      en: 'I organize my thoughts fully before speaking',
      vi: 'Tôi sắp xếp suy nghĩ kỹ rồi mới nói',
      zh: '我会先想好再开口说',
    },
  },

  // === S/N (감각/직관) ===
  {
    id: 4, axis: 'SN',
    a: {
      ko: '확실하고 구체적인 사실을 중요하게 생각합니다',
      en: 'I value concrete facts and details',
      vi: 'Tôi coi trọng sự thật cụ thể và chi tiết',
      zh: '我重视具体的事实和细节',
    },
    b: {
      ko: '가능성과 큰 그림을 먼저 봅니다',
      en: 'I focus on possibilities and the big picture first',
      vi: 'Tôi tập trung vào khả năng và bức tranh toàn cảnh',
      zh: '我更关注可能性和全局',
    },
  },
  {
    id: 5, axis: 'SN',
    a: {
      ko: '경험해본 방식대로 하는 것이 편합니다',
      en: 'I prefer doing things the tried-and-true way',
      vi: 'Tôi thích làm theo cách đã được kiểm chứng',
      zh: '我更喜欢用经过验证的方式做事',
    },
    b: {
      ko: '새로운 방법을 시도하는 것을 좋아합니다',
      en: 'I like trying new approaches',
      vi: 'Tôi thích thử cách làm mới',
      zh: '我喜欢尝试新方法',
    },
  },
  {
    id: 6, axis: 'SN',
    a: {
      ko: '현재에 집중하며 실질적인 것을 중시합니다',
      en: 'I focus on the present and practical matters',
      vi: 'Tôi tập trung vào hiện tại và những điều thực tế',
      zh: '我注重当下和实际的事情',
    },
    b: {
      ko: '미래의 가능성과 의미를 더 생각합니다',
      en: 'I think more about future possibilities and meaning',
      vi: 'Tôi suy nghĩ nhiều về khả năng tương lai và ý nghĩa',
      zh: '我更多思考未来的可能性和意义',
    },
  },

  // === T/F (사고/감정) ===
  {
    id: 7, axis: 'TF',
    a: {
      ko: '결정할 때 논리와 공정함을 우선합니다',
      en: 'I prioritize logic and fairness when making decisions',
      vi: 'Tôi ưu tiên logic và sự công bằng khi quyết định',
      zh: '做决定时我优先考虑逻辑和公平',
    },
    b: {
      ko: '결정할 때 사람들의 감정을 먼저 생각합니다',
      en: 'I consider people\'s feelings first when deciding',
      vi: 'Tôi cân nhắc cảm xúc mọi người trước khi quyết định',
      zh: '做决定时我先考虑人们的感受',
    },
  },
  {
    id: 8, axis: 'TF',
    a: {
      ko: '솔직한 비판이 상대를 더 성장시킨다고 봅니다',
      en: 'I believe honest criticism helps people grow',
      vi: 'Tôi tin rằng phê bình thẳng thắn giúp người khác phát triển',
      zh: '我相信诚实的批评能帮助人成长',
    },
    b: {
      ko: '격려와 공감이 상대에게 더 도움이 됩니다',
      en: 'Encouragement and empathy are more helpful',
      vi: 'Sự động viên và đồng cảm có ích hơn',
      zh: '鼓励和共情更有帮助',
    },
  },
  {
    id: 9, axis: 'TF',
    a: {
      ko: '갈등 상황에서 원칙을 지키는 것이 중요합니다',
      en: 'Sticking to principles matters in conflicts',
      vi: 'Giữ nguyên tắc là quan trọng trong xung đột',
      zh: '在冲突中坚持原则很重要',
    },
    b: {
      ko: '갈등 상황에서 조화를 이루는 것이 중요합니다',
      en: 'Maintaining harmony matters in conflicts',
      vi: 'Giữ hòa hợp là quan trọng trong xung đột',
      zh: '在冲突中维持和谐很重要',
    },
  },

  // === J/P (판단/인식) ===
  {
    id: 10, axis: 'JP',
    a: {
      ko: '계획을 세우고 그대로 실행하는 것을 좋아합니다',
      en: 'I like making plans and sticking to them',
      vi: 'Tôi thích lập kế hoạch và thực hiện đúng',
      zh: '我喜欢制定计划并按计划执行',
    },
    b: {
      ko: '상황에 맞게 유연하게 대처하는 것을 좋아합니다',
      en: 'I prefer being flexible and adapting to situations',
      vi: 'Tôi thích linh hoạt và thích ứng với tình huống',
      zh: '我更喜欢灵活应对各种情况',
    },
  },
  {
    id: 11, axis: 'JP',
    a: {
      ko: '할 일 목록을 만들고 하나씩 완료하면 뿌듯합니다',
      en: 'I feel satisfied checking off my to-do list',
      vi: 'Tôi cảm thấy hài lòng khi hoàn thành danh sách việc cần làm',
      zh: '完成待办清单让我感到满足',
    },
    b: {
      ko: '마감 직전에 집중력이 폭발하는 편입니다',
      en: 'I tend to do my best work close to deadlines',
      vi: 'Tôi thường làm việc hiệu quả nhất gần hạn chót',
      zh: '我往往在截止日期前爆发出最大效率',
    },
  },
  {
    id: 12, axis: 'JP',
    a: {
      ko: '정리정돈된 환경에서 편안함을 느낍니다',
      en: 'I feel comfortable in an organized environment',
      vi: 'Tôi cảm thấy thoải mái trong môi trường ngăn nắp',
      zh: '在整洁有序的环境中我感到舒适',
    },
    b: {
      ko: '자유로운 분위기에서 더 창의적입니다',
      en: 'I\'m more creative in a free, open environment',
      vi: 'Tôi sáng tạo hơn trong môi trường tự do, cởi mở',
      zh: '在自由开放的环境中我更有创造力',
    },
  },
];

export type MbtiResult = {
  type: string; // e.g. 'ENFP'
  scores: { E: number; I: number; S: number; N: number; T: number; F: number; J: number; P: number };
};

export function calculateMbti(answers: Record<number, 'a' | 'b'>): MbtiResult {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  for (const q of QUESTIONS) {
    const ans = answers[q.id];
    if (!ans) continue;
    if (q.axis === 'EI') { ans === 'a' ? scores.E++ : scores.I++; }
    if (q.axis === 'SN') { ans === 'a' ? scores.S++ : scores.N++; }
    if (q.axis === 'TF') { ans === 'a' ? scores.T++ : scores.F++; }
    if (q.axis === 'JP') { ans === 'a' ? scores.J++ : scores.P++; }
  }

  const type = [
    scores.E >= scores.I ? 'E' : 'I',
    scores.S >= scores.N ? 'S' : 'N',
    scores.T >= scores.F ? 'T' : 'F',
    scores.J >= scores.P ? 'J' : 'P',
  ].join('');

  return { type, scores };
}
