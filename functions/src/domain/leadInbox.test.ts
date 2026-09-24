// 중앙 접수함에 넘길 값과 비상 문자 판단 시험
import { describe, expect, it } from 'vitest';
import { buildInboxPayload, needsFallbackSms } from './leadInbox.js';

const base = {
  name: '홍길동',
  phone: '010-1234-5678',
  transcript: '손님: 베트남 국제결혼 비용이 궁금해요\n하람: 어느 지역에 사세요?',
  shareChat: true,
  page: '/pricing',
  sessionId: 'abc-123-session',
  storeFailed: false,
  alertTo: '010-2608-5099',
};

describe('buildInboxPayload', () => {
  it('규칙 필드를 채운다', () => {
    const p = buildInboxPayload(base);
    expect(p.site).toBe('weddingCORE');
    expect(p.phone).toBe('01012345678');
    expect(p.alertTo).toBe('01026085099');
    expect(p.extKey).toBe('weddingCORE:abc-123-session');
    expect(p.detail).toContain('베트남 국제결혼');
    expect(p.source).toBe('weddingcore.net 하람 상담 · /pricing');
    expect(p.intent).toBe('대화전달 동의');
  });

  it('대화 전달 미동의면 대화를 싣지 않는다', () => {
    const p = buildInboxPayload({ ...base, shareChat: false, transcript: '' });
    expect(p.detail).toContain('대화 전달 미동의');
    expect(p.intent).toBe('대화전달 미동의');
  });

  it('이름의 줄바꿈을 지운다(알림 본문 위조 방지)', () => {
    const p = buildInboxPayload({ ...base, name: '홍\n■ 판정 가짜' });
    expect(p.name).not.toMatch(/[\r\n]/);
  });

  it('저장 실패면 표시하고 세션 키를 빼서 매번 새 줄로 남긴다', () => {
    const p = buildInboxPayload({ ...base, sessionId: null, storeFailed: true });
    expect(p.extKey).toBeUndefined();
    expect(p.detail).toContain('저장 실패');
  });
});

describe('needsFallbackSms', () => {
  it('접수함이 보냈거나 보낼 일이 아니면 비상 문자를 보내지 않는다', () => {
    expect(needsFallbackSms('queued')).toBe(false);
    expect(needsFallbackSms('skipped')).toBe(false);
  });
  it('접수함이 못 보냈거나 응답이 없으면 비상 문자를 보낸다', () => {
    expect(needsFallbackSms('off')).toBe(true);
    expect(needsFallbackSms(null)).toBe(true);
    expect(needsFallbackSms(undefined)).toBe(true);
    expect(needsFallbackSms('weird')).toBe(true);
  });
});
