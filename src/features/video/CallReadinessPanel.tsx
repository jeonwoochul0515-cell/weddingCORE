// 영상통화 준비 상태 — 무엇이 막는지 보여주고, 다 갖춰지면 통화를 연다
//
// 이 화면이 하는 일은 「안 된다」가 아니라 「이것만 하면 된다」를 보여주는 것이다.
// 막힌 이유만 띄우고 무엇을 하면 풀리는지 안 적으면 사장은 전화를 건다.

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, Video } from 'lucide-react';
import {
  BLOCKER_GROUP,
  callLinkFor,
  endVideoCall,
  ROLE_HINT,
  ROLE_LABEL,
  startVideoCall,
  useCallReadiness,
  type Blocker,
  type CallRole,
  type CallSession,
} from './useVideoCall';
import CallSetupPanel from './CallSetupPanel';
import type { MatchListItem } from '@/features/matching/useMatches';

type Props = { match: MatchListItem; open: boolean };

/** 같은 분류끼리 묶는다. 법정의무 8건이 한 줄씩 흩어지면 읽히지 않는다 */
function groupBlockers(blockers: Blocker[]) {
  const map = new Map<Blocker['kind'], Blocker[]>();
  for (const blocker of blockers) {
    const list = map.get(blocker.kind) ?? [];
    list.push(blocker);
    map.set(blocker.kind, list);
  }
  return [...map.entries()];
}

export default function CallReadinessPanel({ match, open }: Props) {
  const matchId = match.id;
  const { state, loading, error, refresh } = useCallReadiness(matchId, open);
  const [session, setSession] = useState<CallSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<CallRole | null>(null);

  async function copyLink(role: CallRole, code: string) {
    try {
      await navigator.clipboard.writeText(callLinkFor(code));
      setCopied(role);
      // 복사됐다는 표시는 잠깐만 띄운다. 다음에 누를 때 헷갈리지 않게 한다.
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setNotice('링크를 복사하지 못했습니다. 아래 주소를 직접 선택해 복사해 주세요.');
    }
  }

  async function begin() {
    setBusy(true);
    setNotice(null);
    try {
      setSession(await startVideoCall(matchId));
    } catch (err) {
      setNotice((err as { message?: string }).message ?? '통화를 열지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!session) return;
    setBusy(true);
    try {
      const result = await endVideoCall(matchId, session.callId);
      setNotice(
        result.leaksFound > 0
          ? `통화를 마쳤습니다. 연락처를 주고받은 정황이 ${result.leaksFound}건 기록됐습니다.`
          : '통화를 마쳤습니다. 전사본이 맞선 기록으로 저장됐습니다.',
      );
      setSession(null);
      void refresh();
    } catch (err) {
      setNotice((err as { message?: string }).message ?? '통화를 닫지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !state) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin" />통화 준비 상태를 확인하는 중…
      </p>
    );
  }
  if (error) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }
  if (!state) return null;

  return (
    <div className="space-y-3">
      {/* 배정과 동의를 여기서 넣는다. 이게 없으면 아래 판정은 영영 통과하지 못한다 */}
      {!session && <CallSetupPanel match={match} onSaved={refresh} />}

      {state.allow ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 size={16} />통화를 열 수 있습니다
          </div>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            법정의무와 양측 동의가 모두 확인됐습니다. 이번 통화에는{' '}
            {state.requiredParticipants.map((r) => ROLE_LABEL[r]).join(' · ')} 이렇게{' '}
            {state.requiredParticipants.length}명이 각자 접속합니다. 대화창·파일전송·화면공유는
            꺼진 채로 열립니다.
          </p>

          {!state.serviceConfigured && (
            <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
              영상통화 서비스가 아직 연결되지 않았습니다. 사무실에서 설정을 마치면 바로 쓸 수 있습니다.
            </p>
          )}

          {session ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  통화가 열렸습니다. 아래 링크를 사람마다 따로 보내 주세요.
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-emerald-800">
                  링크는 {new Date(session.expiresAt).toLocaleString('ko-KR', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  까지 쓸 수 있습니다. 「통화 마치기」를 누르면 그 즉시 모두 막힙니다.
                </p>
              </div>

              <ul className="space-y-2">
                {(Object.entries(session.invites) as Array<[CallRole, string]>).map(
                  ([role, code]) => (
                    <li key={role} className="rounded-xl bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{ROLE_LABEL[role]}</p>
                          <p className="text-[11px] leading-4 text-slate-500">{ROLE_HINT[role]}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyLink(role, code)}
                          className="secondary-button shrink-0 !py-1.5 text-[11px]"
                        >
                          <Copy size={12} />
                          {copied === role ? '복사됨' : '링크 복사'}
                        </button>
                      </div>
                      <p className="mt-1.5 break-all rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500">
                        {callLinkFor(code)}
                      </p>
                    </li>
                  ),
                )}
              </ul>

              <button type="button" onClick={finish} disabled={busy} className="secondary-button !py-2 text-xs">
                {busy ? '정리하는 중…' : '통화 마치기'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={begin}
              disabled={busy || !state.serviceConfigured}
              className="primary-button mt-3 !py-2 text-xs disabled:opacity-50"
            >
              <Video size={14} />
              {busy ? '여는 중…' : '영상통화 열기'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle size={16} />통화 전에 마쳐야 할 것이 {state.blockers.length}건 있습니다
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            신상정보 제공과 양측 서면 동의가 끝나기 전에 만남을 주선하면 영업정지 사유가 됩니다.
          </p>
          <div className="mt-3 space-y-3">
            {groupBlockers(state.blockers).map(([kind, list]) => (
              <div key={kind}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  {BLOCKER_GROUP[kind]}
                </div>
                <ul className="mt-1 space-y-1.5">
                  {list.map((blocker) => (
                    <li key={blocker.reason} className="rounded-lg bg-white px-3 py-2">
                      <p className="text-xs font-medium text-slate-800">{blocker.reason}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{blocker.remedy}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{blocker.legalBasis}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {notice && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</p>}
    </div>
  );
}
