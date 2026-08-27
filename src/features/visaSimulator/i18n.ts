export type UiLang = 'ko' | 'en' | 'vi';

export const UI = {
  title: {
    ko: 'F-6 결혼이민 비자 시뮬레이터',
    en: 'F-6 Marriage Visa Simulator',
    vi: 'Trình mô phỏng thị thực F-6 (Kết hôn)',
  },
  subtitle: {
    ko: '신청 전 필수요건과 준비도를 점검하세요',
    en: 'Check requirements and readiness before applying',
    vi: 'Kiểm tra yêu cầu và mức độ sẵn sàng trước khi nộp đơn',
  },
  step: {
    inviter:   { ko: '초청인 정보', en: 'Inviter info', vi: 'Thông tin người mời' },
    household: { ko: '가구·경제',   en: 'Household & finance', vi: 'Hộ gia đình & tài chính' },
    housing:   { ko: '주거',         en: 'Housing', vi: 'Nhà ở' },
    partner:   { ko: '배우자 정보',  en: 'Spouse info', vi: 'Thông tin vợ/chồng' },
    sincerity: { ko: '혼인 진정성',  en: 'Sincerity', vi: 'Tính chân thực' },
    other:     { ko: '기타 요건',    en: 'Other requirements', vi: 'Yêu cầu khác' },
  },
  button: {
    next:    { ko: '다음', en: 'Next', vi: 'Tiếp' },
    prev:    { ko: '이전', en: 'Previous', vi: 'Trước' },
    submit:  { ko: '시뮬레이션 실행', en: 'Run simulation', vi: 'Chạy mô phỏng' },
    reset:   { ko: '다시 시작', en: 'Restart', vi: 'Bắt đầu lại' },
    print:   { ko: '인쇄 / PDF 저장', en: 'Print / Save PDF', vi: 'In / Lưu PDF' },
    consult: { ko: '변호사 상담', en: 'Lawyer consultation', vi: 'Tư vấn luật sư' },
  },
  result: {
    probability:  { ko: '준비도 점수', en: 'Readiness score', vi: 'Điểm sẵn sàng' },
    visaType:     { ko: '비자 유형',   en: 'Visa type', vi: 'Loại thị thực' },
    incomeScore:  { ko: '소득 점수',   en: 'Income score', vi: 'Điểm thu nhập' },
    sincerityScore: { ko: '진정성 점수', en: 'Sincerity score', vi: 'Điểm chân thực' },
    housingScore: { ko: '주거 점수',   en: 'Housing score', vi: 'Điểm nhà ở' },
    blockers:     { ko: '심사 차단 사유', en: 'Hard blockers', vi: 'Yếu tố chặn xét duyệt' },
    recommend:    { ko: '보완 필요 사항', en: 'Recommendations', vi: 'Khuyến nghị' },
    incomeDetail: { ko: '소득 분석',   en: 'Income analysis', vi: 'Phân tích thu nhập' },
  },
  disclaimer: {
    ko: '본 점수는 2026년 공개 소득기준과 내부 체크리스트에 따른 준비도이며 승인 확률이 아닙니다. 예외·재외공관별 서류와 실제 심사 결과는 달라질 수 있고 법률 자문을 대체하지 않습니다.',
    en: 'This is a readiness score based on the published 2026 income threshold and an internal checklist, not an approval probability or legal advice.',
    vi: 'Đây là điểm sẵn sàng dựa trên chuẩn thu nhập công bố năm 2026 và danh sách kiểm tra nội bộ, không phải xác suất được cấp visa hay tư vấn pháp lý.',
  },
  severity: {
    blocker:  { ko: '차단', en: 'Blocker', vi: 'Chặn' },
    critical: { ko: '치명', en: 'Critical', vi: 'Nghiêm trọng' },
    warning:  { ko: '경고', en: 'Warning', vi: 'Cảnh báo' },
    info:     { ko: '참고', en: 'Info', vi: 'Tham khảo' },
  },
} as const;

export function t(
  key: keyof typeof UI | string,
  subkey: string,
  lang: UiLang,
): string {
  const root = (UI as unknown as Record<string, Record<string, Record<UiLang, string>>>)[key as string];
  if (!root) return subkey;
  const entry = root[subkey];
  return entry?.[lang] ?? entry?.ko ?? subkey;
}
