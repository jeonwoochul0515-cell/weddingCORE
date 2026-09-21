// 18세 미만은 소개하지 않는다
//
// 결혼중개업법 제12조의2 ① 1호는 국제결혼중개업자가 「18세 미만인 사람을 소개하는 행위」를
// 금지한다. 위반하면 등록취소·영업정지(제18조 ① 18호)와 3년 이하 징역 또는 3천만원 이하
// 벌금(제26조 ② 9호)이 따른다. 실제로 18세 미만 상대를 소개한 사실이 인정되어 영업정지
// 3개월이 유지되고 벌금 50만원 처분이 함께 있었던 사건이 있다(src/content/rulings.ts).
//
// 그래서 나이는 경고가 아니라 **차단**이다. 값이 한 곳에만 있어야 화면마다 기준이 달라지지
// 않는다 — 고객 등록(직접·엑셀), 후보 명부, 맞선 만들기가 모두 여기를 본다.
// 서버 쪽 판정은 functions/src/domain/videoCallGate.ts가 따로 들고 있다. 두 벌인 이유는
// 화면 코드를 사용자가 고칠 수 있기 때문이다 — 막는 곳은 서버, 알려 주는 곳은 화면이다.

/** 소개할 수 있는 최저 나이. 민법 제807조의 혼인적령과 같은 18세다 */
export const MINIMUM_INTRODUCTION_AGE = 18;

/** 기준일에 만 나이가 몇인가 */
export function ageOnDate(birth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * 'YYYY-MM-DD' 입력칸 값에서 만 나이. 읽을 수 없으면 null.
 *
 * null을 「괜찮다」로 읽으면 안 된다. 나이를 확인하지 못한 것이고, 재결례는
 * 「몰랐다」는 항변을 받아 주지 않았다. 부르는 쪽에서 막아야 한다.
 */
export function ageOfDateString(value: string, now: Date = new Date()): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return ageOnDate(parsed, now);
}

/** 소개할 수 있는 나이인가. 나이를 모르면 아니다 */
export function isIntroducible(age: number | null): age is number {
  return age !== null && age >= MINIMUM_INTRODUCTION_AGE;
}
