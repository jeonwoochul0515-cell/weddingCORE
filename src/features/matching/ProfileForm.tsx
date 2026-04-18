import { useForm } from 'react-hook-form';
import { MBTI_TYPES } from './mbtiCompat';
import type { ClientProfile, BirthInfo } from '@/types/schema';

type FormValues = {
  mbti: string;
  height: string;
  weight: string;
  education: string;
  religion: string;
  region: string;
  smoking: string;
  drinking: string;
  hobbies: string;
  solarDate: string;
  birthTime: string;
};

type Props = {
  initial?: { profile: ClientProfile | null; birthInfo: BirthInfo | null };
  onSave: (profile: ClientProfile, birthInfo: BirthInfo) => Promise<void>;
  label: string;
};

export default function ProfileForm({ initial, onSave, label }: Props) {
  const p = initial?.profile;
  const b = initial?.birthInfo;

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      mbti: p?.mbti ?? '',
      height: p?.height?.toString() ?? '',
      weight: p?.weight?.toString() ?? '',
      education: p?.education ?? '',
      religion: p?.religion ?? '',
      region: p?.region ?? '',
      smoking: p?.smoking === null ? '' : p?.smoking ? 'true' : 'false',
      drinking: p?.drinking ?? '',
      hobbies: p?.hobbies?.join(', ') ?? '',
      solarDate: b?.solarDate ?? '',
      birthTime: b?.birthTime ?? '',
    },
  });

  async function onSubmit(v: FormValues) {
    const profile: ClientProfile = {
      mbti: (v.mbti || null) as ClientProfile['mbti'],
      height: v.height ? Number(v.height) : null,
      weight: v.weight ? Number(v.weight) : null,
      education: (v.education || null) as ClientProfile['education'],
      religion: (v.religion || null) as ClientProfile['religion'],
      region: v.region || null,
      smoking: v.smoking === '' ? null : v.smoking === 'true',
      drinking: (v.drinking || null) as ClientProfile['drinking'],
      hobbies: v.hobbies ? v.hobbies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      idealType: null,
    };
    const birthInfo: BirthInfo = {
      solarDate: v.solarDate,
      lunarDate: null,
      birthTime: (v.birthTime || null) as BirthInfo['birthTime'],
    };
    await onSave(profile, birthInfo);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800">{label} 프로필</h3>

      <div className="grid grid-cols-2 gap-3">
        <Field label="MBTI">
          <select className="input" {...register('mbti')}>
            <option value="">선택 안함</option>
            {MBTI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="생년월일 (양력)">
          <input type="date" className="input" {...register('solarDate')} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="키 (cm)">
          <input type="number" className="input" {...register('height')} />
        </Field>
        <Field label="체중 (kg)">
          <input type="number" className="input" {...register('weight')} />
        </Field>
        <Field label="태어난 시">
          <select className="input" {...register('birthTime')}>
            <option value="">모름</option>
            {['자시','축시','인시','묘시','진시','사시','오시','미시','신시','유시','술시','해시'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="학력">
          <select className="input" {...register('education')}>
            <option value="">선택 안함</option>
            {['중졸','고졸','전문대졸','대졸','석사','박사'].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </Field>
        <Field label="종교">
          <select className="input" {...register('religion')}>
            <option value="">선택 안함</option>
            {['무교','기독교','천주교','불교','기타'].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="지역">
          <input className="input" placeholder="예: 부산" {...register('region')} />
        </Field>
        <Field label="흡연">
          <select className="input" {...register('smoking')}>
            <option value="">선택 안함</option>
            <option value="false">비흡연</option>
            <option value="true">흡연</option>
          </select>
        </Field>
        <Field label="음주">
          <select className="input" {...register('drinking')}>
            <option value="">선택 안함</option>
            {['안함','가끔','자주'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="취미 (쉼표로 구분)">
        <input className="input" placeholder="예: 요리, 여행, 영화" {...register('hobbies')} />
      </Field>

      <div className="flex justify-end pt-1">
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
          {isSubmitting ? '저장 중…' : '프로필 저장'}
        </button>
      </div>

      <style>{`
        .input { width:100%; border:1px solid rgb(203 213 225); border-radius:0.375rem; padding:0.375rem 0.625rem; font-size:0.8125rem; }
        .input:focus { outline:none; border-color:rgb(15 23 42); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
