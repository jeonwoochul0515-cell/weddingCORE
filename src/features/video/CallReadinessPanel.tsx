// 영상통화 준비 상태 — 무엇이 막는지 보여주고, 다 갖춰지면 통화를 연다
//
// 이 화면이 하는 일은 「안 된다」가 아니라 「이것만 하면 된다」를 보여주는 것이다.
// 막힌 이유만 띄우고 무엇을 하면 풀리는지 안 적으면 사장은 전화를 건다.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Copy,
  FileCheck2,
  Languages,
  Loader2,
  Video,
} from 'lucide-react';
import {
  BLOCKER_GROUP,
  callLinkFor,
  endVideoCall,
  ROLE_HINT,
  ROLE_LABEL,
  issueCertificate,
  startVideoCall,
  syncObligations,
  useCallReadiness,
  type Blocker,
  type CallRole,
  type CallSession,
  type ObligationSyncResult,
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
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState<ObligationSyncResult | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [certMissing, setCertMissing] = useState<string[] | null>(null);

  /**
   * 교환완료 증명서를 낸다.
   *
   * 근거는 이미 시스템 안에 있다 — 신상정보, 서명된 번역본, 전달·수령 기록.
   * 사람이 그걸 다시 워드로 옮겨 적을 이유가 없다.
   * 모자라면 내주지 않는다 — 비어 있는 증명서는 다투는 자리에서 오히려 불리한 자료가 된다.
   */
  async function makeCertificate() {
    setIssuing(true);
    setNotice(null);
    setCertMissing(null);
    try {
      const result = await issueCertificate(matchId);
      if (result.issued) {
        setNotice('교환완료 증명서를 발급해 서류함에 넣었습니다.');
        void refresh();
      } else {
        setCertMissing(result.missing);
      }
    } catch (err) {
      setNotice((err as { message?: string }).message ?? '증명서를 내지 못했습니다.');
    } finally {
      setIssuing(false);
    }
  }

  /**
   * 올려 둔 서류로 법정의무를 채운다.
   *
   * 지금까지는 서류함에 올리고, 타임라인에 가서 같은 항목을 또 완료로 바꿔야 했다.
   * 한쪽만 하면 여기서 「끝나지 않았습니다」가 뜨고, 사장은 서류가 있는데 왜 그러나 한다.
   */
  async function runSync() {
    setSyncing(true);
    setNotice(null);
    try {
      const result = await syncObligations(matchId);
      setSynced(result);
      if (result.completed.length === 0 && result.alreadyDone.length === 0) {
        setNotice('서류함에서 채울 수 있는 항목이 없습니다. 아래 안내대로 증빙을 올려 주세요.');
      }
      void refresh();
    } catch (err) {
      setNotice((err as { message?: string }).message ?? '서류를 확인하지 못했습니다.');
    } finally {
      setSyncing(false);
    }
  }

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

          {state.serviceConfigured && !state.recordingConfigured && (
            <p className="mt-2 rounded-lg bg-amber-100/70 px-3 py-2 text-xs leading-5 text-amber-900">
              <strong>녹화 저장소가 아직 연결되지 않았습니다.</strong> 지금 통화를 열면 영상이
              남지 않습니다. 양측에게 녹화 동의를 받아 두고 녹화를 못 하면 나중에 문제가 되니,
              사무실에 설정을 요청해 주세요.
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

              {session.recording ? (
                <p className="rounded-lg bg-white px-3 py-2 text-[11px] leading-4 text-slate-600">
                  녹화 중입니다. 영상은 1년, 대화 기록은 5년 보관한 뒤 지워집니다.
                </p>
              ) : (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">
                  <strong>이 통화는 녹화되지 않습니다.</strong> 양측에 녹화한다고 안내하셨다면
                  지금 사실대로 알려 주세요.
                  {session.recordingError && ` (사유: ${session.recordingError})`}
                </p>
              )}

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

          {/*
            나이는 다른 항목과 성격이 다르다. 서류를 더 받아도 풀리지 않는다 —
            소개 행위 자체가 금지된 것이라 멈춰야 끝난다. 목록 위에 먼저 말해 둔다.
          */}
          {state.blockers.some((b) => b.kind === 'age') && (
            <p className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold leading-5 text-red-900">
              18세 미만은 소개할 수 없습니다. 이 건은 서류를 더 채워도 열리지 않습니다.
              생년월일을 여권으로 확인해 고치거나, 진행을 멈춰 주세요.
            </p>
          )}
          {/*
            지키는 일이 방어가 된다는 것까지 말해 준다. 양벌규정 단서가
            「상당한 주의와 감독」을 면책 사유로 두고 있어, 여기서 남는 기록이
            사고가 난 뒤에 업체를 구하는 자료가 된다.
          */}
          <p className="mt-1 text-[11px] leading-4 text-amber-700/90">
            여기서 처리한 기록은 누가 언제 무엇을 확인했는지까지 남습니다. 직원의 실수로
            문제가 생겨도 업체가 「상당한 주의와 감독」을 다했다는 근거가 됩니다(법 제27조 단서).
          </p>

          {/*
            나열하기 전에 먼저 채운다. 서류함에 이미 있는 증빙으로 끝낼 수 있는 항목은
            사람을 다른 화면으로 보낼 이유가 없다.
          */}
          {state.blockers.some((b) => b.kind === 'obligation') && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800">
                  서류함에 올린 증빙으로 채울 수 있습니다
                </p>
                <button
                  type="button"
                  onClick={() => void runSync()}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <FileCheck2 size={13} />}
                  {syncing ? '맞추는 중…' : '서류로 자동 확인'}
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                범죄경력·건강진단서·소득증빙·혼인관계증명을 서류함에 올려 두셨다면 눌러 주세요.
                해당 법정의무가 그 서류를 근거로 완료 처리됩니다.
              </p>

              {synced && synced.completed.length > 0 && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-emerald-900">
                  <strong>{synced.completed.length}건을 채웠습니다.</strong>{' '}
                  {synced.completed.map((c) => c.title).join(', ')}
                </p>
              )}
              {synced && synced.missing.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {synced.missing.map((m) => (
                    <li key={m.templateCode} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-700">{m.title}</p>
                      {m.hint && (
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{m.hint}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/*
                마지막 두 개는 서류를 받는 일이 아니라 우리가 하는 일이다.
                가는 길을 여기서 바로 열어 둔다 — 설명만 적어 두면 또 찾아다니게 된다.
              */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Link
                  to={`/agency/clients/${match.clientId}/background-info`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
                >
                  <Languages size={13} />모국어로 번역하기
                </Link>
                <button
                  type="button"
                  onClick={() => void makeCertificate()}
                  disabled={issuing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
                >
                  {issuing ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                  {issuing ? '내는 중…' : '교환완료 증명서 발급'}
                </button>
              </div>

              {certMissing && (
                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-amber-900">
                    아직 증명서를 낼 수 없습니다
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-4 text-amber-900/90">
                    {certMissing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

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
                      {/*
                        건너뛰면 어떻게 되는지를 적는다. 「영업정지 사유가 됩니다」만으로는
                        사람이 움직이지 않는다. 근거 없는 겁주기를 하지 않으려고
                        우리 정책인 항목에는 penalty를 붙이지 않았다.
                      */}
                      {blocker.penalty && (
                        <div className="mt-1.5 rounded bg-red-50/70 px-2 py-1.5">
                          {blocker.penalty.criminal && (
                            <p className="text-[11px] font-semibold leading-4 text-red-900">
                              {blocker.penalty.criminal}
                            </p>
                          )}
                          {blocker.penalty.administrative && (
                            <p className="text-[11px] leading-4 text-red-800/90">
                              {blocker.penalty.administrative}
                            </p>
                          )}
                          {blocker.penalty.precedent && (
                            <p className="mt-0.5 text-[11px] leading-4 text-red-700/80">
                              {blocker.penalty.precedent}
                            </p>
                          )}
                        </div>
                      )}
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
