import { ageOnDate, MINIMUM_INTRODUCTION_AGE } from '@/domain/introductionAge';
import type { ClientBasics } from './useAgencyClients';

export type ClientCsvRow = ClientBasics & { rowNumber: number };
export type ClientCsvIssue = { rowNumber: number; message: string };

export type ClientCsvResult = {
  rows: ClientCsvRow[];
  issues: ClientCsvIssue[];
  totalRows: number;
};

const HEADER_ALIASES = {
  name: ['이름', '성명', '고객명', 'name'],
  birthDate: ['생년월일', '생일', 'birthdate', 'birth_date'],
  gender: ['성별', 'gender', 'sex'],
  phone: ['연락처', '휴대전화', '휴대폰', '전화번호', 'phone', 'mobile'],
  address: ['주소', '거주지', 'address'],
  incomeAnnual: ['연소득', '연소득(원)', '연간소득', 'income', 'annualincome'],
  occupation: ['직업', '직장', 'occupation', 'job'],
  maritalHistory: ['혼인이력', '혼인상태', '결혼이력', 'maritalhistory', 'marital_status'],
} as const;

type HeaderKey = keyof typeof HEADER_ALIASES;

/** 따옴표 안의 쉼표와 줄바꿈, 큰따옴표 두 번("")을 처리하는 작은 CSV 파서다. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
      continue;
    }
    value += char;
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

function normalizedHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]/g, '');
}

function headerMap(headers: string[]) {
  const result = {} as Partial<Record<HeaderKey, number>>;
  headers.forEach((header, index) => {
    const normalized = normalizedHeader(header);
    for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<[HeaderKey, readonly string[]]>) {
      if (aliases.some((alias) => normalizedHeader(alias) === normalized)) result[key] = index;
    }
  });
  return result;
}

function cell(row: string[], index: number | undefined) {
  return index == null ? '' : (row[index] ?? '').trim();
}

function parseDate(value: string): Date | null {
  const compact = value.trim().replace(/[.\/]/g, '-');
  const formatted = /^\d{8}$/.test(compact)
    ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
    : compact;
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(formatted)) return null;
  const [year, month, day] = formatted.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  if (date.getFullYear() !== year || date.getMonth() !== month! - 1 || date.getDate() !== day) return null;
  if (date.getTime() > Date.now()) return null;
  return date;
}

function parseGender(value: string): 'M' | 'F' | null {
  const v = value.trim().toLowerCase();
  if (['남', '남성', 'm', 'male'].includes(v)) return 'M';
  if (['여', '여성', 'f', 'female'].includes(v)) return 'F';
  return null;
}

function parseMarital(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (['미혼', '초혼', 'none', 'single'].includes(v)) return 'none';
  if (['이혼', '재혼', 'divorced'].includes(v)) return 'divorced';
  if (['사별', 'widowed'].includes(v)) return 'widowed';
  return null;
}

function normalizedPhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

export function parseClientCsv(text: string, existingPhones: Iterable<string> = []): ClientCsvResult {
  if (text.includes('\uFFFD')) {
    return { rows: [], totalRows: 0, issues: [{ rowNumber: 1, message: '한글 인코딩을 읽을 수 없습니다. 엑셀에서 CSV UTF-8 형식으로 다시 저장해 주세요.' }] };
  }

  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], issues: [{ rowNumber: 1, message: '파일이 비어 있습니다.' }], totalRows: 0 };
  const headers = headerMap(table[0]!);
  const missing = (['name', 'birthDate', 'gender', 'phone', 'maritalHistory'] as HeaderKey[])
    .filter((key) => headers[key] == null)
    .map((key) => HEADER_ALIASES[key][0]);
  if (missing.length > 0) {
    return {
      rows: [],
      issues: [{ rowNumber: 1, message: `필수 열이 없습니다: ${missing.join(', ')}` }],
      totalRows: Math.max(0, table.length - 1),
    };
  }

  const knownPhones = new Set(Array.from(existingPhones, normalizedPhone).filter(Boolean));
  const filePhones = new Set<string>();
  const rows: ClientCsvRow[] = [];
  const issues: ClientCsvIssue[] = [];

  table.slice(1).forEach((raw, offset) => {
    const rowNumber = offset + 2;
    const name = cell(raw, headers.name);
    const birthDate = parseDate(cell(raw, headers.birthDate));
    const gender = parseGender(cell(raw, headers.gender));
    const phoneInput = cell(raw, headers.phone);
    const phone = normalizedPhone(phoneInput);
    const maritalHistory = parseMarital(cell(raw, headers.maritalHistory));
    const rowIssues: string[] = [];

    if (!name) rowIssues.push('이름 없음');
    if (!birthDate) rowIssues.push('생년월일 형식 오류');
    else if (ageOnDate(birthDate) < MINIMUM_INTRODUCTION_AGE) rowIssues.push('만 18세 미만');
    if (!gender) rowIssues.push('성별은 남/여로 입력');
    if (phone.length < 8 || phone.length > 15) rowIssues.push('연락처 형식 오류');
    if (phone && (knownPhones.has(phone) || filePhones.has(phone))) rowIssues.push('연락처 중복');
    if (!maritalHistory) rowIssues.push('혼인이력은 미혼/이혼/사별로 입력');

    const incomeText = cell(raw, headers.incomeAnnual).replace(/[,원\s]/g, '');
    const incomeAnnual = incomeText === '' ? null : Number(incomeText);
    if (incomeAnnual != null && (!Number.isFinite(incomeAnnual) || incomeAnnual < 0)) rowIssues.push('연소득 형식 오류');

    if (rowIssues.length > 0) {
      issues.push({ rowNumber, message: rowIssues.join(' · ') });
      return;
    }

    filePhones.add(phone);
    rows.push({
      rowNumber,
      name,
      birthDate: birthDate!,
      gender: gender!,
      phone: phoneInput.trim(),
      address: cell(raw, headers.address),
      incomeAnnual,
      occupation: cell(raw, headers.occupation),
      maritalHistory: maritalHistory!,
    });
  });

  return { rows, issues, totalRows: Math.max(0, table.length - 1) };
}

export const CLIENT_CSV_TEMPLATE = [
  '이름,생년월일,성별,연락처,주소,직업,연소득(원),혼인이력',
  '홍길동,1988-03-21,남,010-1234-5678,서울시 강남구,회사원,42000000,미혼',
].join('\r\n');
