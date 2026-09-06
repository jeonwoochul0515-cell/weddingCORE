// 고객 등록·수정 창 — 직접 등록, 접수에서 넘어온 등록, 기존 고객 수정 세 경우를 같은 창으로 처리한다
//
// 접수에서 오면 이름·연락처·혼인이력이 채워진 채 열리고, 점검 결과가 고객 문서에 접수 기록으로 따라간다.
// 생년월일·주소·직업·연소득은 접수에 없으므로 대표가 채운다. 구간 값을 숫자로 짐작해 넣지 않는다.
// 연소득은 계약 때 정확히 모르는 경우가 많아 비워 둘 수 있다.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Inbox, X } from 'lucide-react';
import PhotoField from '@/features/photos/PhotoField';
import { createClient, newClientId, updateClientBasics, type ClientBasics, type CreateClientIntake } from './useAgencyClients';
import { useAuthStore } from '@/store/authStore';

export type CreateClientFormValues = {
  name: string;
  birthDate: string;
  /** 기본값을 '남'으로 두면 여성 고객이 조용히 잘못 저장된다. 비워 두고 고르게 한다 */
  gender: 'M' | 'F' | '';
  phone: string;
  address: string;
  /** 비워 두면 '' 로 온다 */
  incomeAnnual: string;
  occupation: string;
  maritalHistory: string;
};

type Props = {
  onClose: () => void;
  /** 등록이면 새 id, 수정이면 기존 id */
  onCreated: (clientId: string) => void;
  /** 접수에서 넘어올 때 또는 수정할 때 미리 채울 값 */
  initial?: Partial<CreateClientFormValues>;
  /** 접수 기록. 있으면 고객 문서에 함께 저장된다 */
  intake?: CreateClientIntake;
  /** 있으면 새로 만들지 않고 이 고객의 기본정보를 고친다 */
  editingClientId?: string;
  /** 수정일 때 지금 걸려 있는 사진 */
  initialPhotoUrl?: string | null;
};

function toBasics(values: CreateClientFormValues): ClientBasics {
  const income = values.incomeAnnual === '' || values.incomeAnnual == null ? null : Number(values.incomeAnnual);
  return {
    name: values.name.trim(),
    birthDate: new Date(values.birthDate),
    gender: values.gender === 'F' ? 'F' : 'M',
    phone: values.phone.trim(),
    address: values.address.trim(),
    incomeAnnual: income != null && Number.isFinite(income) ? income : null,
    occupation: values.occupation.trim(),
    maritalHistory: values.maritalHistory,
  };
}

export default function CreateClientDialog({ onClose, onCreated, initial, intake, editingClientId, initialPhotoUrl }: Props) {
  const user = useAuthStore((s) => s.user);
  const editing = Boolean(editingClientId);
  // 사진을 저장 전에 올려야 하므로 새 고객도 id를 먼저 잡아 둔다
  const [clientId] = useState(() => editingClientId ?? (user?.agencyId ? newClientId(user.agencyId) : ''));
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl ?? null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateClientFormValues>({
    defaultValues: { gender: '', maritalHistory: '', incomeAnnual: '', ...initial },
  });
  const [error, setError] = useState<string | null>(null);

  // 원 단위로 적으면 자리수를 세기 어렵다. 옆에 만원으로 바꿔 보여 준다.
  const incomeRaw = watch('incomeAnnual');
  const incomeManwon = incomeRaw !== '' && Number.isFinite(Number(incomeRaw))
    ? `${Math.round(Number(incomeRaw) / 10_000).toLocaleString()}만원`
    : null;

  async function onSubmit(values: CreateClientFormValues) {
    if (!user?.agencyId) return;
    setError(null);
    try {
      const basics = toBasics(values);
      if (editingClientId) {
        await updateClientBasics(user.agencyId, editingClientId, basics, photoUrl);
        onCreated(editingClientId);
        return;
      }
      const id = await createClient(
        user.agencyId,
        user.uid,
        basics,
        intake ? { source: { type: 'lead', leadId: intake.leadId, via: intake.source }, intake } : undefined,
        { clientId, photoUrl },
      );
      onCreated(id);
    } catch (err) {
      setError(`저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(err as Error).message})`);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{editing ? '고객 정보 수정' : '신규 고객 등록'}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        {intake && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-900">
            <Inbox size={15} className="mt-0.5 shrink-0" />
            <span>접수에서 넘어온 손님입니다. 이름·연락처·혼인이력은 채워 두었고, 점검 결과는 고객 화면에 접수 기록으로 함께 저장됩니다. 나머지는 상담에서 확인한 대로 적어 주세요.</span>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-6">
          <PhotoField
            agencyId={user?.agencyId}
            kind="clients"
            targetId={clientId}
            url={photoUrl}
            onChange={setPhotoUrl}
            size="sm"
          />
          <Field label="이름" error={errors.name?.message}>
            <input className="input" autoComplete="off" {...register('name', { required: '이름을 적어 주세요.' })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="생년월일" error={errors.birthDate?.message}>
              <input type="date" className="input" {...register('birthDate', { required: '생년월일을 골라 주세요.' })} />
            </Field>
            <Field label="성별" error={errors.gender?.message}>
              <select className="input" {...register('gender', { required: '성별을 골라 주세요.' })}>
                <option value="">선택</option>
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </Field>
          </div>
          <Field label="연락처" error={errors.phone?.message}>
            <input type="tel" inputMode="tel" className="input" placeholder="010-0000-0000" {...register('phone', { required: '연락처를 적어 주세요.' })} />
          </Field>
          <Field label="주소" error={errors.address?.message}>
            <input className="input" placeholder="시·군·구까지 포함" {...register('address', { required: '주소를 적어 주세요.' })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="직업" error={errors.occupation?.message}>
              <input className="input" {...register('occupation', { required: '직업을 적어 주세요.' })} />
            </Field>
            <Field label="연소득 (원, 모르면 비워 두세요)" error={errors.incomeAnnual?.message} hint={incomeManwon ? `= ${incomeManwon}` : undefined}>
              <input type="number" inputMode="numeric" className="input" placeholder="예: 36000000" {...register('incomeAnnual', { min: { value: 0, message: '0 이상이어야 합니다.' } })} />
            </Field>
          </div>
          <Field label="혼인이력" error={errors.maritalHistory?.message}>
            <select className="input" {...register('maritalHistory', { required: '혼인이력을 골라 주세요.' })}>
              <option value="">선택</option>
              <option value="none">미혼</option>
              <option value="divorced">이혼</option>
              <option value="widowed">사별</option>
            </select>
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">취소</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? '저장 중…' : editing ? '저장' : '등록'}
            </button>
          </div>
        </form>
        <style>{`
          .input { width:100%; border:1px solid rgb(203 213 225); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; }
          .input:focus { outline:none; border-color:rgb(15 23 42); }
          .btn-primary { background:rgb(15 23 42); color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.875rem; font-weight:500; }
          .btn-primary:hover { background:rgb(30 41 59); }
          .btn-primary:disabled { opacity:0.5; }
          .btn-ghost { background:white; color:rgb(15 23 42); padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.875rem; border:1px solid rgb(203 213 225); }
          .btn-ghost:hover { background:rgb(248 250 252); }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
