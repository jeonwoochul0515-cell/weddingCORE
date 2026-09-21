// 18세 미만 소개 금지 — 나이 셈의 경계를 못 박는다
//
// 이 판정 하나로 고객 등록·엑셀 가져오기·후보 명부·맞선 만들기가 전부 막히거나 열린다.
// 하루 차이로 틀리면 멀쩡한 건이 막히거나, 막아야 할 건이 열린다.
import { describe, expect, it } from 'vitest';
import {
  ageOfDateString,
  ageOnDate,
  isIntroducible,
  MINIMUM_INTRODUCTION_AGE,
} from './introductionAge';

const NOW = new Date(2026, 8, 21); // 2026-09-21 (로컬 기준. 입력칸도 로컬로 읽는다)

describe('ageOnDate', () => {
  it('생일이 지났으면 그해 나이를 센다', () => {
    expect(ageOnDate(new Date(2006, 0, 13), NOW)).toBe(20);
  });

  it('생일이 아직 안 왔으면 한 살 뺀다', () => {
    expect(ageOnDate(new Date(2006, 11, 31), NOW)).toBe(19);
  });

  it('생일 당일은 이미 그 나이다', () => {
    expect(ageOnDate(new Date(2008, 8, 21), NOW)).toBe(18);
  });
});

describe('ageOfDateString', () => {
  it('입력칸 값을 그대로 읽는다', () => {
    expect(ageOfDateString('2008-09-21', NOW)).toBe(18);
  });

  it('하루 전이면 아직 17세다 (경계)', () => {
    expect(ageOfDateString('2008-09-22', NOW)).toBe(17);
  });

  it('비어 있으면 null', () => {
    expect(ageOfDateString('', NOW)).toBeNull();
  });

  it('읽을 수 없는 값도 null', () => {
    expect(ageOfDateString('아무거나', NOW)).toBeNull();
  });
});

describe('isIntroducible', () => {
  it('18세부터 소개할 수 있다', () => {
    expect(isIntroducible(MINIMUM_INTRODUCTION_AGE)).toBe(true);
  });

  it('17세는 막는다', () => {
    expect(isIntroducible(17)).toBe(false);
  });

  it('★ 나이를 모르면 막는다 — 「몰랐다」는 항변은 재결례에서 서지 않았다', () => {
    expect(isIntroducible(null)).toBe(false);
  });
});
