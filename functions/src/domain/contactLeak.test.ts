// 연락처 교환 탐지 검증 — 계약 위반 청구의 증거가 되는 자리다
import { describe, expect, it } from 'vitest';
import {
  detectContactLeak,
  normalizeSpokenDigits,
  scanTranscript,
  type TranscriptSegment,
} from './contactLeak.js';

const kinds = (text: string) => detectContactLeak(text).map((l) => l.kind);

describe('normalizeSpokenDigits', () => {
  it('한글 수사를 숫자로 바꾼다', () => {
    expect(normalizeSpokenDigits('공일공')).toBe('010');
  });

  it('두 글자 수사가 먼저 바뀐다 — 「하나」가 「하」+「나」로 깨지면 안 된다', () => {
    expect(normalizeSpokenDigits('하나 다섯 여덟')).toBe('1 5 8');
  });

  it('영·빵도 0으로 본다', () => {
    expect(normalizeSpokenDigits('영일영')).toBe('010');
    expect(normalizeSpokenDigits('빵')).toBe('0');
  });
});

describe('detectContactLeak — 전화번호', () => {
  it('숫자로 적힌 휴대폰 번호를 잡는다', () => {
    expect(kinds('제 번호는 010-1234-5678이에요')).toContain('phone');
  });

  it('하이픈 없이 붙여 써도 잡는다', () => {
    expect(kinds('01012345678')).toContain('phone');
  });

  it('말로 부른 번호를 잡는다 — STT가 글자로 적어 보낸다', () => {
    const r = detectContactLeak('공일공 일이삼사 오육칠팔');
    expect(r[0]?.kind).toBe('phone');
    expect(r[0]?.reason).toContain('휴대폰');
  });

  it('숫자 사이에 군말이 껴도 잡는다', () => {
    expect(kinds('공일공에… 어… 일이삼사 다시 오육칠팔')).toContain('phone');
  });

  it('국제 표기를 잡는다 — 베트남 상대가 부르는 형태', () => {
    const r = detectContactLeak('+84 912 345 678 로 연락 주세요');
    expect(r[0]?.kind).toBe('phone');
    expect(r[0]?.reason).toContain('국제전화');
  });
});

describe('detectContactLeak — 정상 대화는 건드리지 않는다', () => {
  // 이 통화의 정상 내용이 신상정보다. 나이·소득·키가 계속 나온다.
  it.each([
    '저는 1990년생이에요',
    '키는 175센티미터입니다',
    '연소득은 3천만원 정도예요',
    '자녀는 둘 있습니다',
    '결혼은 한 번 했었어요',
    '베트남 하노이에서 왔어요',
  ])('「%s」는 잡지 않는다', (text) => {
    expect(detectContactLeak(text)).toEqual([]);
  });

  it('빈 문자열과 공백은 조용히 넘어간다', () => {
    expect(detectContactLeak('')).toEqual([]);
    expect(detectContactLeak('   ')).toEqual([]);
  });

  it('메신저 이름만 나온 잡담은 잡지 않는다', () => {
    expect(detectContactLeak('저도 카톡 자주 써요')).toEqual([]);
  });
});

describe('detectContactLeak — 메신저·SNS', () => {
  it('카톡 아이디 교환을 잡는다', () => {
    const r = detectContactLeak('제 카톡 아이디 알려드릴게요');
    expect(r[0]?.kind).toBe('messenger');
    expect(r[0]?.reason).toContain('카톡');
  });

  it('잘로를 잡는다 — 베트남·캄보디아에서 기본으로 쓴다', () => {
    expect(kinds('잘로 아이디 보내주세요')).toContain('messenger');
  });

  it('영문 표기도 잡는다', () => {
    expect(kinds('my zalo id, add me please')).toContain('messenger');
    expect(kinds('WeChat 계정 추가해 주세요')).toContain('messenger');
  });

  it('인스타 계정 교환을 잡는다', () => {
    expect(kinds('인스타 아이디 검색해 보세요')).toContain('social');
  });
});

describe('detectContactLeak — 이메일', () => {
  it('보통 표기를 잡는다', () => {
    expect(kinds('메일은 abc@example.com 입니다')).toContain('email');
  });

  it('「골뱅이」로 불러도 잡는다', () => {
    expect(kinds('abc 골뱅이 example.com 으로 보내주세요')).toContain('email');
  });
});

describe('detectContactLeak — 한 줄에 여럿', () => {
  it('번호와 카톡이 같이 나오면 둘 다 돌려준다', () => {
    const r = detectContactLeak('제 카톡 아이디 알려드릴게요, 번호는 010-1234-5678이에요');
    expect(new Set(r.map((x) => x.kind))).toEqual(new Set(['phone', 'messenger']));
  });

  it('걸린 이유가 비어 있지 않다 — 이유 없는 경고는 아무도 안 본다', () => {
    for (const leak of detectContactLeak('010-1234-5678')) {
      expect(leak.reason.length).toBeGreaterThan(0);
      expect(leak.excerpt.length).toBeGreaterThan(0);
    }
  });

  it('발췌는 문장 전체를 싣지 않는다', () => {
    const long = '안녕하세요 '.repeat(50) + '010-1234-5678';
    for (const leak of detectContactLeak(long)) {
      expect(leak.excerpt.length).toBeLessThanOrEqual(60);
    }
  });
});

describe('scanTranscript', () => {
  const transcript: TranscriptSegment[] = [
    { seq: 1, speaker: 'client', text: '안녕하세요, 반갑습니다' },
    { seq: 2, speaker: 'partner', text: '저는 1995년생이에요' },
    { seq: 3, speaker: 'client', text: '제 번호는 공일공 일이삼사 오육칠팔이에요' },
    { seq: 4, speaker: 'interpreter', text: '잘로 아이디를 알려달라고 하시네요' },
  ];

  it('걸린 구간만 돌려준다', () => {
    const found = scanTranscript(transcript);
    expect(found.map((f) => f.seq)).toEqual([3, 4]);
  });

  it('누가 말했는지 남긴다 — 나중에 책임을 가려야 한다', () => {
    const found = scanTranscript(transcript);
    expect(found[0]).toMatchObject({ seq: 3, speaker: 'client', kind: 'phone' });
  });

  it('통역사 발화도 본다 — 통역사가 대신 불러 주는 경우가 있다', () => {
    const found = scanTranscript(transcript);
    expect(found.some((f) => f.speaker === 'interpreter')).toBe(true);
  });

  it('깨끗한 전사본은 빈 배열이다', () => {
    expect(scanTranscript(transcript.slice(0, 2))).toEqual([]);
  });

  it('빈 전사본도 안전하다', () => {
    expect(scanTranscript([])).toEqual([]);
  });
});
