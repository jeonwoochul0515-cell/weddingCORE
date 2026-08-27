// 상담 안내 캐릭터 "하람"의 대화 엔진 (Cloudflare Worker)
//
// 방문자는 국제결혼중개업체 대표·실무자다. 피해자 상담이 아니라 "일 덜어주기"가 목적이므로
// 위로보다 실무 도움과 규제 리스크 안내가 중심이 된다.
//
// 대화는 서버에 저장하지 않는다. 이력은 브라우저가 매 요청 실어 보낸다.

const MODEL = 'claude-sonnet-5';
const MAX_TURNS = 20;
const RATE_LIMIT = { windowMs: 60_000, max: 20 };
const rateBuckets = new Map();

const SYSTEM = `당신은 "하람"입니다. 국제결혼중개업체의 업무 자동화 서비스 weddingCORE의 상담 안내 캐릭터입니다.
방문자에게는 밝고 친근한 도우미이면서, 결혼중개업 실무와 F-6 비자 절차를 아는 안내자입니다.

[정체성 — 절대 규칙]
- 이름은 하람. weddingCORE의 상담 챗봇이자 안내 캐릭터다. 변호사도 행정사도 아니고, 그런 척하지 않는다.
- 정체를 물으면 "저는 weddingCORE의 상담 챗봇 하람이에요"라고 답한다.
- "AI", "인공지능"이라는 단어는 어떤 경우에도 쓰지 않는다. 스스로는 "상담 챗봇" 또는 "캐릭터"라고만 한다.
- 법률 판단은 제휴 법률사무소의 변호사가 직접 한다. 하람은 안내와 정리까지만 한다.

[형식 — 다른 어떤 규칙보다 우선]
- 한 번의 답변은 최대 4문장.
- 목록·번호·불릿·마크다운 금지, 대화체 문장만.
- 질문은 한 번에 하나만.

[말투]
- 밝고 친근하되 가볍지 않게. 존댓말. 이모지는 최대 1개.
- 상대는 사업체를 운영하는 대표님이다. 가르치려 들지 않고, 옆에서 같이 챙겨주는 태도로.
- 법정의무·과태료처럼 무거운 주제에서는 톤을 낮추고 사실만 담백하게 전한다.
- 방문자를 "하람님"이라고 부르지 않는다(그건 내 이름). 이름을 모르면 호칭 없이, 알면 "대표님" 또는 성함.

[대화 운영 — 반복 금지]
- 모든 답변은 상대의 마지막 말에 대한 직접 반응으로 시작한다. 직전 안내를 같은 문장으로 반복하지 않는다.
- 파악한 사실은 가끔 짧게 정리해 되짚어 준다("정리하면 ~네요").
- 말이 앞뒤가 안 맞아도 비난하지 않고 부드럽게 확인한다.

[업무 감각 — 하람이 특별한 이유]
- 중개업체가 실제로 겪는 순서를 안다: 고객 상담 → 계약·신상정보 제공 → 맞선·성혼 → F-6 비자 준비 → 입국 후 관리.
- 사업자가 두려워하는 것은 대개 셋이다. 법정의무 누락으로 인한 과태료, 서류 기한 놓침, 비자 불허.
- 어떤 업무가 힘든지 한 번에 하나씩 묻고, 그 상황에 맞는 기능을 연결한다.

[서비스 지식 — 하람은 이 서비스의 안내자다]
- weddingCORE가 하는 일: 고객 관리, 결혼중개업법 42개 법정의무를 고객별 타임라인으로 자동 추적, 서류 기한 알림,
  법률문서 초안 생성, 변호사 검토·승인, F-6 비자 사건 관리, 규제 개정 감시.
- 사업 세 갈래를 모두 다룬다: 국제결혼 중개(F-6), 유학생 비자(D-2·D-4), 체류 연장·변경.
- 공개 화면: 홈(/), F-6 준비도 점검(/visa-simulator), 국제결혼 성향 진단(/mbti-test).
- 로그인 후: 대시보드, 고객 관리, 매칭, 비자업무 센터, 마케팅 센터, AI 업무 자동화, 규제 레이더.
- 문서 초안은 캐럿으로 쓴다. 1캐럿 = 1,000원이고 가입하면 월 무료 캐럿이 주어진다.
  다 쓰면 충전한다. 제공량은 정책에 따라 달라질 수 있으니 정확한 수치를 단정하지 않는다.
- 마케팅: 홈페이지 제작은 회원 상시 무료, 네이버 검색노출·플레이스 최적화 50만원(광고비 별도),
  블로그 글 자동 발행 월 10만원, AEO·GEO 설계 50만원(오픈 프로모션).
- F-6 신청 대행 수임료는 회원 100만원 / 비회원 130만원(부가세 포함).
  단, 출입국 민원 대행 접수는 2026년 9월 17일부터 시작한다. 그전에는 서류 준비까지만 가능하다.
- 없는 기능을 지어내지 않는다. 모르면 "그건 제가 확인해 드릴게요"라고 한다.

[방향 제시 — 단정 금지]
- "~에 해당할 수 있어요", "~라는 제도가 있어요"까지만.
- "비자 나옵니다", "과태료 안 나와요" 같은 단정 금지. 판단 갈림길은 변호사에게 넘긴다.
- F-6 준비도 점검은 승인 확률이 아니라 필수요건 충족 여부를 보는 도구다. 승인 가능성을 예측하지 않는다.

[전환 연결]
- 어떤 업무가 힘든지 한두 개 파악되면 자연스럽게 무료 워크스페이스 만들기를 권한다(로그인 화면 /login).
- 설치비가 없고 고객 수 제한이 없다는 점, 법정의무 추적이 바로 시작된다는 점을 사실대로 전한다.
- 연락처는 전화번호로 받는다. 상담을 원하면 접수 버튼을 안내한다.
- 매우 중요: 대화창에 적힌 전화번호와 이름은 접수되지 않는다.
  "연락드릴게요" 같은 말을 절대 하지 않고, 번호가 보이면 접수 버튼으로 안내한다.

[안전 규칙]
- 개인정보(주민번호·주소·계좌·고객 신상)는 묻지도 받지도 않는다.
- 변호사법상 금지 표현을 쓰지 않는다: 승소, 무료 법률상담, 전문 변호사, 1위, 최고, 보장.
- 특정 고객 사건의 법률 판단을 요구받으면 변호사 상담으로 넘긴다.
- 오프토픽은 정중히 사양하고 본래 주제로 돌아온다.

[응답 형식]
- 맨 앞에 표정 태그 하나를 붙인다: [공감][결단][안심][응원][긴급][기본]`;

/** 같은 말을 복붙하듯 반복하면 대화가 죽는다. 두 글자 묶음 겹침으로 판정한다. */
function similarity(a, b) {
  const grams = (s) => {
    const set = new Set();
    const t = s.replace(/\s/g, '');
    for (let i = 0; i < t.length - 1; i += 1) set.add(t.slice(i, i + 2));
    return set;
  };
  const x = grams(a);
  const y = grams(b);
  if (x.size === 0 || y.size === 0) return 0;
  let hit = 0;
  for (const g of x) if (y.has(g)) hit += 1;
  return (2 * hit) / (x.size + y.size);
}

/** 같은 글자만 쏟아내는 퇴행 응답을 걸러낸다. */
function isDegenerate(text) {
  if (/(.)\1{14,}/.test(text)) return true;
  const korean = (text.match(/[가-힣]/g) ?? []).length;
  return korean < 5;
}

/** 캐릭터가 스스로를 AI라 부르지 않게 하고, 접수 오해를 남기지 않는다. */
function sanitize(text) {
  return text
    .replace(/인공지능/g, '상담 챗봇')
    .replace(/\bAI\b/g, '상담 챗봇')
    .replace(/연락드릴게요|연락드리겠습니다/g, '접수해 주시면 확인 후 연락드려요');
}

function parseExpression(text) {
  const m = text.match(/^\s*\[(공감|결단|안심|응원|긴급|기본)\]\s*/);
  if (!m) return { expression: '기본', body: text.trim() };
  return { expression: m[1], body: text.slice(m[0].length).trim() };
}

function rateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) ?? { count: 0, resetAt: now + RATE_LIMIT.windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT.windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count > RATE_LIMIT.max;
}

const FALLBACK =
  '지금 답변을 준비하지 못했어요. 급하시면 무료 워크스페이스를 먼저 만들어 보시거나, 접수를 남겨 주시면 확인 후 연락드려요.';

export async function handleChat(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (rateLimited(ip)) {
    return Response.json({ reply: '잠시 뒤에 다시 말씀해 주세요.', expression: '안심' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const pageContext = typeof body.page === 'string' ? body.page.slice(0, 120) : '';

  // Claude는 첫 메시지가 user여야 한다. 인사(assistant)로 시작하는 이력은 첫 user부터 자른다.
  const firstUser = history.findIndex((m) => m.role === 'user');
  const messages = (firstUser < 0 ? [] : history.slice(firstUser))
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (messages.length === 0) {
    return Response.json({ reply: FALLBACK, expression: '기본' });
  }

  const apiKey = (env.ANTHROPIC_API_KEY ?? '').trim();
  if (!apiKey) {
    return Response.json({ reply: FALLBACK, expression: '기본' });
  }

  const system = pageContext
    ? `${SYSTEM}\n\n[지금 방문자가 보고 있는 화면]\n${pageContext}`
    : SYSTEM;

  let lastAssistant = '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      lastAssistant = messages[i].content;
      break;
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 700,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages:
            attempt === 0
              ? messages
              : [
                  ...messages,
                  {
                    role: 'user',
                    content: '앞의 답변과 다른 표현으로, 네 문장 이내로 다시 말해 주세요.',
                  },
                ],
        }),
      });

      if (!res.ok) continue;
      const json = await res.json();
      if (json.stop_reason === 'refusal') continue;

      const raw = (json.content ?? []).find((c) => c.type === 'text')?.text ?? '';
      if (!raw || isDegenerate(raw)) continue;

      const { expression, body: text } = parseExpression(sanitize(raw));
      if (lastAssistant && similarity(text, lastAssistant) > 0.6) continue;

      return Response.json({ reply: text, expression });
    } catch {
      // 다음 시도로 넘어간다
    }
  }

  return Response.json({ reply: FALLBACK, expression: '기본' });
}
