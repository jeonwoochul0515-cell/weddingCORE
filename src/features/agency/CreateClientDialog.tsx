import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { createClient } from './useAgencyClients';
import { useAuthStore } from '@/store/authStore';

type FormValues = {
  name: string;
  birthDate: string;
  gender: 'M' | 'F';
  phone: string;
  address: string;
  incomeAnnual: number;
  occupation: string;
  maritalHistory: string;
};

type Props = {
  onClose: () => void;
  onCreated: (clientId: string) => void;
};

export default function CreateClientDialog({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: FormValues) {
    if (!user?.agencyId) return;
    setError(null);
    try {
      const id = await createClient(user.agencyId, user.uid, {
        ...values,
        birthDate: new Date(values.birthDate),
        incomeAnnual: Number(values.incomeAnnual),
      });
      onCreated(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">신규 고객 등록</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-6">
          <Field label="이름" error={errors.name?.message}>
            <input className="input" {...register('name', { required: '필수' })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="생년월일" error={errors.birthDate?.message}>
              <input type="date" className="input" {...register('birthDate', { required: '필수' })} />
            </Field>
            <Field label="성별" error={errors.gender?.message}>
              <select className="input" {...register('gender', { required: '필수' })}>
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </Field>
          </div>
          <Field label="연락처" error={errors.phone?.message}>
            <input className="input" placeholder="010-0000-0000" {...register('phone', { required: '필수' })} />
          </Field>
          <Field label="주소" error={errors.address?.message}>
            <input className="input" {...register('address', { required: '필수' })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="직업" error={errors.occupation?.message}>
              <input className="input" {...register('occupation', { required: '필수' })} />
            </Field>
            <Field label="연소득 (원)" error={errors.incomeAnnual?.message}>
              <input type="number" className="input" {...register('incomeAnnual', { required: '필수', min: 0 })} />
            </Field>
          </div>
          <Field label="혼인이력" error={errors.maritalHistory?.message}>
            <select className="input" {...register('maritalHistory', { required: '필수' })}>
              <option value="none">미혼</option>
              <option value="divorced">이혼</option>
              <option value="widowed">사별</option>
            </select>
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">취소</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? '생성 중…' : '등록'}
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
