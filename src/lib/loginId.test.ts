// 아이디 로그인 주소 변환 테스트
import { describe, expect, it } from 'vitest';
import { toLoginEmail } from './loginId';

describe('toLoginEmail', () => {
  it('아이디는 내부 주소로 바꾼다', () => {
    expect(toLoginEmail(' Woori2 ')).toBe('woori2@id.weddingcore.net');
  });
  it('이메일은 그대로 둔다', () => {
    expect(toLoginEmail('woori@woori.com ')).toBe('woori@woori.com');
  });
});
