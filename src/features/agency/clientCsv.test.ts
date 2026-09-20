// 고객 명단 CSV 가져오기 검증
//
// 입력이 사용자가 만든 파일이라 어떤 모양으로든 들어온다. 잘못 읽으면 남의 고객이
// 뒤섞이거나(전화번호 중복) 미성년자가 등록된다. 분기마다 못을 박아 둔다.
import { describe, expect, it } from 'vitest';
import { parseClientCsv, parseCsv, CLIENT_CSV_TEMPLATE } from './clientCsv';

const HEADER = '이름,생년월일,성별,연락처,주소,직업,연소득(원),혼인이력';
const row = (cells: string) => `${HEADER}\n${cells}`;

describe('parseCsv', () => {
  it('따옴표 안의 쉼표를 한 칸으로 읽는다', () => {
    expect(parseCsv('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('두 번 쓴 큰따옴표를 한 개로 읽는다', () => {
    expect(parseCsv('a,"그는 ""안녕""이라 했다"')).toEqual([['a', '그는 "안녕"이라 했다']]);
  });

  it('따옴표 안의 줄바꿈은 줄을 끊지 않는다', () => {
    expect(parseCsv('a,"1\n2"\nb,c')).toEqual([['a', '1\n2'], ['b', 'c']]);
  });

  it('CRLF와 빈 줄을 흘려보낸다', () => {
    expect(parseCsv('a,b\r\n\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('parseClientCsv', () => {
  it('붙어 있는 템플릿은 그대로 읽힌다', () => {
    const result = parseClientCsv(CLIENT_CSV_TEMPLATE);
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.name).toBe('홍길동');
    expect(result.rows[0]!.gender).toBe('M');
    expect(result.rows[0]!.maritalHistory).toBe('none');
  });

  it('깨진 인코딩을 먼저 잡아낸다', () => {
    const result = parseClientCsv('이름\uFFFD,생년월일');
    expect(result.rows).toEqual([]);
    expect(result.issues[0]!.message).toContain('UTF-8');
  });

  it('필수 열이 없으면 행을 읽지 않는다', () => {
    const result = parseClientCsv('이름,주소\n홍길동,서울');
    expect(result.rows).toEqual([]);
    expect(result.issues[0]!.message).toContain('필수 열이 없습니다');
  });

  it('열 이름의 별칭과 대소문자·공백을 받아들인다', () => {
    const result = parseClientCsv(
      'name, Birth Date ,SEX,mobile,혼인상태\n홍길동,1990-01-01,male,010-1111-2222,미혼',
    );
    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });

  it('8자리 숫자와 점으로 쓴 날짜를 읽는다', () => {
    const a = parseClientCsv(row('홍길동,19900101,남,010-1111-2222,,,,미혼'));
    const b = parseClientCsv(row('홍길동,1990.01.01,남,010-1111-2222,,,,미혼'));
    expect(a.rows[0]!.birthDate.getFullYear()).toBe(1990);
    expect(b.rows[0]!.birthDate.getFullYear()).toBe(1990);
  });

  it('없는 날짜(2월 30일)를 거른다', () => {
    const result = parseClientCsv(row('홍길동,1990-02-30,남,010-1111-2222,,,,미혼'));
    expect(result.rows).toEqual([]);
    expect(result.issues[0]!.message).toContain('생년월일');
  });

  it('미래 날짜를 거른다', () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const ymd = next.toISOString().slice(0, 10);
    const result = parseClientCsv(row(`홍길동,${ymd},남,010-1111-2222,,,,미혼`));
    expect(result.rows).toEqual([]);
  });

  it('만 18세 미만을 거른다 — 미성년자 소개는 금지 행위다', () => {
    const minor = new Date();
    minor.setFullYear(minor.getFullYear() - 17);
    const ymd = minor.toISOString().slice(0, 10);
    const result = parseClientCsv(row(`홍길동,${ymd},남,010-1111-2222,,,,미혼`));
    expect(result.rows).toEqual([]);
    expect(result.issues[0]!.message).toContain('만 18세 미만');
  });

  it('파일 안에서 전화번호가 겹치면 뒤엣것을 거른다', () => {
    const result = parseClientCsv(
      `${HEADER}\n홍길동,1990-01-01,남,010-1111-2222,,,,미혼\n김철수,1991-02-02,남,010-1111-2222,,,,미혼`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.issues[0]!.message).toContain('연락처 중복');
  });

  it('이미 등록된 번호는 표기가 달라도 중복으로 본다', () => {
    const result = parseClientCsv(
      row('홍길동,1990-01-01,남,010-1111-2222,,,,미혼'),
      ['01011112222'],
    );
    expect(result.rows).toEqual([]);
    expect(result.issues[0]!.message).toContain('연락처 중복');
  });

  it('연소득의 쉼표와 "원"을 떼고 숫자로 읽는다', () => {
    const result = parseClientCsv(row('홍길동,1990-01-01,남,010-1111-2222,,회사원,"42,000,000원",미혼'));
    expect(result.rows[0]!.incomeAnnual).toBe(42_000_000);
  });

  it('연소득이 비면 null로 둔다', () => {
    const result = parseClientCsv(row('홍길동,1990-01-01,남,010-1111-2222,,,,미혼'));
    expect(result.rows[0]!.incomeAnnual).toBeNull();
  });

  it('한 행의 문제를 모아서 알려준다', () => {
    const result = parseClientCsv(row(',1990-13-01,중성,123,,,,모름'));
    expect(result.rows).toEqual([]);
    const message = result.issues[0]!.message;
    expect(message).toContain('이름 없음');
    expect(message).toContain('생년월일');
    expect(message).toContain('성별');
    expect(message).toContain('연락처');
    expect(message).toContain('혼인이력');
  });

  it('문제 있는 행을 빼고 나머지는 가져온다', () => {
    const result = parseClientCsv(
      `${HEADER}\n홍길동,1990-01-01,남,010-1111-2222,,,,미혼\n,1991-02-02,여,010-3333-4444,,,,미혼`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
    expect(result.totalRows).toBe(2);
    expect(result.issues[0]!.rowNumber).toBe(3);   // 헤더가 1행이므로 셋째 줄
  });

  it('혼인이력 표기를 저장값으로 바꾼다', () => {
    const cases: Array<[string, string]> = [
      ['미혼', 'none'], ['초혼', 'none'],
      ['이혼', 'divorced'], ['재혼', 'divorced'],
      ['사별', 'widowed'],
    ];
    for (const [input, expected] of cases) {
      const result = parseClientCsv(row(`홍길동,1990-01-01,남,010-1111-2222,,,,${input}`));
      expect(result.rows[0]!.maritalHistory).toBe(expected);
    }
  });
});
