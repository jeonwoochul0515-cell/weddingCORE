import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CircleAlert, Info, Radio, Sparkles } from 'lucide-react';
import { useRegulatoryDeltas, type DeltaItem } from '@/features/regulatoryRadar/useRegulatoryDeltas';

const STATUTES = [
  { id: '', label: '전체' },
  { id: 'marriage-brokerage-act', label: '결혼중개업법' },
  { id: 'immigration-control-act', label: '출입국관리법' },
  { id: 'multicultural-families-support-act', label: '다문화가족지원법' },
  { id: 'international-private-law', label: '국제사법' },
];

const CHANGE_LABEL: Record<DeltaItem['changeType'], string> = {
  new: '신설',
  amended: '개정',
  repealed: '폐지',
};

const PRIORITY_ICON = {
  critical: AlertTriangle,
  high: CircleAlert,
  medium: Info,
} as const;

const PRIORITY_COLOR = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-amber-600 bg-amber-50',
  medium: 'text-slate-600 bg-slate-100',
} as const;

export default function RegulatoryRadarPage() {
  const [params, setParams] = useSearchParams();
  const statuteId = params.get('statute') ?? '';
  const [selected, setSelected] = useState(statuteId);

  const { items, loading } = useRegulatoryDeltas({
    statuteId: selected || undefined,
    max: 100,
  });

  const byStatute = useMemo(() => {
    const map = new Map<string, DeltaItem[]>();
    for (const item of items) {
      if (!map.has(item.statuteId)) map.set(item.statuteId, []);
      map.get(item.statuteId)!.push(item);
    }
    return map;
  }, [items]);

  function onStatuteChange(id: string) {
    setSelected(id);
    if (id) setParams({ statute: id });
    else setParams({});
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#102621] px-6 py-7 text-white shadow-[0_20px_50px_rgba(16,38,33,.14)] sm:px-8 sm:py-9">
        <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex items-end justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-emerald-300 uppercase"><Sparkles size={14} />Regulatory intelligence</div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl"><Radio />규제 변동 레이더</h1>
          <p className="mt-3 text-sm text-slate-300">
            국가법령정보 기준 매일 03시 변경 사항을 자동 수집합니다.
          </p>
        </div>
      </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {STATUTES.map((s) => (
          <button
            key={s.id || 'all'}
            onClick={() => onStatuteChange(s.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
              selected === s.id
                ? 'bg-[#102621] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && items.length === 0 && (
        <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-14 text-center">
          <p className="text-sm text-slate-500">감지된 법령 변경이 없습니다.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = PRIORITY_ICON[item.priority] ?? Info;
          const colorCls = PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.medium;
          return (
            <div
              key={item.id}
              className="app-surface flex items-start gap-4 rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(16,38,33,.07)] sm:p-5"
            >
              <div className={`rounded-xl p-2.5 ${colorCls}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium">{statuteLabel(item.statuteId)}</span>
                  <span>·</span>
                  <span>{CHANGE_LABEL[item.changeType]}</span>
                  {item.articleNumber && (
                    <>
                      <span>·</span>
                      <span>제{item.articleNumber}조</span>
                    </>
                  )}
                  {item.detectedAt && (
                    <>
                      <span>·</span>
                      <span>{item.detectedAt.toDate().toLocaleString('ko-KR')}</span>
                    </>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium leading-6 text-slate-900">{item.diffSummary}</div>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-slate-500 underline hover:text-slate-700"
                >
                  국가법령정보센터 열기 →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {!selected && byStatute.size > 0 && (
        <p className="mt-6 text-xs text-slate-400">
          총 {items.length}건 · 법령별:{' '}
          {Array.from(byStatute.entries())
            .map(([id, list]) => `${statuteLabel(id)} ${list.length}`)
            .join(', ')}
        </p>
      )}
    </div>
  );
}

function statuteLabel(id: string): string {
  return STATUTES.find((s) => s.id === id)?.label ?? id;
}
