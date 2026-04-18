import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  createBackgroundInfo,
  updateBackgroundInfoFields,
  useBackgroundInfo,
  useBackgroundInfoList,
  type BackgroundSubject,
} from '@/features/sideBySide/useBackgroundInfo';
import BackgroundInfoForm from '@/features/sideBySide/BackgroundInfoForm';
import ParallelView from '@/features/sideBySide/ParallelView';
import type { SupportedLang } from '@/features/sideBySide/fields';

export default function BackgroundInfoPage() {
  const { clientId } = useParams();
  const [params, setParams] = useSearchParams();
  const activeInfoId = params.get('info');
  const activeMode = (params.get('mode') as 'edit' | 'parallel' | null) ?? 'edit';

  const { items } = useBackgroundInfoList(clientId);
  const user = useAuthStore((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [targetLang, setTargetLang] = useState<SupportedLang>('vi');

  const { info, translations, loading } = useBackgroundInfo(clientId, activeInfoId ?? undefined);

  useEffect(() => {
    if (!activeInfoId && items.length > 0) {
      setParams({ info: items[0]!.id, mode: 'edit' });
    }
  }, [activeInfoId, items, setParams]);

  async function createNew(subject: BackgroundSubject) {
    if (!user?.agencyId || !clientId) return;
    setCreating(true);
    try {
      const id = await createBackgroundInfo({
        agencyId: user.agencyId,
        clientId,
        subject,
        sourceLang: subject === 'korean' ? 'ko' : 'vi',
        fields: {},
      });
      setParams({ info: id, mode: 'edit' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <Link to={`/agency/clients/${clientId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} />고객 상세로
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">신상정보 교환</h1>
          <p className="text-sm text-slate-500">결혼중개업법 §10의2 이행</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createNew('korean')}
            disabled={creating}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} />한국인 측 신규
          </button>
          <button
            onClick={() => createNew('partner')}
            disabled={creating}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} />외국인 측 신규
          </button>
        </div>
      </div>

      {/* 사이드 목록 + 본체 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {items.length === 0 && (
            <p className="text-xs text-slate-400">신상정보가 없습니다.</p>
          )}
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setParams({ info: it.id, mode: activeMode })}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                activeInfoId === it.id ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="font-medium">
                {it.subject === 'korean' ? '한국인 측' : '외국인 측'}
              </div>
              <div className="text-xs opacity-70">
                {it.createdAt?.toDate().toLocaleDateString('ko-KR')}
              </div>
            </button>
          ))}
        </aside>

        <main>
          {!info && !loading && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              좌측에서 신상정보를 선택하거나 신규 생성하세요.
            </p>
          )}

          {info && (
            <>
              <div className="mb-3 inline-flex rounded-md border border-slate-200 bg-white p-1 text-sm">
                <button
                  onClick={() => setParams({ info: info.id, mode: 'edit' })}
                  className={`rounded px-3 py-1 ${activeMode === 'edit' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  편집
                </button>
                <button
                  onClick={() => setParams({ info: info.id, mode: 'parallel' })}
                  className={`rounded px-3 py-1 ${activeMode === 'parallel' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  나란히 보기
                </button>
              </div>

              {activeMode === 'edit' && (
                <BackgroundInfoForm
                  initial={info.fields}
                  onSave={async (values) => {
                    if (!user?.agencyId || !clientId) return;
                    await updateBackgroundInfoFields(user.agencyId, clientId, info.id, values);
                  }}
                />
              )}

              {activeMode === 'parallel' && (
                <ParallelView
                  info={info}
                  translations={translations}
                  targetLang={targetLang}
                  onTargetLangChange={setTargetLang}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
