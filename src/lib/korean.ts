// 우리말 조사 고르기와 전화번호 표기 — 화면 문구가 "「그 나라 허용 여부」을"처럼 어색해지지 않게 한다

/** 마지막 글자에 받침이 있는가. 한글이 아니면(숫자·영문) 받침 없음으로 본다 */
function hasFinalConsonant(word: string) {
  const last = word.trim().replace(/[)\]」』】>》]+$/, '').slice(-1);
  const code = last.charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/**
 * 앞말에 맞는 조사를 돌려준다.
 * josa('여부', '을/를') → '를' · josa('업체명', '을/를') → '을'
 */
export function josa(word: string, pair: '을/를' | '이/가' | '은/는' | '와/과') {
  const [withFinal, withoutFinal] = pair.split('/');
  return hasFinalConsonant(word) ? withFinal! : withoutFinal!;
}

/** 010-1234-5678 꼴로 맞춘다. 저장된 값이 숫자만이어도 화면에서는 읽기 좋게 보인다 */
export function formatPhone(value: string) {
  const d = (value ?? '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return (value ?? '').trim();
}
