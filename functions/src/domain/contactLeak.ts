// 전사본에서 연락처 교환을 잡아낸다
//
// 무엇을 하나. 영상통화 전사본 한 줄을 받아 「연락처를 주고받았는가」를 판정한다.
//
// 왜 필요한가. 업체가 먹고사는 구조가 여기 걸려 있다. 둘이 우리를 거치지 않고 직접
// 연락하기 시작하면 중개 수수료도, 비자 대행도 전부 날아간다. 그런데 영상통화 중에
// 번호를 부르는 것은 **기술로 막을 수 없다.** 종이에 적어 카메라에 비추면 끝이다.
//
// 그래서 막는 대신 남긴다. 계약서의 「소개 후 N개월 내 직접 혼인 시 중개보수 전액 청구」
// 조항은 입증 자료가 없으면 종이일 뿐이다. 전사본에 번호를 부른 순간이 남으면 그 조항에
// 이빨이 생긴다. 이 모듈이 그 순간을 찾아 표시한다.
//
// 왜 떼어냈나. 판정이 문자열 처리뿐이라 저장소도 AI도 필요 없다. 순수 함수로 두면
// 실제 한국어 대화 문장으로 그대로 시험할 수 있다.
// (creditMath·orderCheck·rateLimitMath·videoCallGate와 같은 이유다)
//
// ─────────────────────────────────────────────────────────────
// 다루는 어려움
//
// 1) STT는 숫자를 글자로 적기도 한다. "공일공에 일이삼사"처럼 온다.
//    한글 수사도 숫자로 바꿔 놓고 본다.
// 2) 사이에 말이 낀다. "공일공… 어… 일이삼사" 처럼.
//    그래서 숫자 사이의 군말은 걷어내고 자릿수를 센다.
// 3) 번호만이 아니다. 카카오톡·잘로(Zalo)·라인·위챗·텔레그램 아이디가 더 흔하다.
//    베트남·캄보디아 쪽은 잘로가 기본이다.
//
// 오탐을 두려워하지 않는다. 담당자가 표시된 구간만 확인하면 되고, 놓치는 쪽이 훨씬 비싸다.
// 다만 왜 걸렸는지는 반드시 같이 돌려준다 — 이유 없는 경고는 아무도 안 본다.

/** 한글 수사 → 숫자. STT가 말한 대로 적어 보내는 경우를 받는다 */
const DIGIT_WORDS: Record<string, string> = {
  공: '0', 영: '0', 빵: '0',
  일: '1', 하나: '1',
  이: '2', 둘: '2',
  삼: '3', 셋: '3',
  사: '4', 넷: '4',
  오: '5', 다섯: '5',
  육: '6', 륙: '6', 여섯: '6',
  칠: '7', 일곱: '7',
  팔: '8', 여덟: '8',
  구: '9', 아홉: '9',
};

/** 숫자 사이에 흔히 끼는 군말. 자릿수를 셀 때 걷어낸다 */
const FILLER = /[\s.\-–—~·,/()]|에|다시|그리고|어+|음+|자|네|예|응/g;

export type LeakKind = 'phone' | 'messenger' | 'email' | 'social';

export type ContactLeak = {
  kind: LeakKind;
  /** 왜 걸렸는지. 담당자가 읽고 판단한다 */
  reason: string;
  /** 걸린 부분. 전체 문장을 그대로 싣지 않는다 */
  excerpt: string;
};

/** 메신저·SNS 이름. 한국어·영어·현지 표기를 같이 본다 */
const MESSENGER_WORDS = [
  '카카오톡', '카톡', '카카오', 'kakao', 'katalk',
  '잘로', 'zalo',
  '라인', 'line',
  '위챗', 'wechat', '웨이신',
  '텔레그램', 'telegram',
  '왓츠앱', 'whatsapp', '왓츠업',
  '바이버', 'viber',
  '메신저', 'messenger',
];

const SOCIAL_WORDS = [
  '인스타', '인스타그램', 'instagram', 'insta',
  '페이스북', 'facebook', '페북',
  '틱톡', 'tiktok',
];

/** 「아이디」, 「번호」, 「추가」처럼 교환을 뜻하는 말. 이름만 나온 것과 구분한다 */
const EXCHANGE_HINT_KO =
  /아이디|아뒤|계정|번호|추가|친구|보내|알려|찍어|적어|저장|연락|검색|찾아|줄게|줄까|드릴|알려줘|보여/;

/**
 * 영문 힌트. 통역사를 거치지 않고 둘이 영어로 주고받는 경우가 실제로 있다.
 * 단어 경계(\b)를 걸지 않으면 'id'가 'valid'·'idea'에서 걸려 오탄이 폭발한다.
 */
const EXCHANGE_HINT_EN =
  /\b(?:id|ids|add|contact|send|give|number|account|find|search|dm|message|text)\b/i;

const hasExchangeHint = (text: string) =>
  EXCHANGE_HINT_KO.test(text) || EXCHANGE_HINT_EN.test(text);

const EMAIL_RE = /[A-Za-z0-9._%+-]+\s*(?:@|골뱅이|앳)\s*[A-Za-z0-9.-]+\s*\.\s*[A-Za-z]{2,}/;

/** 국제 표기. +84(베트남) +855(캄보디아) +82(한국) 등 */
const INTL_RE = /\+\s?\d{1,3}[\s.-]?\d[\d\s.-]{6,}/;

/**
 * 한글 수사를 숫자로 바꾼다.
 * 「공일공」 → 「010」. 두 글자 수사(하나·다섯…)를 먼저 바꿔야 「하나」가 「하」+「나」로 깨지지 않는다.
 */
export function normalizeSpokenDigits(text: string): string {
  let out = text;
  const words = Object.keys(DIGIT_WORDS).sort((a, b) => b.length - a.length);
  for (const word of words) {
    out = out.split(word).join(DIGIT_WORDS[word]!);
  }
  return out;
}

/**
 * 전화번호로 볼 만한 숫자 덩어리가 있는가.
 *
 * 한국 휴대폰(010…) 11자리, 지역번호 10자리, 국제 표기를 본다.
 * 나이·소득·키처럼 이 대화에 정상적으로 나오는 숫자와 섞이지 않도록 자릿수를 본다 —
 * 8자리 미만은 보지 않는다(1990년생, 175, 3000만원 같은 것들이 여기서 걸러진다).
 */
function findPhone(raw: string): ContactLeak | null {
  if (INTL_RE.test(raw)) {
    return {
      kind: 'phone',
      reason: '국제전화 표기(+국가번호)가 나왔습니다.',
      excerpt: (raw.match(INTL_RE)?.[0] ?? '').trim().slice(0, 40),
    };
  }

  // 한글 수사를 숫자로 바꾸고 군말을 걷어낸 뒤 자릿수를 센다.
  const digitsOnly = normalizeSpokenDigits(raw).replace(FILLER, '');
  for (const m of digitsOnly.matchAll(/\d{8,}/g)) {
    const run = m[0]!;
    // 010으로 시작하는 11자리는 거의 확실하다.
    const certain = /^01[016789]\d{7,8}$/.test(run);
    return {
      kind: 'phone',
      reason: certain
        ? '휴대폰 번호를 불러 준 것으로 보입니다.'
        : `연속된 숫자 ${run.length}자리가 나왔습니다. 번호일 수 있습니다.`,
      excerpt: run.slice(0, 20),
    };
  }
  return null;
}

function findWord(raw: string, words: string[]): string | null {
  const lower = raw.toLowerCase();
  for (const word of words) {
    if (lower.includes(word.toLowerCase())) return word;
  }
  return null;
}

/**
 * 전사본 한 줄을 검사한다. 걸릴 것이 없으면 빈 배열이다.
 *
 * 한 줄에서 여러 종류가 걸릴 수 있다("제 카톡 아이디는 …이고 번호는 …"). 전부 돌려준다.
 */
export function detectContactLeak(text: string): ContactLeak[] {
  const raw = (text ?? '').trim();
  if (!raw) return [];
  const found: ContactLeak[] = [];

  const phone = findPhone(raw);
  if (phone) found.push(phone);

  if (EMAIL_RE.test(raw)) {
    found.push({
      kind: 'email',
      reason: '이메일 주소가 나왔습니다.',
      excerpt: (raw.match(EMAIL_RE)?.[0] ?? '').trim().slice(0, 60),
    });
  }

  // 메신저는 이름만으로는 안 잡는다. "카톡 해요"는 잡담일 수 있다.
  // 교환을 뜻하는 말이 같이 있을 때만 본다.
  const messenger = findWord(raw, MESSENGER_WORDS);
  if (messenger && hasExchangeHint(raw)) {
    found.push({
      kind: 'messenger',
      reason: `${messenger} 계정을 주고받으려 한 것으로 보입니다.`,
      excerpt: raw.slice(0, 60),
    });
  }

  const social = findWord(raw, SOCIAL_WORDS);
  if (social && hasExchangeHint(raw)) {
    found.push({
      kind: 'social',
      reason: `${social} 계정을 주고받으려 한 것으로 보입니다.`,
      excerpt: raw.slice(0, 60),
    });
  }

  return found;
}

export type TranscriptSegment = {
  seq: number;
  speaker: 'client' | 'partner' | 'interpreter' | 'agent';
  text: string;
};

export type LeakFinding = ContactLeak & {
  seq: number;
  speaker: TranscriptSegment['speaker'];
};

/**
 * 통화 전사본 전체를 훑어 걸린 구간을 모은다.
 *
 * 통역사와 담당 직원 발화도 본다 — 옆에서 대신 불러 주는 경우가 실제로 생긴다.
 * 누가 말했는지를 같이 남겨야 나중에 책임을 가릴 수 있다.
 */
export function scanTranscript(segments: TranscriptSegment[]): LeakFinding[] {
  const out: LeakFinding[] = [];
  for (const segment of segments) {
    for (const leak of detectContactLeak(segment.text)) {
      out.push({ ...leak, seq: segment.seq, speaker: segment.speaker });
    }
  }
  return out;
}
