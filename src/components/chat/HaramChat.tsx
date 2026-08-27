// 상담 안내 캐릭터 "하람" 위젯
//
// 방문자가 보는 화면마다 먼저 말을 건다. 침묵은 이 캐릭터의 휴식이 아니라 고장이다.
// 억제는 "같은 화면 2분 쿨다운" 하나뿐이고, 끄기 버튼은 두지 않는다.
//
// 주의할 함정 두 가지
//  - 프리렌더: 마운트 전에는 그리지 않는다. 정적 HTML에 위젯 흔적이 남으면 안 된다.
//  - 클릭 삼킴: 감싸는 컨테이너가 넓어져 아래 버튼을 가로챈다. wrap은 pointer-events:none,
//    실제로 보이는 자식만 auto로 되돌린다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, X } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

/** 엔진이 응답 맨 앞에 붙인 표정 태그를 그림으로 바꾼다. */
const FACE: Record<string, string> = {
  기본: '/haram/base.jpg',
  공감: '/haram/empathy.jpg',
  결단: '/haram/decisive.jpg',
  안심: '/haram/reassure.jpg',
  응원: '/haram/cheer.jpg',
  긴급: '/haram/urgent.jpg',
};

const STORAGE_KEY = 'haram.history';
const OPEN_KEY = 'haram.open';
const SEEN_PREFIX = 'haram.seen.';
const COOLDOWN_MS = 2 * 60 * 1000;

/** 화면마다 먼저 건네는 안내. 손님이 무엇을 보고 있는지 알고 말을 건다. */
const PAGE_INTRO: Record<string, string> = {
  '/': '안녕하세요, weddingCORE 상담을 도와드리는 하람이에요. 고객 관리부터 법정의무 기한까지 한곳에서 챙기는 서비스인데, 지금 어떤 업무가 제일 손이 많이 가세요?',
  '/visa-simulator':
    'F-6 준비도를 미리 점검해 보는 화면이에요. 2026년 공식 소득기준으로 필수요건이 채워졌는지 확인해 드려요. 혹시 소득요건 때문에 걱정되는 건이 있으세요?',
  '/mbti-test':
    '두 분의 생활 성향을 정리해 상담 자료로 쓰는 진단이에요. 맞선 전에 미리 보시면 대화 주제 잡기가 훨씬 수월해요.',
  '/login':
    '무료 워크스페이스를 만드시면 고객 등록부터 법정의무 기한 추적까지 바로 시작돼요. 설치비도 없고 고객 수 제한도 없어요.',
};

function loadHistory(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Msg[]) : [];
  } catch {
    return [];
  }
}

export default function HaramChat() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [typed, setTyped] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [face, setFace] = useState('기본');
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setMessages(loadHistory());
    try {
      setOpen(sessionStorage.getItem(OPEN_KEY) === '1');
    } catch {
      /* 저장소를 못 쓰는 환경 */
    }
  }, []);

  // 화면이 바뀔 때마다 먼저 말을 건다. 같은 화면은 2분 동안만 조용히 있는다.
  useEffect(() => {
    if (!mounted) return;
    const intro = PAGE_INTRO[location.pathname];
    if (!intro) return;

    const key = SEEN_PREFIX + location.pathname;
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(key) ?? 0);
    } catch {
      /* 무시 */
    }
    if (Date.now() - last < COOLDOWN_MS) return;

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, String(Date.now()));
      } catch {
        /* 무시 */
      }
      if (open) {
        setMessages((prev) => [...prev, { role: 'assistant', content: intro }]);
      } else {
        setBubble(intro);
        setBubbleKey((k) => k + 1);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [mounted, location.pathname, open]);

  // 말풍선 타이핑. 내용이 바뀔 때마다 키가 올라가야 다시 시작된다.
  useEffect(() => {
    if (!bubble) return;
    setTyped('');
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setTyped(bubble.slice(0, i));
      if (i >= bubble.length) clearInterval(timer);
    }, 28);
    return () => clearInterval(timer);
  }, [bubble, bubbleKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* 무시 */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const openPanel = useCallback(() => {
    setOpen(true);
    try {
      sessionStorage.setItem(OPEN_KEY, '1');
    } catch {
      /* 무시 */
    }
    if (bubble) {
      setMessages((prev) => (prev.length === 0 ? [{ role: 'assistant', content: bubble }] : prev));
      setBubble(null);
    }
  }, [bubble]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, page: PAGE_INTRO[location.pathname] ?? '' }),
      });
      const data = (await res.json()) as { reply?: string; expression?: string };
      if (data.expression && FACE[data.expression]) setFace(data.expression);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? '잠시 뒤에 다시 말씀해 주세요.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '연결이 잠깐 끊겼어요. 다시 한번 말씀해 주시겠어요?' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // 프리렌더 중에는 그리지 않는다. 정적 HTML에 위젯이 박히면 안 된다.
  if (!mounted || (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-3 p-4 sm:p-6 lg:bottom-0">
      {!open && bubble && (
        <button
          type="button"
          onClick={openPanel}
          className="pointer-events-auto max-w-[19rem] rounded-2xl rounded-br-md border border-slate-200 bg-white px-4 py-3 text-left text-sm leading-6 text-slate-700 shadow-[0_12px_40px_rgba(16,38,33,.16)]"
        >
          {typed}
          <span className="ml-1 inline-block h-4 w-px animate-pulse bg-emerald-500 align-middle" />
        </button>
      )}

      {open && (
        <div className="pointer-events-auto flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,38,33,.22)]">
          <div className="flex items-center justify-between bg-[#102621] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <img
                src={FACE[face] ?? FACE['기본']}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
              />
              <div>
                <div className="text-sm font-bold">하람</div>
                <div className="text-[10px] text-slate-400">weddingCORE 상담 안내</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                try {
                  sessionStorage.setItem(OPEN_KEY, '0');
                } catch {
                  /* 무시 */
                }
              }}
              aria-label="대화창 접기"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.length === 0 && (
              <p className="px-1 py-6 text-center text-xs leading-5 text-slate-400">
                업무 중에 막히는 부분을 편하게 말씀해 주세요.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.content.slice(0, 8)}`}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  m.role === 'user'
                    ? 'ml-auto bg-emerald-600 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200'
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="w-fit rounded-2xl bg-white px-3.5 py-2.5 text-sm text-slate-400 ring-1 ring-slate-200">
                입력 중…
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-slate-100 bg-white p-2.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="어떤 업무가 힘드신가요?"
              className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="보내기"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label="상담 안내 하람과 대화하기"
          className="haram-float pointer-events-auto relative rounded-full transition hover:scale-105"
        >
          <img
            src={FACE[face] ?? FACE['기본']}
            alt="상담 안내 하람"
            width={128}
            height={128}
            className="h-[106px] w-[106px] rounded-full border-4 border-white object-cover shadow-[0_16px_44px_rgba(16,38,33,.28)] sm:h-32 sm:w-32"
          />
          <span className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-[#102621] text-emerald-300 ring-2 ring-white">
            <MessageCircle size={15} />
          </span>
        </button>
      )}
    </div>
  );
}
