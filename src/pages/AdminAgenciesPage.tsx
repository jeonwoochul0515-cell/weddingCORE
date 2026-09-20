import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { db, app } from '@/lib/firebase';
import type { Agency } from '@/types/schema';

const functions = getFunctions(app, 'asia-northeast3');

export default function AdminAgenciesPage() {
  const [pending, setPending] = useState<(Agency & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const q = query(
      collection(db, 'agencies'),
      where('verificationStatus', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    setPending(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Agency) })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  /**
   * 인증은 공시 대조를 거친다. 공시에 없는 업체는 국제결혼중개업 등록이 없다는 뜻이라
   * 서버가 한 번 막는다. 등록증을 눈으로 확인했을 때만 사유를 적어 넘긴다 —
   * 그 사유는 업체 문서에 남아 나중에 「누가 왜 통과시켰나」를 대답한다.
   */
  async function decide(agencyId: string, decision: 'approve' | 'reject') {
    setProcessing(agencyId);
    try {
      const fn = httpsCallable(functions, decision === 'approve' ? 'approveAgency' : 'rejectAgency');
      await fn({ agencyId });
      await load();
    } catch (err) {
      const message = (err as Error).message;
      const blockedByRegistry = message.includes('공시');
      if (decision === 'approve' && blockedByRegistry) {
        const reason = window.prompt(
          `${message}\n\n등록증을 직접 확인하셨다면 그 근거를 적어 주세요.\n` +
            '(예: 국제결혼중개업 등록증 사본 확인, 부산-연제-국제-26-0001호)',
        );
        if (!reason?.trim()) return;
        try {
          const fn2 = httpsCallable(functions, 'approveAgency');
          await fn2({ agencyId, force: true, forceReason: reason.trim() });
          await load();
        } catch (e2) {
          alert((e2 as Error).message);
        }
        return;
      }
      alert(message);
    } finally {
      setProcessing(null);
    }
  }

  async function runSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const fn = httpsCallable<unknown, { ok: boolean; count: number }>(
        functions, 'seedObligationTemplates',
      );
      const res = await fn({});
      setSeedResult(`템플릿 ${res.data.count}개 업서트 완료`);
    } catch (err) {
      setSeedResult(`실패: ${(err as Error).message}`);
    } finally {
      setSeeding(false);
    }
  }

  async function runCrawl() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const fn = httpsCallable(functions, 'runCrawlNow');
      const res = await fn({});
      setSeedResult(`크롤 완료: ${JSON.stringify(res.data)}`);
    } catch (err) {
      setSeedResult(`실패: ${(err as Error).message}`);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">관리자 작업</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runSeed}
            disabled={seeding}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            의무 템플릿 시드 (40개)
          </button>
          <button
            onClick={runCrawl}
            disabled={seeding}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            법령 크롤 즉시 실행
          </button>
        </div>
        {seedResult && <p className="mt-2 text-xs text-slate-600">{seedResult}</p>}
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        공시 인증 검토 ({pending.length})
      </h1>
      {/* 이 목록은 서비스 사용을 막고 있는 줄이 아니다. 사용 권한은 가입 즉시 나간다.
          여기서 하는 일은 등록번호가 공시 자료와 맞는지 보고 「공시 인증」 배지를 주는 것이다.
          반려하면 그때 접수 위젯과 직원 초대가 막힌다. */}
      <p className="mb-4 text-xs leading-5 text-slate-500">
        업체는 가입 즉시 서비스를 씁니다. 여기서는 등록번호가 공시 자료와 맞는지 확인해
        「공시 인증」 배지를 줍니다. 반려하면 접수 위젯과 직원 초대가 막힙니다.
      </p>
      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && pending.length === 0 && (
        <p className="text-sm text-slate-500">검토할 업체가 없습니다.</p>
      )}
      <div className="space-y-3">
        {pending.map((a) => (
          <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900">{a.name}</div>
                <div className="text-xs text-slate-500">ID: {a.id}</div>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-slate-500">사업자번호</dt>
                  <dd>{a.businessNumber}</dd>
                  <dt className="text-slate-500">중개업 등록번호</dt>
                  <dd>{a.registrationNumber}</dd>
                  <dt className="text-slate-500">대표 UID</dt>
                  <dd className="truncate">{a.ownerUid}</dd>
                </dl>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => decide(a.id, 'approve')}
                  disabled={processing === a.id}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  인증
                </button>
                <button
                  onClick={() => decide(a.id, 'reject')}
                  disabled={processing === a.id}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  반려
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
