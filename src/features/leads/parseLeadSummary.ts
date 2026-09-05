// 접수 요약 원문을 보고서 구조로 읽는다 — 하나 실장 요약(업체 사이트)과 빠른 점검 요약(위젯) 두 형식을 같은 모양으로
//
// 원문을 그대로 화면에 쏟으면 "미확인"이 열 줄씩 늘어선 덩어리가 된다(2026-09-05 대표 지적).
// 여기서는 줄 단위로 읽어 항목·값·상태로 나누고, 확인된 것과 미확인을 가른다.
// 화면(LeadReport)은 이 구조만 보고 그린다. 원문은 접힌 칸에 그대로 남긴다.

export type ReportItem = {
  label: string;
  value: string;
  /** known = 답이 있음 · unknown = 미확인/미응답 · flag = 확인 필요·불가 */
  state: 'known' | 'unknown' | 'flag';
};

export type ParsedLeadSummary = {
  /** 접수 경로·유입 같은 머리 정보 */
  meta: ReportItem[];
  /** 혼인 상태·연령·소득·주거·범죄경력 같은 요건 항목 */
  requirements: ReportItem[];
  /** 걱정·희망 시기·질문 같은 상담 요지 */
  consult: ReportItem[];
  /** "[하나 판단] …", 교차 규칙 결과 같은 판단 문장 */
  judgments: string[];
  /** 접수 뒤 이어진 대화에서 새로 확인된 항목만 */
  followUps: ReportItem[];
  /** 요약 끝의 판정 한 줄 (있으면) */
  verdict: string | null;
};

const UNKNOWN_WORDS = ['미확인', '미응답', '답변 안 함', '답변 없음', '지금은 답하지 않겠다'];
const FLAG_WORDS = ['확인 필요', '진행 불가', '정리 필요', '제한', '불가', '없다(확인', '증빙이 어렵다', '잘 모르겠다', '아직 없다', '있다'];

const REQUIREMENT_LABELS = [
  '본인/가족', '혼인상태', '혼인 상태', '연령', '나이대', '자녀', '거주', '직업·소득', '연소득', '주거', '집',
  '범죄경력', '과거 초청이력', '초청', '건강', '나라', '진행을 생각하는 나라',
];

function classify(label: string, value: string): ReportItem['state'] {
  const v = value.trim();
  // "동거 여부 미확인"처럼 값 안에 미확인이 섞인 것은 일부라도 확인된 것이다. 값 전체가 미확인일 때만 미확인.
  if (!v || UNKNOWN_WORDS.some((w) => v === w || v.startsWith(w))) return 'unknown';
  if (FLAG_WORDS.some((w) => v.includes(w)) && !/^없다$|^없음$/.test(v)) {
    // "범죄경력: 있다"처럼 걸리는 답과 "없다"를 가른다. 판정 줄은 별도 처리.
    if (/^(없다|없음|미혼|이혼 확정|사별|본인 명의|가족 명의)/.test(v)) return 'known';
    return 'flag';
  }
  void label;
  return 'known';
}

function splitLine(line: string): { label: string; value: string } | null {
  const m = line.match(/^([^:：]{1,24})\s*[:：]\s*(.+)$/);
  if (!m) return null;
  return { label: m[1]!.trim(), value: m[2]!.trim() };
}

/** 줄 단위 상태기계. 대괄호 머리([요건 점검] 등)와 구분선(--- … ---)으로 구역을 가른다. */
export function parseLeadSummary(raw: string): ParsedLeadSummary {
  const out: ParsedLeadSummary = { meta: [], requirements: [], consult: [], judgments: [], followUps: [], verdict: null };
  if (!raw) return out;

  let section: 'meta' | 'requirements' | 'consult' | 'judgment' | 'followup' = 'meta';
  let inFollowUp = false;

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^-{2,}\s*이어진 대화/.test(line)) { inFollowUp = true; section = 'followup'; continue; }
    if (/^-{2,}.*-{2,}$/.test(line)) { section = inFollowUp ? 'followup' : 'meta'; continue; }

    const head = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (head) {
      const name = head[1]!;
      const rest = head[2]!.trim();
      if (name.includes('요건')) section = inFollowUp ? 'followup' : 'requirements';
      else if (name.includes('상담')) section = inFollowUp ? 'followup' : 'consult';
      else if (name.includes('판단')) {
        section = 'judgment';
        if (rest) out.judgments.push(rest);
      } else if (name.includes('점검 결과')) section = 'requirements';
      else section = 'meta';
      continue;
    }

    if (/^판정\s*[:：]/.test(line)) {
      out.verdict = line.replace(/^판정\s*[:：]\s*/, '');
      continue;
    }

    const kv = splitLine(line);
    if (!kv) {
      if (section === 'judgment') out.judgments.push(line);
      // "경로 하나 챗봇 (/)", "유입 직접 접속"처럼 콜론 없이 오는 머리 정보
      else if (section === 'meta') {
        const m = line.match(/^(경로|유입|접수|화면|출처)\s+(.+)$/);
        if (m) out.meta.push({ label: m[1]!, value: m[2]!, state: 'known' });
      }
      continue;
    }

    const item: ReportItem = { label: kv.label, value: kv.value, state: classify(kv.label, kv.value) };

    if (section === 'followup') {
      // 이어진 대화는 새로 확인된 것만 의미가 있다. 여전히 미확인이면 버린다.
      if (item.state !== 'unknown') out.followUps.push(item);
      continue;
    }
    if (section === 'requirements') { out.requirements.push(item); continue; }
    if (section === 'consult') { out.consult.push(item); continue; }
    if (section === 'judgment') { out.judgments.push(line); continue; }

    // 머리글 없이 오는 빠른 점검 요약("지금 혼인 상태는 어떻게 되세요: 미혼")은 요건으로 본다
    if (REQUIREMENT_LABELS.some((l) => kv.label.includes(l)) || /세요$|어떻게|있으세요|되세요/.test(kv.label)) {
      out.requirements.push(item);
    } else {
      out.meta.push(item);
    }
  }

  // 이어진 대화에서 확인된 값은 앞의 미확인을 덮어쓴다
  for (const f of out.followUps) {
    const idx = out.requirements.findIndex((r) => r.label === f.label);
    if (idx >= 0 && out.requirements[idx]!.state === 'unknown') out.requirements[idx] = f;
    const cidx = out.consult.findIndex((r) => r.label === f.label);
    if (cidx >= 0 && out.consult[cidx]!.state === 'unknown') out.consult[cidx] = f;
  }

  return out;
}

/** 판정값이 없어도 판단 문장에 결론이 있으면 그것을 쓴다(업체 사이트 요약은 판정을 문장으로 남긴다). */
export function inferLevel(p: ParsedLeadSummary, level: string): string {
  if (level && level !== 'unknown') return level;
  const judged = [p.verdict ?? '', ...p.judgments].join(' ');
  if (/정리 필요|진행 불가|진행할 수 없/.test(judged)) return 'stop';
  if (/확인 필요/.test(judged)) return 'check';
  if (/걸림 없음|걸리는 점이 없/.test(judged)) return 'ok';
  return 'unknown';
}

/** 보고서 첫 줄에 쓸 한 문장. 확인된 요건 수와 걸리는 항목을 센다. */
export function summarizeHeadline(p: ParsedLeadSummary, level: string): string {
  const known = p.requirements.filter((r) => r.state !== 'unknown').length;
  const flags = p.requirements.filter((r) => r.state === 'flag').length;
  const total = p.requirements.length;
  const inferred = inferLevel(p, level);
  const levelText =
    inferred === 'ok' ? '답한 범위에서는 걸리는 점이 없습니다'
    : inferred === 'check' ? '확인이 필요한 항목이 있습니다'
    : inferred === 'stop' ? '진행 전에 정리할 것이 있습니다'
    : '판정 전입니다';
  if (total === 0) return levelText;
  return `${levelText}. 요건 ${total}개 중 ${known}개 확인${flags ? `, 걸리는 항목 ${flags}개` : ''}.`;
}

/** 다음에 할 일. 미확인·걸림 항목에서 첫 통화 때 물을 것을 뽑는다. */
export function nextActions(p: ParsedLeadSummary): string[] {
  const actions: string[] = [];
  const flags = p.requirements.filter((r) => r.state === 'flag');
  const unknown = p.requirements.filter((r) => r.state === 'unknown');
  flags.forEach((f) => actions.push(`${f.label} — "${f.value}" 확인 (서류로)`));
  if (unknown.length) actions.push(`아직 못 물은 것 ${unknown.length}개: ${unknown.map((u) => u.label).join(', ')}`);
  const worry = p.consult.find((c) => c.label.includes('걱정') && c.state === 'known');
  if (worry) actions.push(`걱정하신 점부터: ${worry.value}`);
  const question = p.consult.find((c) => (c.label.includes('질문') || c.label.includes('요청')) && c.state === 'known');
  if (question) actions.push(`물어보신 것: ${question.value}`);
  return actions;
}
