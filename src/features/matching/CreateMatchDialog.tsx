import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { createMatch } from './useMatches';
import { useAuthStore } from '@/store/authStore';
import { ageOf, usePartners } from '@/features/partners/usePartners';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import type { Match } from '@/types/schema';

type FormValues = {
  clientName: string;
  partnerName: string;
  type: Match['type'];
  date: string;
  memo: string;
};

type Props = {
  /**
   * 고객 상세에서 열 때는 그 고객이 정해져 있다.
   * 비워서 열면(매칭 관리 화면) 창 안에서 고객도 고르게 한다.
   */
  clientId?: string;
  partnerId: string;
  defaultClientName?: string;
  defaultPartnerName?: string;
  mbtiScore?: number | null;
  sajuScore?: number | null;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateMatchDialog({
  clientId, partnerId, defaultClientName, defaultPartnerName,
  mbtiScore, sajuScore, onClose, onCreated,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      clientName: defaultClientName ?? '',
      partnerName: defaultPartnerName ?? '',
      type: '맞선',
      date: new Date().toISOString().slice(0, 10),
      memo: '',
    },
  });
  const [error, setError] = useState<string | null>(null);
  // 후보 명부에서 고른다. 이름을 손으로 치면 오타가 나고 나중에 그 사람을 못 찾는다.
  const { items: partners } = usePartners();
  const [pickedId, setPickedId] = useState(partnerId);
  // 고객도 마찬가지다. 바깥에서 정해 준 것이 없을 때만 고르게 한다.
  const { items: clients } = useAgencyClients('active');
  const [pickedClientId, setPickedClientId] = useState(clientId ?? '');

  async function onSubmit(v: FormValues) {
    if (!user?.agencyId) return;
    setError(null);
    if (!pickedClientId) {
      setError('어느 고객의 맞선인지 고라 주세요.');
      return;
    }
    if (!pickedId) {
      setError('후보 명부에서 상대방을 고라 주세요. 명부를 거쳐야 나중에 그 사람을 찾을 수 있습니다.');
      return;
    }
    try {
      await createMatch(user.agencyId, user.uid, {
        clientId: pickedClientId,
        partnerId: pickedId,
        clientName: v.clientName,
        partnerName: v.partnerName,
        type: v.type,
        date: new Date(v.date),
        memo: v.memo,
        mbtiScore: mbtiScore ?? null,
        sajuScore: sajuScore ?? null,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">매칭 기록 추가</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-6">
          {/* 바깥에서 고객을 정해 주지 않았을 때만 고르게 한다 */}
          {!clientId && (
            <div>
              <Fd label="어느 고객">
                <select
                  className="input"
                  value={pickedClientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPickedClientId(id);
                    const c = clients.find((x) => x.id === id);
                    if (c) setValue('clientName', c.koreanClient?.name ?? '');
                  }}
                >
                  <option value="">고르세요</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.koreanClient?.name ?? '(이름없음)'}
                      {c.koreanClient?.phone ? ` · ${c.koreanClient.phone}` : ''}
                    </option>
                  ))}
                </select>
              </Fd>
              {clients.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  고객이 없습니다. 왼쪽 메뉴 「고객」에서 먼저 등록해 주세요.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Fd label="한국측 이름">
              <input className="input" {...register('clientName', { required: true })} />
            </Fd>
            <Fd label="외국측 이름">
              <input className="input" {...register('partnerName', { required: true })} />
            </Fd>
          </div>
          <div>
            <Fd label="후보 명부에서 고르기">
              <select
                className="input"
                value={pickedId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPickedId(id);
                  const p = partners.find((x) => x.id === id);
                  if (p) setValue('partnerName', p.name);
                }}
              >
                <option value="">직접 입력</option>
                {partners.map((p) => {
                  const age = ageOf(p.birthDate);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.nationality ? ` · ${p.nationality}` : ''}{age != null ? ` · ${age}세` : ''}
                    </option>
                  );
                })}
              </select>
            </Fd>
            {partners.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                후보 명부가 비어 있습니다. 왼쪽 메뉴 「후보 명부」에서 먼저 등록하면 여기서 고를 수 있습니다.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Fd label="유형">
              <select className="input" {...register('type')}>
                <option value="맞선">맞선</option>
                <option value="프로필교환">프로필교환</option>
                <option value="화상상담">화상상담</option>
              </select>
            </Fd>
            <Fd label="날짜">
              <input type="date" className="input" {...register('date', { required: true })} />
            </Fd>
          </div>

          {(mbtiScore != null || sajuScore != null) && (
            <div className="flex gap-3 text-xs text-slate-500">
              {mbtiScore != null && <span>MBTI 궁합: {mbtiScore}점</span>}
              {sajuScore != null && <span>사주 궁합: {sajuScore}점</span>}
            </div>
          )}

          <Fd label="메모">
            <textarea className="input" rows={2} {...register('memo')} />
          </Fd>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50">취소</button>
            <button type="submit" disabled={isSubmitting} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
              {isSubmitting ? '저장 중…' : '기록 추가'}
            </button>
          </div>
        </form>
        <style>{`
          .input { width:100%; border:1px solid rgb(203 213 225); border-radius:0.375rem; padding:0.375rem 0.625rem; font-size:0.8125rem; }
          .input:focus { outline:none; border-color:rgb(15 23 42); }
        `}</style>
      </div>
    </div>
  );
}

function Fd({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
