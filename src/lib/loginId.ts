// 이메일 대신 짧은 아이디(예: woori2)로 만든 업체 계정을 로그인용 내부 주소로 바꾼다
// 로그인 서비스는 이메일만 받으므로 아이디 계정은 메일을 받지 않는 내부 주소로 만든다(2026-09-24).
export const LOGIN_ID_DOMAIN = 'id.weddingcore.net';

export function toLoginEmail(input: string): string {
  const v = input.trim();
  return v.includes('@') ? v : `${v.toLowerCase()}@${LOGIN_ID_DOMAIN}`;
}
