export type MbtiLang = 'ko' | 'en' | 'vi' | 'zh';

type Localized = Record<MbtiLang, string>;

export const UI: Record<string, Localized> = {
  title: {
    ko: '간단 MBTI 성격유형 테스트',
    en: 'Quick MBTI Personality Test',
    vi: 'Trắc nghiệm tính cách MBTI nhanh',
    zh: 'MBTI 性格类型快速测试',
  },
  subtitle: {
    ko: '12개 질문으로 나의 MBTI를 알아보세요',
    en: 'Discover your MBTI in 12 questions',
    vi: 'Khám phá MBTI của bạn qua 12 câu hỏi',
    zh: '通过12个问题了解您的MBTI',
  },
  q_of: {
    ko: '/ 12 질문',
    en: '/ 12 questions',
    vi: '/ 12 câu hỏi',
    zh: '/ 12 题',
  },
  btn_a: {
    ko: '이쪽이 나와 더 가까워요',
    en: 'This is more like me',
    vi: 'Điều này giống tôi hơn',
    zh: '这个更像我',
  },
  btn_b: {
    ko: '이쪽이 나와 더 가까워요',
    en: 'This is more like me',
    vi: 'Điều này giống tôi hơn',
    zh: '这个更像我',
  },
  result_title: {
    ko: '당신의 MBTI 결과',
    en: 'Your MBTI Result',
    vi: 'Kết quả MBTI của bạn',
    zh: '您的MBTI结果',
  },
  btn_retry: {
    ko: '다시 테스트',
    en: 'Try again',
    vi: 'Thử lại',
    zh: '重新测试',
  },
  btn_save: {
    ko: '이 결과를 프로필에 저장',
    en: 'Save to my profile',
    vi: 'Lưu vào hồ sơ',
    zh: '保存到个人资料',
  },
  disclaimer: {
    ko: '본 테스트는 간이 성격 유형 참고용이며, 공식 MBTI 검사를 대체하지 않습니다.',
    en: 'This is a simplified personality reference test and does not replace the official MBTI assessment.',
    vi: 'Đây là bài trắc nghiệm tính cách tham khảo đơn giản, không thay thế bài kiểm tra MBTI chính thức.',
    zh: '本测试仅供性格类型参考，不能替代正式MBTI测评。',
  },
};

export function mt(key: string, lang: MbtiLang): string {
  return UI[key]?.[lang] ?? UI[key]?.ko ?? key;
}
