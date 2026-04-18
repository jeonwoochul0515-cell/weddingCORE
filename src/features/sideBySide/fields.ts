/**
 * 결혼중개업법 제10조의2 상호제공 의무 9개 항목의 구조화된 필드 정의.
 * 각 필드는 다국어 라벨을 가지며, "나란히 보기" UI에서 완전 대응됨.
 */

export type SupportedLang = 'ko' | 'vi' | 'km' | 'zh' | 'uz' | 'en';

export const LANG_LABEL: Record<SupportedLang, string> = {
  ko: '한국어',
  vi: 'Tiếng Việt',
  km: 'ខ្មែរ',
  zh: '中文',
  uz: "O'zbek",
  en: 'English',
};

export type FieldKey =
  | 'maritalHistory'
  | 'hasChildren'
  | 'health'
  | 'criminalRecord'
  | 'occupation'
  | 'income'
  | 'property'
  | 'residence'
  | 'familySituation';

export type FieldDef = {
  key: FieldKey;
  legalBasis: string;
  required: boolean;
  labels: Record<SupportedLang, string>;
  descriptions: Record<SupportedLang, string>;
  inputType: 'text' | 'textarea' | 'number' | 'select';
  options?: Array<{ value: string; labels: Record<SupportedLang, string> }>;
};

export const BG_INFO_FIELDS: FieldDef[] = [
  {
    key: 'maritalHistory',
    legalBasis: '결혼중개업법 §10의2 ① 1호',
    required: true,
    labels: {
      ko: '혼인경력', vi: 'Tình trạng hôn nhân', km: 'ប្រវត្តិអាពាហ៍ពិពាហ៍',
      zh: '婚姻经历', uz: "Nikoh tarixi", en: 'Marital history',
    },
    descriptions: {
      ko: '미혼/이혼/사별 및 횟수, 자녀 유무',
      vi: 'Độc thân/Ly hôn/Góa và số lần, có con hay không',
      km: 'នៅលីវ/លែងលះ/មេម៉ាយ និងចំនួនដង, មានកូនឬអត់',
      zh: '未婚/离婚/丧偶及次数，有无子女',
      uz: "Turmush qurmagan/ajrashgan/beva bo'lgan va necha marta, farzandlari bor-yo'qligi",
      en: 'Single/Divorced/Widowed and count, children status',
    },
    inputType: 'textarea',
  },
  {
    key: 'hasChildren',
    legalBasis: '결혼중개업법 §10의2 ① 1호',
    required: true,
    labels: {
      ko: '자녀 정보', vi: 'Thông tin con', km: 'ព័ត៌មានកូន',
      zh: '子女信息', uz: 'Farzandlar haqida', en: 'Children information',
    },
    descriptions: {
      ko: '자녀 수, 나이, 양육 여부',
      vi: 'Số con, tuổi, nuôi dưỡng',
      km: 'ចំនួនកូន, អាយុ, ការចិញ្ចឹម',
      zh: '子女人数、年龄、抚养情况',
      uz: 'Farzandlar soni, yoshi, tarbiya',
      en: 'Count, ages, custody',
    },
    inputType: 'textarea',
  },
  {
    key: 'health',
    legalBasis: '결혼중개업법 §10의2 ① 2호',
    required: true,
    labels: {
      ko: '건강 상태', vi: 'Tình trạng sức khỏe', km: 'ស្ថានភាពសុខភាព',
      zh: '健康状况', uz: "Sog'liq holati", en: 'Health condition',
    },
    descriptions: {
      ko: '중대 질병·장애·정신질환 이력 포함',
      vi: 'Bao gồm bệnh nặng, khuyết tật, tiền sử tâm thần',
      km: 'រួមទាំងជំងឺធ្ងន់ ពិការភាព និងប្រវត្តិជំងឺផ្លូវចិត្ត',
      zh: '包括重大疾病、残疾、精神疾病史',
      uz: "Og'ir kasalliklar, nogironlik, ruhiy kasalliklar tarixi",
      en: 'Including serious illness, disability, mental health history',
    },
    inputType: 'textarea',
  },
  {
    key: 'criminalRecord',
    legalBasis: '결혼중개업법 §10의2 ① 3호, 아동복지법 §29의3',
    required: true,
    labels: {
      ko: '범죄 경력', vi: 'Tiền án', km: 'ប្រវត្តិព្រហ្មទណ្ឌ',
      zh: '犯罪记录', uz: 'Jinoyat tarixi', en: 'Criminal record',
    },
    descriptions: {
      ko: '성범죄·가정폭력·아동학대 전력 필수 공개',
      vi: 'Bắt buộc công khai tiền án tội tình dục, bạo lực gia đình, ngược đãi trẻ em',
      km: 'ការបង្ហាញជាចាំបាច់នូវប្រវត្តិជួញដូរផ្លូវភេទ អំពើហឹង្សាគ្រួសារ និងកុមារ',
      zh: '必须公开性犯罪、家庭暴力、虐待儿童记录',
      uz: "Jinsiy, oilaviy zo'ravonlik, bolalarga nisbatan zo'ravonlik tarixi majburiy oshkor etilishi",
      en: 'Mandatory disclosure of sex crime, domestic violence, child abuse history',
    },
    inputType: 'textarea',
  },
  {
    key: 'occupation',
    legalBasis: '결혼중개업법 §10의2 ① 4호',
    required: true,
    labels: {
      ko: '직업', vi: 'Nghề nghiệp', km: 'មុខរបរ',
      zh: '职业', uz: 'Kasbi', en: 'Occupation',
    },
    descriptions: {
      ko: '직장명, 직책, 근무기간',
      vi: 'Tên công ty, chức vụ, thời gian làm việc',
      km: 'ឈ្មោះកន្លែងធ្វើការ មុខតំណែង រយៈពេលធ្វើការ',
      zh: '工作单位、职位、工作年限',
      uz: 'Ish joyi, lavozimi, ish staji',
      en: 'Workplace, position, tenure',
    },
    inputType: 'textarea',
  },
  {
    key: 'income',
    legalBasis: '결혼중개업법 §10의2 ① 4호',
    required: true,
    labels: {
      ko: '연소득 (원)', vi: 'Thu nhập hàng năm (KRW)', km: 'ប្រាក់ចំណូលប្រចាំឆ្នាំ (KRW)',
      zh: '年收入 (韩元)', uz: 'Yillik daromad (KRW)', en: 'Annual income (KRW)',
    },
    descriptions: {
      ko: '최근 3년 연소득 기준, F-6 소득요건과 연계',
      vi: 'Dựa trên thu nhập 3 năm gần nhất, liên quan điều kiện thị thực F-6',
      km: 'ផ្អែកលើប្រាក់ចំណូល 3 ឆ្នាំចុងក្រោយ ទាក់ទងនឹងលក្ខខណ្ឌទិដ្ឋាការ F-6',
      zh: '基于近3年收入，与F-6签证收入要求相关',
      uz: "Oxirgi 3 yil daromadi, F-6 viza shartlari bilan bog'liq",
      en: 'Based on last 3 years, tied to F-6 visa income requirement',
    },
    inputType: 'number',
  },
  {
    key: 'property',
    legalBasis: '결혼중개업법 §10의2 ① 4호',
    required: true,
    labels: {
      ko: '재산 상태', vi: 'Tình trạng tài sản', km: 'ស្ថានភាពទ្រព្យសម្បត្តិ',
      zh: '财产状况', uz: 'Mol-mulk holati', en: 'Property status',
    },
    descriptions: {
      ko: '부동산·예금·채무 개괄',
      vi: 'Tổng quan bất động sản, tiền gửi, nợ',
      km: 'ទ្រព្យសម្បត្តិ ប្រាក់បញ្ញើ បំណុល',
      zh: '房产、存款、债务概况',
      uz: "Ko'chmas mulk, omonat, qarz umumiy",
      en: 'Overview of real estate, savings, debts',
    },
    inputType: 'textarea',
  },
  {
    key: 'residence',
    legalBasis: '결혼중개업법 §10의2 ① 4호',
    required: true,
    labels: {
      ko: '거주지 및 주거 형태', vi: 'Nơi ở và loại hình nhà ở', km: 'ទីកន្លែងស្នាក់នៅ និងប្រភេទលំនៅដ្ឋាន',
      zh: '居住地及住房形式', uz: 'Yashash joyi va turi', en: 'Residence and housing type',
    },
    descriptions: {
      ko: '자가/전세/월세, 가족 동거 여부',
      vi: 'Sở hữu/đặt cọc/thuê, ở với gia đình hay không',
      km: 'ផ្ទះផ្ទាល់ខ្លួន/ជួល ការរស់នៅជាមួយគ្រួសារ',
      zh: '自有/租赁，是否与家人同住',
      uz: "Shaxsiy/ijara, oila bilan yashash",
      en: 'Owned/lease, living with family or not',
    },
    inputType: 'textarea',
  },
  {
    key: 'familySituation',
    legalBasis: '결혼중개업법 §10의2 ① 4호',
    required: true,
    labels: {
      ko: '가족관계', vi: 'Quan hệ gia đình', km: 'ទំនាក់ទំនងគ្រួសារ',
      zh: '家庭关系', uz: 'Oila munosabatlari', en: 'Family relations',
    },
    descriptions: {
      ko: '부모·형제자매, 동거 여부, 부양의무',
      vi: 'Cha mẹ, anh chị em, sống chung, nghĩa vụ phụng dưỡng',
      km: 'ឪពុកម្ដាយ បងប្អូន ការរស់នៅរួម កាតព្វកិច្ចចិញ្ចឹម',
      zh: '父母、兄弟姐妹，是否同住，赡养义务',
      uz: "Ota-ona, aka-uka-opa-singil, birga yashash, ta'minlash majburiyati",
      en: 'Parents, siblings, cohabitation, support obligation',
    },
    inputType: 'textarea',
  },
];

export function fieldLabel(key: FieldKey, lang: SupportedLang): string {
  const f = BG_INFO_FIELDS.find((x) => x.key === key);
  return f?.labels[lang] ?? key;
}

export function fieldDescription(key: FieldKey, lang: SupportedLang): string {
  const f = BG_INFO_FIELDS.find((x) => x.key === key);
  return f?.descriptions[lang] ?? '';
}
