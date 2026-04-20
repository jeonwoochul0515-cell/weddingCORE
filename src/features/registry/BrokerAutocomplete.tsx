import { useEffect, useRef, useState } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { Search, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { app } from '@/lib/firebase';

const functions = getFunctions(app, 'asia-northeast3');

export type BrokerHit = {
  entrpsNm: string;
  rprsvNm: string;
  region: string;
  mrbrkRegYmd: string | null;
  operYn: boolean;
  hasSanctions: boolean;
  location: { lat: number; lng: number } | null;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect: (hit: BrokerHit) => void;
  selected?: BrokerHit | null;
  placeholder?: string;
  error?: string;
};

export default function BrokerAutocomplete({
  value,
  onChange,
  onSelect,
  selected,
  placeholder = '업체명 검색 (2자 이상)',
  error,
}: Props) {
  const [hits, setHits] = useState<BrokerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    // 선택된 업체 그대로면 재검색 불필요
    if (selected && selected.entrpsNm === q) {
      setHits([]);
      return;
    }
    if (q.length < 2) {
      setHits([]);
      setFetchError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const fn = httpsCallable<
          { keyword: string },
          { ok: boolean; count: number; totalCount: number; hits: BrokerHit[] }
        >(functions, 'searchBrokerRegistry');
        const res = await fn({ keyword: q });
        setHits(res.data.hits ?? []);
        setOpen(true);
      } catch (err) {
        setFetchError((err as Error).message);
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, selected]);

  function formatYmd(ymd: string | null) {
    if (!ymd || ymd.length !== 8) return '';
    return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-md border border-slate-300 pl-9 pr-9 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        )}
      </div>

      {selected && selected.entrpsNm === value.trim() && (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
          <div className="flex items-center gap-1 font-medium text-emerald-900">
            <CheckCircle2 size={12} />
            성평등가족부 공시 매칭됨
          </div>
          <div className="mt-1 text-emerald-800">
            {selected.rprsvNm} · {selected.region}
            {selected.mrbrkRegYmd && ` · 등록일 ${formatYmd(selected.mrbrkRegYmd)}`}
          </div>
        </div>
      )}

      {fetchError && <p className="mt-1 text-xs text-red-600">{fetchError}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {hits.map((h, i) => (
            <li key={`${h.entrpsNm}_${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(h);
                  onChange(h.entrpsNm);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{h.entrpsNm}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{h.rprsvNm}</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {h.region}
                  </span>
                  {h.mrbrkRegYmd && <span>{formatYmd(h.mrbrkRegYmd)}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && hits.length === 0 && value.trim().length >= 2 && !fetchError && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 shadow-lg">
          공시 DB에서 일치하는 업체를 찾지 못했습니다. 철자를 확인하거나 아직 공시에 등록되지 않은
          업체라면 "수동 입력"으로 진행해 주세요.
        </div>
      )}
    </div>
  );
}
