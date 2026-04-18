import type { MbtiLang } from './i18n';

type Localized = Record<MbtiLang, string>;

type MbtiDesc = {
  title: Localized;
  desc: Localized;
  keywords: Localized;
};

export const MBTI_DESCRIPTIONS: Record<string, MbtiDesc> = {
  ISTJ: {
    title: { ko: '청렴결백한 논리주의자', en: 'The Inspector', vi: 'Nhà thanh tra', zh: '检查员' },
    desc: {
      ko: '책임감이 강하고 성실합니다. 규칙과 전통을 중시하며 맡은 일을 끝까지 해냅니다.',
      en: 'Responsible and reliable. Values rules and traditions, and follows through on commitments.',
      vi: 'Có trách nhiệm và đáng tin cậy. Coi trọng quy tắc và truyền thống, hoàn thành cam kết.',
      zh: '负责可靠。重视规则和传统，对承诺有始有终。',
    },
    keywords: { ko: '성실, 체계적, 신뢰', en: 'Diligent, Systematic, Trustworthy', vi: 'Siêng năng, Có hệ thống, Đáng tin cậy', zh: '勤勉、有条理、值得信赖' },
  },
  ISFJ: {
    title: { ko: '용감한 수호자', en: 'The Protector', vi: 'Người bảo vệ', zh: '守护者' },
    desc: {
      ko: '따뜻하고 헌신적입니다. 주변 사람들을 세심하게 챙기며 안정적인 관계를 만듭니다.',
      en: 'Warm and devoted. Takes care of others attentively and builds stable relationships.',
      vi: 'Ấm áp và tận tụy. Quan tâm chu đáo đến người khác và xây dựng mối quan hệ ổn định.',
      zh: '温暖而忠诚。细心照顾他人，建立稳定的关系。',
    },
    keywords: { ko: '헌신, 배려, 안정', en: 'Devoted, Caring, Stable', vi: 'Tận tụy, Quan tâm, Ổn định', zh: '奉献、体贴、稳定' },
  },
  INFJ: {
    title: { ko: '선의의 옹호자', en: 'The Advocate', vi: 'Người ủng hộ', zh: '提倡者' },
    desc: {
      ko: '이상주의적이고 통찰력이 뛰어납니다. 깊은 공감 능력으로 의미 있는 관계를 추구합니다.',
      en: 'Idealistic with great insight. Seeks meaningful connections through deep empathy.',
      vi: 'Lý tưởng với tầm nhìn sâu sắc. Tìm kiếm kết nối ý nghĩa qua sự đồng cảm sâu sắc.',
      zh: '理想主义，洞察力强。通过深层共情追求有意义的关系。',
    },
    keywords: { ko: '통찰, 공감, 이상', en: 'Insightful, Empathetic, Idealistic', vi: 'Sâu sắc, Đồng cảm, Lý tưởng', zh: '洞察、共情、理想主义' },
  },
  INTJ: {
    title: { ko: '용의주도한 전략가', en: 'The Architect', vi: 'Kiến trúc sư', zh: '建筑师' },
    desc: {
      ko: '독립적이고 전략적입니다. 높은 기준을 가지고 효율적으로 목표를 달성합니다.',
      en: 'Independent and strategic. Achieves goals efficiently with high standards.',
      vi: 'Độc lập và có chiến lược. Đạt mục tiêu hiệu quả với tiêu chuẩn cao.',
      zh: '独立且有策略。以高标准高效达成目标。',
    },
    keywords: { ko: '전략, 독립, 효율', en: 'Strategic, Independent, Efficient', vi: 'Chiến lược, Độc lập, Hiệu quả', zh: '战略、独立、高效' },
  },
  ISTP: {
    title: { ko: '만능 재주꾼', en: 'The Craftsperson', vi: 'Nghệ nhân', zh: '鉴赏家' },
    desc: {
      ko: '분석적이고 실용적입니다. 문제를 빠르게 파악하고 손으로 해결하는 것을 좋아합니다.',
      en: 'Analytical and practical. Quick at identifying problems and enjoys hands-on solutions.',
      vi: 'Phân tích và thực tế. Nhanh chóng xác định vấn đề và thích giải pháp thực hành.',
      zh: '善于分析，注重实际。快速发现问题，喜欢动手解决。',
    },
    keywords: { ko: '분석, 실용, 유연', en: 'Analytical, Practical, Flexible', vi: 'Phân tích, Thực tế, Linh hoạt', zh: '分析、实用、灵活' },
  },
  ISFP: {
    title: { ko: '호기심 많은 예술가', en: 'The Composer', vi: 'Nhà soạn nhạc', zh: '探险家' },
    desc: {
      ko: '온화하고 감성적입니다. 자신만의 가치관을 중시하며 조화로운 삶을 추구합니다.',
      en: 'Gentle and sensitive. Values personal beliefs and seeks a harmonious life.',
      vi: 'Dịu dàng và nhạy cảm. Coi trọng giá trị cá nhân và tìm kiếm cuộc sống hài hòa.',
      zh: '温和而感性。重视个人价值观，追求和谐生活。',
    },
    keywords: { ko: '감성, 조화, 자유', en: 'Sensitive, Harmonious, Free', vi: 'Nhạy cảm, Hài hòa, Tự do', zh: '感性、和谐、自由' },
  },
  INFP: {
    title: { ko: '열정적인 중재자', en: 'The Mediator', vi: 'Người hòa giải', zh: '调停者' },
    desc: {
      ko: '이상주의적이고 창의적입니다. 진정성 있는 관계를 소중히 여기며 자신의 가치를 지킵니다.',
      en: 'Idealistic and creative. Treasures authentic relationships and stays true to values.',
      vi: 'Lý tưởng và sáng tạo. Trân trọng mối quan hệ chân thành và giữ vững giá trị.',
      zh: '理想主义且富有创造力。珍视真诚的关系，坚守自己的价值观。',
    },
    keywords: { ko: '이상, 창의, 진정성', en: 'Idealistic, Creative, Authentic', vi: 'Lý tưởng, Sáng tạo, Chân thành', zh: '理想、创意、真诚' },
  },
  INTP: {
    title: { ko: '논리적인 사색가', en: 'The Thinker', vi: 'Nhà tư tưởng', zh: '逻辑学家' },
    desc: {
      ko: '호기심이 강하고 분석적입니다. 복잡한 문제를 이론적으로 탐구하는 것을 즐깁니다.',
      en: 'Curious and analytical. Enjoys exploring complex problems theoretically.',
      vi: 'Tò mò và phân tích. Thích khám phá các vấn đề phức tạp một cách lý thuyết.',
      zh: '好奇心强，善于分析。喜欢从理论角度探索复杂问题。',
    },
    keywords: { ko: '논리, 호기심, 분석', en: 'Logical, Curious, Analytical', vi: 'Logic, Tò mò, Phân tích', zh: '逻辑、好奇、分析' },
  },
  ESTP: {
    title: { ko: '모험을 즐기는 사업가', en: 'The Dynamo', vi: 'Nhà năng động', zh: '企业家' },
    desc: {
      ko: '활동적이고 현실적입니다. 즉각적인 결과를 만들어내며 위기 대처 능력이 뛰어납니다.',
      en: 'Active and realistic. Produces immediate results and excels in crisis situations.',
      vi: 'Năng động và thực tế. Tạo kết quả ngay lập tức và xuất sắc trong tình huống khẩn cấp.',
      zh: '积极务实。能立即产出成果，善于应对危机。',
    },
    keywords: { ko: '행동, 현실, 대담', en: 'Action, Realistic, Bold', vi: 'Hành động, Thực tế, Táo bạo', zh: '行动、现实、大胆' },
  },
  ESFP: {
    title: { ko: '자유로운 영혼의 연예인', en: 'The Performer', vi: 'Người biểu diễn', zh: '表演者' },
    desc: {
      ko: '사교적이고 낙천적입니다. 주변 사람들에게 즐거움을 주며 순간을 즐깁니다.',
      en: 'Social and optimistic. Brings joy to others and lives in the moment.',
      vi: 'Hòa đồng và lạc quan. Mang lại niềm vui cho người khác và tận hưởng khoảnh khắc.',
      zh: '善于社交，乐观开朗。给周围人带来快乐，享受当下。',
    },
    keywords: { ko: '즐거움, 사교, 낙천', en: 'Fun, Social, Optimistic', vi: 'Vui vẻ, Hòa đồng, Lạc quan', zh: '快乐、社交、乐观' },
  },
  ENFP: {
    title: { ko: '재기발랄한 활동가', en: 'The Champion', vi: 'Nhà vô địch', zh: '竞选者' },
    desc: {
      ko: '열정적이고 창의적입니다. 새로운 가능성에 흥분하며 사람들에게 영감을 줍니다.',
      en: 'Enthusiastic and creative. Gets excited by new possibilities and inspires others.',
      vi: 'Nhiệt tình và sáng tạo. Hào hứng với khả năng mới và truyền cảm hứng cho người khác.',
      zh: '热情且富有创造力。为新的可能性而兴奋，能激励他人。',
    },
    keywords: { ko: '열정, 영감, 창의', en: 'Passionate, Inspiring, Creative', vi: 'Đam mê, Truyền cảm hứng, Sáng tạo', zh: '热情、激励、创意' },
  },
  ENTP: {
    title: { ko: '뜨거운 논쟁을 즐기는 변론가', en: 'The Visionary', vi: 'Nhà tầm nhìn', zh: '辩论家' },
    desc: {
      ko: '재치 있고 도전적입니다. 토론을 즐기며 새로운 아이디어를 끊임없이 탐구합니다.',
      en: 'Witty and challenging. Enjoys debate and constantly explores new ideas.',
      vi: 'Hóm hỉnh và thách thức. Thích tranh luận và không ngừng khám phá ý tưởng mới.',
      zh: '机智而好挑战。享受辩论，不断探索新想法。',
    },
    keywords: { ko: '재치, 도전, 혁신', en: 'Witty, Challenging, Innovative', vi: 'Hóm hỉnh, Thách thức, Đổi mới', zh: '机智、挑战、创新' },
  },
  ESTJ: {
    title: { ko: '엄격한 관리자', en: 'The Supervisor', vi: 'Người giám sát', zh: '总经理' },
    desc: {
      ko: '체계적이고 결단력이 있습니다. 조직을 이끌며 효율적으로 목표를 달성합니다.',
      en: 'Organized and decisive. Leads organizations and achieves goals efficiently.',
      vi: 'Có tổ chức và quyết đoán. Lãnh đạo tổ chức và đạt mục tiêu hiệu quả.',
      zh: '有条理且果断。领导组织，高效达成目标。',
    },
    keywords: { ko: '리더십, 체계, 결단', en: 'Leadership, Organized, Decisive', vi: 'Lãnh đạo, Có tổ chức, Quyết đoán', zh: '领导力、有条理、果断' },
  },
  ESFJ: {
    title: { ko: '사교적인 외교관', en: 'The Provider', vi: 'Người cung ứng', zh: '执政官' },
    desc: {
      ko: '친절하고 사교적입니다. 주변 사람들의 필요를 파악하고 돌보는 것을 좋아합니다.',
      en: 'Kind and social. Enjoys identifying and caring for the needs of others.',
      vi: 'Tốt bụng và hòa đồng. Thích nhận biết và chăm sóc nhu cầu của người khác.',
      zh: '友善而善于社交。喜欢了解并照顾他人的需求。',
    },
    keywords: { ko: '친절, 돌봄, 사교', en: 'Kind, Caring, Social', vi: 'Tốt bụng, Quan tâm, Hòa đồng', zh: '友善、关爱、社交' },
  },
  ENFJ: {
    title: { ko: '정의로운 사회운동가', en: 'The Teacher', vi: 'Người thầy', zh: '主人公' },
    desc: {
      ko: '카리스마 있고 공감 능력이 뛰어납니다. 다른 사람의 성장을 이끄는 것을 좋아합니다.',
      en: 'Charismatic with great empathy. Loves guiding others toward growth.',
      vi: 'Có sức hút với khả năng đồng cảm tuyệt vời. Thích dẫn dắt người khác phát triển.',
      zh: '有魅力，共情能力强。喜欢引导他人成长。',
    },
    keywords: { ko: '카리스마, 공감, 성장', en: 'Charismatic, Empathetic, Growth', vi: 'Sức hút, Đồng cảm, Phát triển', zh: '魅力、共情、成长' },
  },
  ENTJ: {
    title: { ko: '대담한 통솔자', en: 'The Commander', vi: 'Chỉ huy', zh: '指挥官' },
    desc: {
      ko: '자신감 있고 결단력이 뛰어납니다. 비전을 제시하고 팀을 이끌어 목표를 달성합니다.',
      en: 'Confident and decisive. Sets vision and leads teams to achieve goals.',
      vi: 'Tự tin và quyết đoán. Đề ra tầm nhìn và dẫn dắt đội nhóm đạt mục tiêu.',
      zh: '自信果断。制定愿景并带领团队达成目标。',
    },
    keywords: { ko: '리더십, 비전, 결단', en: 'Leadership, Vision, Decisive', vi: 'Lãnh đạo, Tầm nhìn, Quyết đoán', zh: '领导力、愿景、果断' },
  },
};
