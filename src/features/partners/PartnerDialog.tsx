// 후보 등록·수정 창 — 사진을 먼저 올리고 나머지를 채운다
import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import PhotoField from '@/features/photos/PhotoField';
import PartnerIntakeBox, { type ProfileWarning } from './PartnerIntakeBox';
import {
  EMPTY_PARTNER,
  newPartnerId,
  PARTNER_STATUS_LABEL,
  savePartner,
  type PartnerForm,
  type PartnerItem,
  type PartnerStatus,
} from './usePartners';

type Props = {
  editing?: PartnerItem | null;
  onClose: () => void;
  onSaved: (id: string) => void;
};

const toForm = (p: PartnerItem): PartnerForm => ({
  name: p.name ?? '',
  nationality: p.nationality ?? '',
  birthDate: p.birthDate?.toDate?.().toISOString().slice(0, 10) ?? '',
  gender: p.gender ?? '',
  region: p.region ?? '',
  occupation: p.occupation ?? '',
  education: p.education ?? '',
  religion: p.religion ?? '',
  maritalHistory: p.maritalHistory ?? '',
  languages: p.languages ?? '',
  height: p.height != null ? String(p.height) : '',
  weight: p.weight != null ? String(p.weight) : '',
  localPartner: p.localPartner ?? '',
  memo: p.memo ?? '',
  status: p.status ?? 'available',
});

/**
 * ⚠ 이 부품을 PartnerDialog 안에 두면 안 된다. 렌더마다 새 컴포넌트 타입이 되어
 * React가 입력칸을 지웠다 새로 만든다. 그러면 한 글자 칠 때마다 포커스가 날아가
 * 이름에 첫 글자만 남는다(2026-09-06에 실제로 그렇게 저장됐다).
 */
function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">{label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
      />
    </label>
  );
}

export default function PartnerDialog({ editing, onClose, onSaved }: Props) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  // 사진을 저장 전에 올려야 하므로 새 후보도 id를 먼저 만든다
  const [id] = useState(() => editing?.id ?? (agencyId ? newPartnerId(agencyId) : ''));
  const [form, setForm] = useState<PartnerForm>(editing ? toForm(editing) : EMPTY_PARTNER);
  const [photoUrl, setPhotoUrl] = useState<string | null>(editing?.photoUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ProfileWarning[]>([]);

  const set = (k: keyof PartnerForm) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  /**
   * 자동으로 채운 값은 **비어 있는 칸에만** 넣는다.
   * 사람이 이미 고쳐 놓은 것을 기계가 덮어쓰면, 고친 것을 다시 고쳐야 한다.
   */
  function fill(values: Partial<PartnerForm>, found: ProfileWarning[]) {
    setForm((s) => {
      const next = { ...s };
      for (const [k, v] of Object.entries(values) as Array<[keyof PartnerForm, string]>) {
        if (!v) continue;
        if (String(next[k] ?? '').trim()) continue;
        // @ts-expect-error 같은 키의 문자열끼리 넣는다
        next[k] = v;
      }
      return next;
    });
    setWarnings(found);
  }

  async function save() {
    if (!agencyId) return;
    setError(null);
    if (!form.name.trim()) { setError('이름을 적어 주세요.'); return; }
    if (!form.nationality.trim()) { setError('국적을 적어 주세요.'); return; }
    setSaving(true);
    try {
      await savePartner(agencyId, id, form, photoUrl, !editing);
      onSaved(id);
    } catch (e) {
      setError(`저장하지 못했습니다. 잠시 뒤 다시 해 보세요. (${(e as Error).message})`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#102621]">{editing ? '후보 고치기' : '후보 등록'}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* 새 후보를 넣을 때만 보인다. 고치는 중에 자동으로 칸을 덮을 이유가 없다 */}
        {!editing && (
          <div className="mb-5">
            <PartnerIntakeBox onFilled={fill} />
          </div>
        )}

        <PhotoField
          agencyId={agencyId}
          kind="partners"
          targetId={id}
          url={photoUrl}
          onChange={setPhotoUrl}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="이름" value={String(form.name)} onChange={set('name')} placeholder="여권에 적힌 이름" />
          <Field label="국적" value={String(form.nationality)} onChange={set('nationality')} placeholder="베트남" />
          <Field label="생년월일" value={String(form.birthDate)} onChange={set('birthDate')} type="date" />
          <label className="text-xs font-semibold text-slate-600">성별
            <select value={form.gender} onChange={(e) => set('gender')(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm">
              <option value="">선택</option>
              <option value="F">여</option>
              <option value="M">남</option>
            </select>
          </label>
          <Field label="현지 거주지" value={String(form.region)} onChange={set('region')} placeholder="하노이" />
          <Field label="직업" value={String(form.occupation)} onChange={set('occupation')} />
          <Field label="학력" value={String(form.education)} onChange={set('education')} placeholder="고졸" />
          <Field label="종교" value={String(form.religion)} onChange={set('religion')} />
          <Field label="혼인 이력" value={String(form.maritalHistory)} onChange={set('maritalHistory')} placeholder="미혼 / 이혼 / 사별" />
          <Field label="가능한 언어" value={String(form.languages)} onChange={set('languages')} placeholder="베트남어, 한국어 초급" />
          <Field label="키(cm)" value={String(form.height)} onChange={set('height')} type="number" />
          <Field label="몸무게(kg)" value={String(form.weight)} onChange={set('weight')} type="number" />
          <Field label="소개해 준 현지 업체" value={String(form.localPartner)} onChange={set('localPartner')} />
          <label className="text-xs font-semibold text-slate-600">상태
            <select value={form.status} onChange={(e) => set('status')(e.target.value as PartnerStatus)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm">
              {(Object.keys(PARTNER_STATUS_LABEL) as PartnerStatus[]).map((s) => (
                <option key={s} value={s}>{PARTNER_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">메모
            <textarea
              value={form.memo}
              onChange={(e) => set('memo')(e.target.value)}
              className="mt-1 min-h-20 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              placeholder="성격, 원하는 조건, 주의할 점"
            />
          </label>
        </div>

        {/* 자료에서 본 것을 저장 버튼 바로 위에 다시 둔다. 위쪽 상자만 있으면
            칸을 채우는 동안 스크롤에 밀려 안 보인 채로 저장된다 */}
        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-bold text-amber-900">
              저장 전에 확인할 것 {warnings.length}건
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-4 text-amber-900/90">
              {warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-500">취소</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
