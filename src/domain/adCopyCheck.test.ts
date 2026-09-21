// 광고 문구 점검 — 제12조에 걸리는 말을 잡는지, 멀쩡한 문구를 붙잡지 않는지
import { describe, expect, it } from 'vitest';
import { checkAdCopy } from './adCopyCheck';

const REG = '제2019-경기김포-0007호';
/** 등록번호가 들어 있는 정상 문구. 각 시험은 여기에 한 줄씩 더한다 */
const CLEAN = `국제결혼 상담을 도와드립니다. 절차와 비용은 상담 때 그대로 안내합니다.
국제결혼중개업 등록번호 ${REG}`;

const phrases = (t: string, reg?: string) => checkAdCopy(t, reg).findings.map((f) => f.phrase);
const blocks = (t: string, reg?: string) =>
  checkAdCopy(t, reg).findings.filter((f) => f.severity === 'block');

describe('checkAdCopy — 통과', () => {
  it('근거 있는 문구는 붙잡지 않는다', () => {
    const v = checkAdCopy(CLEAN, REG);
    expect(v.ok).toBe(true);
    expect(v.findings).toHaveLength(0);
  });

  it('빈 글은 통과가 아니다', () => {
    expect(checkAdCopy('   ', REG).ok).toBe(false);
  });
});

describe('checkAdCopy — 제12조 ③ 등록번호', () => {
  it('등록번호가 없으면 막는다', () => {
    const v = checkAdCopy('국제결혼 상담해 드립니다.');
    expect(v.ok).toBe(false);
    expect(v.findings[0]?.legalBasis).toContain('제12조 ③');
  });

  it('업체 번호를 넘기면 그 번호가 실제로 있는지까지 본다', () => {
    const wrong = `상담 도와드립니다. 국제결혼중개업 등록번호 제2011-서울강남-0001호`;
    expect(blocks(wrong, REG)).toHaveLength(1);
  });

  it('띄어쓰기와 하이픈이 달라도 같은 번호로 본다', () => {
    const spaced = `상담 도와드립니다. 국제결혼중개업 등록번호 제 2019 경기김포 0007호`;
    expect(checkAdCopy(spaced, REG).ok).toBe(true);
  });
});

describe('checkAdCopy — 제12조 ① 거짓·과장', () => {
  it('성혼 보장을 잡는다', () => {
    expect(phrases(`성혼 보장! ${CLEAN}`, REG)).toContain('성혼 보장');
  });

  it('성사율 수치를 잡는다', () => {
    expect(blocks(`성사율 92% 달성. ${CLEAN}`, REG).length).toBeGreaterThan(0);
  });

  it('업계 1위를 잡는다', () => {
    expect(blocks(`업계 1위 업체입니다. ${CLEAN}`, REG).length).toBeGreaterThan(0);
  });

  it('기간 확정을 잡는다', () => {
    expect(blocks(`3개월이면 결혼합니다. ${CLEAN}`, REG).length).toBeGreaterThan(0);
  });

  it('추가 비용 0원을 잡는다', () => {
    expect(blocks(`추가 비용 0원. ${CLEAN}`, REG).length).toBeGreaterThan(0);
  });

  it('같은 말이 여러 번 나와도 한 줄로만 말한다', () => {
    const v = checkAdCopy(`성혼 보장. 성혼 보장. 성혼 보장. ${CLEAN}`, REG);
    expect(v.findings.filter((f) => f.phrase === '성혼 보장')).toHaveLength(1);
  });
});

describe('checkAdCopy — 인권·차별', () => {
  it('사람을 물건처럼 부르는 말을 잡는다', () => {
    const v = checkAdCopy(`착하고 순종적인 신붓감을 데려옵니다. ${CLEAN}`, REG);
    expect(v.ok).toBe(false);
    expect(v.findings.some((f) => f.legalBasis.includes('인신매매'))).toBe(true);
  });

  it('국가로 사람을 일반화하는 말을 잡는다', () => {
    expect(blocks(`베트남 여성은 다 가정적입니다. ${CLEAN}`, REG).length).toBeGreaterThan(0);
  });

  it('★ 미성년을 떠올리게 하는 말은 제12조의2까지 근거로 든다', () => {
    const v = checkAdCopy(`어린 신부 소개합니다. ${CLEAN}`, REG);
    expect(v.findings.some((f) => f.legalBasis.includes('제12조의2'))).toBe(true);
  });
});

describe('checkAdCopy — 제12조 ② 거짓 정보', () => {
  it('비자가 나온다고 단정하면 잡는다', () => {
    const v = checkAdCopy(`비자 나옵니다. 걱정 마세요. ${CLEAN}`, REG);
    expect(v.findings.some((f) => f.legalBasis.includes('제12조 ②'))).toBe(true);
  });
});

describe('checkAdCopy — 우리 원칙은 막지 않는다', () => {
  it('★ AI 언급은 경고만 한다 — 법에 없는 요구를 법이라고 하지 않는다', () => {
    const v = checkAdCopy(`AI가 씁니다. ${CLEAN}`, REG);
    expect(v.ok).toBe(true);
    expect(v.findings[0]?.severity).toBe('warn');
    expect(v.findings[0]?.legalBasis).toContain('운영 원칙');
  });

  it('「도망」 같은 말도 경고까지만 한다', () => {
    const v = checkAdCopy(`도망 걱정 없습니다. ${CLEAN}`, REG);
    expect(v.findings.some((f) => f.severity === 'warn')).toBe(true);
  });
});
