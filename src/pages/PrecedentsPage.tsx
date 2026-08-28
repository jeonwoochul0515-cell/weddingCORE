// 판례·재결례 열람 — 어떤 사유로 거부되고 다투어졌는지를 요건별로 찾아본다
//
// 업체가 서류를 준비하면서 "이 고객이 어디서 걸릴까"를 가늠하는 데 쓴다.
// 특히 행정심판 재결례에는 처분청이 왜 거부했고 그것이 왜 유지·취소됐는지가
// 그대로 들어 있어 판례보다 실무에 가깝다.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ExternalLink, Loader2, Scale, Search, X } from 'lucide-react';
import {
  usePrecedentCounts,
  usePrecedentDetail,
  usePrecedentSearch,
  type PrecedentSummary,
} from '@/features/precedents/usePrecedents';

/**
 * 화면에 노출하는 요건. 서버 visaRequirements.ts의 key와 같아야 한다.
 * 유학(study_*) 요건은 뺐다 — 유학 도메인은 2026-08-28 KoAdmit으로 이관했다.
 */
const REQUIREMENTS = [
  { key: '', label: '전체' },
  { key: 'f6_income', label: '초청인 소득요건' },
  { key: 'f6_authenticity', label: '혼인의 진정성' },
  { key: 'f6_communication', label: '의사소통' },
  { key: 'f6_housing', label: '주거요건' },
  { key: 'f6_invitation_limit', label: '초청 제한' },
  { key: 'f6_guidance_program', label: '국제결혼 안내프로그램' },
  { key: 'extension_status_maintained', label: '체류 실태 유지' },
  { key: 'extension_change_eligibility', label: '자격변경 적격' },
  // 결혼이민자가 F-6를 졸업하는 두 갈래. 우리 사업의 마지막 단계이기도 하다.
  { key: 'naturalization', label: '간이귀화' },
  { key: 'permanent_residency', label: '영주(F-5)' },
];

const REQUIREMENT_LABEL: Record<string, string> = Object.fromEntries(
  REQUIREMENTS.filter((r) => r.key).map((r) => [r.key, r.label]),
);

const KINDS = [
  { key: '', label: '전체' },
  { key: 'decc', label: '행정심판 재결례' },
  { key: 'prec', label: '법원 판례' },
];

/** '2024.05.16' 또는 '20240516' → 2024. 5. 16. */
function dateLabel(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length !== 8) return value || '일자 미상';
  return `${d.slice(0, 4)}. ${Number(d.slice(4, 6))}. ${Number(d.slice(6))}.`;
}

function KindBadge({ kind }: { kind: 'prec' | 'decc' }) {
  const isRuling = kind === 'decc';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        isRuling ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
      }`}
    >
      {isRuling ? <Scale size={11} /> : <BookOpen size={11} />}
      {isRuling ? '재결례' : '판례'}
    </span>
  );
}

function RequirementBadges({
  keys,
  weakKeys,
  confidence,
}: {
  keys: string[];
  weakKeys: string[];
  confidence: 'auto' | 'reviewed' | 'none';
}) {
  const strong = keys.filter((k) => REQUIREMENT_LABEL[k]);
  // 강하게 걸린 요건은 약한 쪽에서 뺀다. 같은 요건이 두 번 보이면 헷갈린다.
  const weak = weakKeys.filter((k) => REQUIREMENT_LABEL[k] && !keys.includes(k));
  if (strong.length === 0 && weak.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {strong.map((k) => (
        <span
          key={k}
          className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700"
        >
          {REQUIREMENT_LABEL[k]}
        </span>
      ))}
      {/* 본문에서만 낱말이 걸린 것이라 쟁점이 아닐 수 있다. 색을 달리해 구분한다. */}
      {weak.map((k) => (
        <span
          key={k}
          className="rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-500"
          title="본문에서 관련 표현이 발견됐지만 이 사건의 쟁점이 아닐 수 있습니다"
        >
          {REQUIREMENT_LABEL[k]}?
        </span>
      ))}
      {/* 낱말 매칭으로 붙인 분류다. 사람이 검수한 것과 구분해 보여준다. */}
      {confidence === 'auto' && strong.length > 0 && (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          자동 분류
        </span>
      )}
    </div>
  );
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { detail, loading, error, open } = usePrecedentDetail();

  useEffect(() => {
    void open(id);
  }, [id, open]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-[#102621]">
            {detail?.caseName || (loading ? '불러오는 중…' : '사건 내용')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            사건 내용을 불러오고 있습니다.
          </div>
        )}
        {error && <p className="py-6 text-sm text-red-600">{error}</p>}

        {detail && (
          <div className="space-y-5 text-sm leading-relaxed text-slate-700">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <KindBadge kind={detail.kind} />
              <span className="font-semibold text-slate-700">{detail.caseNumber}</span>
              <span>{detail.courtName || detail.agency}</span>
              <span>{dateLabel(detail.decidedOn)}</span>
            </div>

            <RequirementBadges
              keys={detail.requirements}
              weakKeys={detail.requirementsWeak}
              confidence={detail.requirementConfidence}
            />

            {detail.summary && (
              <section>
                <h3 className="mb-1 text-xs font-bold text-slate-500">
                  {detail.kind === 'decc' ? '청구취지' : '판시사항'}
                </h3>
                <p className="whitespace-pre-wrap">{detail.summary}</p>
              </section>
            )}

            {detail.holding && (
              <section>
                <h3 className="mb-1 text-xs font-bold text-slate-500">
                  {detail.kind === 'decc' ? '재결요지' : '판결요지'}
                </h3>
                <p className="whitespace-pre-wrap">{detail.holding}</p>
              </section>
            )}

            {detail.disposition && (
              <section>
                <h3 className="mb-1 text-xs font-bold text-slate-500">주문</h3>
                <p className="whitespace-pre-wrap">{detail.disposition}</p>
              </section>
            )}

            {detail.references && (
              <section>
                <h3 className="mb-1 text-xs font-bold text-slate-500">참조조문</h3>
                <p className="whitespace-pre-wrap text-slate-600">{detail.references}</p>
              </section>
            )}

            {detail.body && (
              <section>
                <h3 className="mb-1 text-xs font-bold text-slate-500">
                  {detail.kind === 'decc' ? '이유' : '전문'}
                </h3>
                <p className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[13px] text-slate-600">
                  {detail.body}
                </p>
              </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                다른 사건의 기록입니다. 우리 사건의 결론이 아니며, 사실관계가 다르면 판단도 달라집니다.
              </p>
              <a
                href={detail.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                국가법령정보센터에서 원문 확인 <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrecedentCard({ item, onOpen }: { item: PrecedentSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <KindBadge kind={item.kind} />
        <span className="font-semibold text-slate-700">{item.caseNumber}</span>
        <span>{item.courtName || item.agency}</span>
        <span>{dateLabel(item.decidedOn)}</span>
      </div>
      <h3 className="mb-2 font-bold text-[#102621]">{item.caseName || '사건명 없음'}</h3>
      {item.summary && (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.summary}</p>
      )}
      <RequirementBadges
        keys={item.requirements}
        weakKeys={item.requirementsWeak}
        confidence={item.requirementConfidence}
      />
    </button>
  );
}

export default function PrecedentsPage() {
  const [params, setParams] = useSearchParams();
  const requirement = params.get('requirement') ?? '';
  const kind = params.get('kind') ?? '';
  const [keyword, setKeyword] = useState('');
  const [includeWeak, setIncludeWeak] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = usePrecedentCounts();
  const { items, total, loading, error } = usePrecedentSearch({
    requirement: requirement || undefined,
    kind: kind || undefined,
    keyword: keyword.trim() || undefined,
    limit: 50,
    includeWeak,
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#102621]">거부 사례 찾아보기</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          결혼이민(F-6) 비자가 어떤 사유로 거부되고 다투어졌는지 요건별로 모았습니다.
          행정심판 재결례에는 처분청이 왜 거부했는지가 그대로 남아 있어 서류를 준비할 때 참고가 됩니다.
        </p>
        {counts && (
          <p className="mt-2 text-xs text-slate-500">
            전체 {counts.total.toLocaleString()}건 · 재결례 {counts.decc.toLocaleString()}건 · 판례{' '}
            {counts.prec.toLocaleString()}건
          </p>
        )}
      </header>

      <section className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {REQUIREMENTS.map((r) => {
            const table = includeWeak ? counts?.byRequirementWithWeak : counts?.byRequirement;
            const n = r.key ? table?.[r.key] : counts?.total;
            const active = requirement === r.key;
            return (
              <button
                key={r.key || 'all'}
                type="button"
                onClick={() => setParam('requirement', r.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#102621] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {r.label}
                {typeof n === 'number' && (
                  <span className={active ? ' text-white/70' : ' text-slate-400'}> {n}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.key || 'all'}
                type="button"
                onClick={() => setParam('kind', k.key)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  kind === k.key
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={includeWeak}
              onChange={(e) => setIncludeWeak(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
            />
            본문에서만 언급된 사건도 포함
          </label>

          <label className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="사건명·요지·사건번호 검색"
              maxLength={60}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-emerald-400"
            />
          </label>
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          찾는 중입니다.
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          사례를 불러오지 못했습니다. {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {total.toLocaleString()}건 중 {items.length.toLocaleString()}건을 보여 줍니다.
            {total > items.length && ' 검색어나 요건으로 좁혀 보세요.'}
          </p>
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              조건에 맞는 사례가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <PrecedentCard key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {counts && counts.unlinked > 0 && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
          전체 {counts.total.toLocaleString()}건 가운데 {counts.unlinked.toLocaleString()}건은 아직
          어느 요건에도 연결되지 않았습니다. 요건으로 좁히면 그만큼은 걸러지지 않으니,
          찾는 사건이 없으면 요건을 '전체'로 두고 검색어로 찾아보세요.
        </p>
      )}

      <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        요건 옆의 물음표 표시는 본문에서 관련 표현만 발견된 것으로, 그 사건의 쟁점이 아닐 수 있습니다.
        요건 분류는 사건 본문의 낱말을 기준으로 자동으로 붙인 것이라 실제 쟁점과 다를 수 있습니다.
        각 사건의 원문은 국가법령정보센터에서 확인할 수 있으며, 개별 사건의 판단은
        변호사 검토를 거쳐야 합니다.
      </p>

      {openId && <DetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
