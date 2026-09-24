// 로그인 뒤 돌아갈 주소 고르기 시험 — 업체 화면만 받고 바깥 주소는 버리는지
import { describe, expect, it } from 'vitest';
import { agencyReturnPath } from './returnPath';

describe('agencyReturnPath', () => {
  it('접수 링크를 쿼리까지 그대로 돌려준다', () => {
    expect(agencyReturnPath({ pathname: '/agency/clients', search: '?tab=leads&lead=AbC123xyz' })).toBe(
      '/agency/clients?tab=leads&lead=AbC123xyz',
    );
  });
  it('업체 화면이 아니면 버린다', () => {
    expect(agencyReturnPath({ pathname: '/admin/agencies', search: '' })).toBeNull();
    expect(agencyReturnPath({ pathname: '//evil.com/agency', search: '' })).toBeNull();
    expect(agencyReturnPath({ pathname: '/agencyx', search: '' })).toBeNull();
    expect(agencyReturnPath(null)).toBeNull();
    expect(agencyReturnPath({ pathname: 42 })).toBeNull();
  });
  it('이상한 쿼리는 떼고 경로만 남긴다', () => {
    expect(agencyReturnPath({ pathname: '/agency', search: '?x=<script>' })).toBe('/agency');
  });
});
