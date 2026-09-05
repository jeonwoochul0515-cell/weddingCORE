// 업체 정보 — 기본 정보(가입 때 넣은 것)·통역자·현지 파트너·처분 이력·결격사유·사무소
//
// 고객이 아니라 업체 자체에 붙는 자료를 모아 둔다. 다섯 항목의 구조가 비슷해서
// 필드 정의를 데이터로 두고 한 폼이 렌더한다(추가와 고치기 모두). 항목을 늘릴 때 화면 코드를 새로 쓰지 않는다.

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Building2, Pencil, Plus, Trash2, TriangleAlert, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { josa } from '@/lib/korean';
import AgencyBasicsSection from '@/features/office/AgencyBasicsSection';
import {
  addOfficeItem,
  officeWarnings,
  PARTNER_STATUS_LABEL,
  PERSON_ROLE_LABEL,
  removeOfficeItem,
  SANCTION_KIND_LABEL,
  updateOfficeItem,
  useOfficeCollection,
  type DisqualCheck,
  type Interpreter,
  type LocalPartner,
  type Office,
  type Sanction,
} from '@/features/office/useOffice';

type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'checkbox' | 'select';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** 목록 카드에 굵게 표시할 대표 필드 */
  primary?: boolean;
};

type TabDef = {
  key: 'interpreters' | 'localPartners' | 'sanctions' | 'disqualChecks' | 'offices';
  label: string;
  hint: string;
  fields: FieldDef[];
};

const TABS: TabDef[] = [
  {
    key: 'interpreters',
    label: '통역자',
    hint: '자격 있는 통역자를 쓰고 이해관계인을 배제해야 합니다. 상대방이나 현지 업체와 친족·고용 관계면 배제 대상입니다.',
    fields: [
      { key: 'name', label: '이름', type: 'text', primary: true },
      { key: 'languages', label: '통역 언어', type: 'text', placeholder: '베트남어, 한국어' },
      { key: 'phone', label: '연락처', type: 'text' },
      { key: 'certification', label: '자격', type: 'text', placeholder: 'TOPIK 5급, 통번역 자격증 등' },
      { key: 'affiliation', label: '소속', type: 'text' },
      { key: 'conflictChecked', label: '이해관계 없음을 확인했다', type: 'checkbox' },
      { key: 'conflictNote', label: '확인 내용', type: 'text', placeholder: '무엇으로 확인했는지' },
      { key: 'active', label: '현재 활동 중', type: 'checkbox' },
    ],
  },
  {
    key: 'localPartners',
    label: '현지 파트너',
    hint: '그 나라에서 결혼중개업이 금지돼 있으면 서면계약을 맺어도 업무제휴 대상이 아니라는 해석이 있습니다(여성가족부, 2011).',
    fields: [
      { key: 'companyName', label: '업체명', type: 'text', primary: true },
      { key: 'country', label: '국가', type: 'text' },
      { key: 'contactName', label: '담당자', type: 'text' },
      { key: 'contactInfo', label: '연락처', type: 'text' },
      {
        key: 'legalStatus',
        label: '그 나라 허용 여부',
        type: 'select',
        options: Object.entries(PARTNER_STATUS_LABEL).map(([value, label]) => ({ value, label })),
      },
      { key: 'statusEvidence', label: '확인 근거', type: 'text', placeholder: '무엇으로 확인했는지' },
      { key: 'writtenContract', label: '서면계약을 체결했다', type: 'checkbox' },
      { key: 'contractedAt', label: '계약일', type: 'date' },
      { key: 'active', label: '현재 거래 중', type: 'checkbox' },
      { key: 'note', label: '메모', type: 'text' },
    ],
  },
  {
    key: 'sanctions',
    label: '처분 이력',
    hint: '위반 횟수는 등록 관청이 바뀌어도 이어집니다(재결례, 2012). 다음 처분 수위를 가늠하려면 이력을 남겨야 합니다.',
    fields: [
      {
        key: 'kind',
        label: '처분 종류',
        type: 'select',
        options: Object.entries(SANCTION_KIND_LABEL).map(([value, label]) => ({ value, label })),
        primary: true,
      },
      { key: 'authority', label: '처분 관청', type: 'text' },
      { key: 'reason', label: '사유', type: 'text' },
      { key: 'article', label: '근거 조문', type: 'text', placeholder: '결혼중개업법 제10조의2' },
      { key: 'disposedOn', label: '처분일', type: 'date' },
      { key: 'suspensionDays', label: '영업정지 일수', type: 'number' },
      { key: 'appealed', label: '다퉜다', type: 'checkbox' },
      { key: 'appealResult', label: '다툰 결과', type: 'text', placeholder: '인용·기각·각하' },
      { key: 'note', label: '메모', type: 'text' },
    ],
  },
  {
    key: 'disqualChecks',
    label: '결격사유 점검',
    hint: '벌금형 확정이 등록취소로 이어진 사건이 있습니다. 대표뿐 아니라 업무에 종사하는 사람도 대상입니다.',
    fields: [
      { key: 'name', label: '이름', type: 'text', primary: true },
      {
        key: 'role',
        label: '구분',
        type: 'select',
        options: Object.entries(PERSON_ROLE_LABEL).map(([value, label]) => ({ value, label })),
      },
      { key: 'disqualified', label: '결격사유에 해당한다', type: 'checkbox' },
      { key: 'basis', label: '확인 내용', type: 'text', placeholder: '범죄경력 조회 결과 등' },
      { key: 'checkedOn', label: '확인일', type: 'date' },
      { key: 'nextCheckOn', label: '다음 확인 예정일', type: 'date' },
      { key: 'note', label: '메모', type: 'text' },
    ],
  },
  {
    key: 'offices',
    label: '사무소',
    hint: '국제결혼중개업 자본금 1억원은 법인 전체가 아니라 사무소마다 갖춰야 한다는 해석이 있습니다(2012).',
    fields: [
      { key: 'name', label: '사무소명', type: 'text', primary: true },
      { key: 'registrationNo', label: '등록번호', type: 'text' },
      { key: 'authority', label: '등록 관청', type: 'text', placeholder: '○○시 ○○구청' },
      { key: 'address', label: '주소', type: 'text' },
      { key: 'registeredOn', label: '등록일', type: 'date' },
      { key: 'isInternational', label: '국제결혼중개업이다', type: 'checkbox' },
      { key: 'capital', label: '자본금(원)', type: 'number' },
      { key: 'active', label: '운영 중', type: 'checkbox' },
      { key: 'note', label: '메모', type: 'text' },
    ],
  },
];

const fmtDate = (v: unknown) => {
  const t = v as { toDate?: () => Date } | null;
  if (!t?.toDate) return '';
  try {
    return t.toDate().toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
};

const fmtValue = (f: FieldDef, v: unknown) => {
  if (f.type === 'checkbox') return v ? '예' : '아니오';
  if (f.type === 'date') return fmtDate(v);
  if (f.type === 'number') return typeof v === 'number' ? v.toLocaleString() : '';
  if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? String(v ?? '');
  return String(v ?? '');
};

/** 저장된 값을 폼 칸에 되돌려 넣는다. 날짜는 <input type="date">가 읽는 yyyy-MM-dd로 */
const toFormValue = (f: FieldDef, v: unknown): unknown => {
  if (f.type === 'checkbox') return Boolean(v);
  if (f.type === 'date') {
    const t = v as { toDate?: () => Date } | null;
    if (!t?.toDate) return '';
    const d = t.toDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (f.type === 'number') return typeof v === 'number' ? String(v) : '';
  return String(v ?? '');
};

type TabKey = 'basic' | TabDef['key'];

export default function OfficePage() {
  const user = useAuthStore((s) => s.user);
  const [tabKey, setTabKey] = useState<TabKey>('basic');
  const [open, setOpen] = useState(false);
  /** 고치는 중인 기록의 id. 비어 있으면 새로 추가하는 중 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 삭제는 확인을 한 번 거친다. 휴지통을 잘못 눌러 기록이 사라지면 되돌릴 길이 없다.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // 「기본 정보」는 컬렉션이 아니라 업체 문서 자체다. 훅은 조건부로 못 부르니 자리만 채운다.
  const collectionKey: TabDef['key'] = tabKey === 'basic' ? 'interpreters' : tabKey;
  const tab = TABS.find((t) => t.key === collectionKey)!;

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setForm({});
    setSaveError(null);
  }

  function openEdit(row: Record<string, unknown> & { id: string }) {
    const next: Record<string, unknown> = {};
    for (const f of tab.fields) next[f.key] = toFormValue(f, row[f.key]);
    setForm(next);
    setEditingId(row.id);
    setSaveError(null);
    setOpen(true);
    setConfirmId(null);
  }

  async function handleRemove(id: string) {
    if (!user?.agencyId) return;
    setRemoveError(null);
    try {
      await removeOfficeItem(user.agencyId, collectionKey, id);
      setConfirmId(null);
      if (editingId === id) closeForm();
    } catch (error) {
      setRemoveError(`지우지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(error as Error).message})`);
    }
  }
  const { items, loading } = useOfficeCollection(collectionKey);

  // 경고는 탭과 무관하게 항상 계산한다. 다른 탭의 문제도 한눈에 보여야 한다.
  const interpreters = useOfficeCollection('interpreters').items as Interpreter[];
  const partners = useOfficeCollection('localPartners').items as LocalPartner[];
  const offices = useOfficeCollection('offices').items as Office[];
  const warnings = officeWarnings({ interpreters, partners, offices });

  async function handleSave() {
    if (!user?.agencyId) return;
    setSaveError(null);
    const data: Record<string, unknown> = {};
    for (const f of tab.fields) {
      const v = form[f.key];
      if (f.type === 'checkbox') data[f.key] = Boolean(v);
      else if (f.type === 'date') data[f.key] = v ? Timestamp.fromDate(new Date(String(v))) : null;
      else if (f.type === 'number') data[f.key] = v === '' || v == null ? null : Number(v);
      else if (f.type === 'select') {
        // 첫 값으로 몰래 채우지 않는다. "확인 안 했는데 확인한 것"으로 저장되는 함정을 막는다.
        if (!v) { setSaveError(`「${f.label}」${josa(f.label, '을/를')} 골라 주세요.`); return; }
        data[f.key] = v;
      }
      else data[f.key] = String(v ?? '').trim();
      if (f.primary && f.type === 'text' && !data[f.key]) { setSaveError(`「${f.label}」${josa(f.label, '을/를')} 적어 주세요.`); return; }
    }
    setSaving(true);
    try {
      if (editingId) await updateOfficeItem(user.agencyId, collectionKey, editingId, data);
      else await addOfficeItem(user.agencyId, collectionKey, data);
      closeForm();
    } catch (error) {
      setSaveError(`저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(error as Error).message})`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.03em] text-[#102621]">
          <Building2 size={22} className="text-slate-400" />업체 정보
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          고객이 아니라 업체 자체에 붙는 자료입니다. 처분과 등록에 직접 영향을 주는 것들이라
          한곳에 모아 두고 점검합니다.
        </p>
      </header>

      {warnings.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-900">
            <TriangleAlert size={15} />먼저 확인할 것 {warnings.length}건
          </p>
          <ul className="space-y-1.5">
            {warnings.map((w) => (
              <li key={w} className="text-[13px] leading-relaxed text-amber-900">
                · {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[{ key: 'basic' as const, label: '기본 정보' }, ...TABS].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTabKey(t.key);
              closeForm();
              setConfirmId(null);
              setRemoveError(null);
            }}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tabKey === t.key
                ? 'bg-[#102621] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabKey === 'basic' && <AgencyBasicsSection />}

      {tabKey !== 'basic' && (<>
      <p className="mb-4 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
        {tab.hint}
      </p>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700">
          {tab.label} {items.length > 0 && `(${items.length})`}
        </h2>
        <button
          type="button"
          onClick={() => { if (open && !editingId) closeForm(); else { closeForm(); setOpen(true); } }}
          className="inline-flex items-center gap-1 rounded-lg bg-[#102621] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus size={13} />추가
        </button>
      </div>

      {open && (
        <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-700">{editingId ? `${tab.label} 고치기` : `${tab.label} 추가`}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {tab.fields.map((f) => (
              <label key={f.key} className="text-xs font-semibold text-slate-600">
                {f.type === 'checkbox' ? (
                  <span className="mt-5 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.key])}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    {f.label}
                  </span>
                ) : (
                  <>
                    {f.label}
                    {f.type === 'select' ? (
                      <select
                        value={String(form[f.key] ?? '')}
                        onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                      >
                        <option value="">선택</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        value={String(form[f.key] ?? '')}
                        placeholder={f.placeholder}
                        onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                      />
                    )}
                  </>
                )}
              </label>
            ))}
          </div>
          {saveError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}

      {!loading && items.length === 0 && !open && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          아직 등록된 {tab.label}{josa(tab.label, '이/가')} 없습니다.
        </p>
      )}

      {removeError && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{removeError}</p>}

      <ul className="space-y-2">
        {(items as Array<Record<string, unknown> & { id: string }>).map((row) => {
          const primary = tab.fields.find((f) => f.primary);
          const title = primary ? fmtValue(primary, row[primary.key]) : '';
          return (
            <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[#102621]">{title}</p>
                {confirmId === row.id ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600">이 기록을 지울까요?</span>
                    <button type="button" onClick={() => void handleRemove(row.id)} className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white">지우기</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-500 ring-1 ring-slate-200">취소</button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className={`inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ${editingId === row.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                      aria-label={`${title || tab.label} 고치기`}
                    >
                      <Pencil size={14} />고치기
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmId(row.id); setRemoveError(null); }}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`${title || tab.label} 지우기`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {tab.fields
                  .filter((f) => !f.primary)
                  .map((f) => {
                    const v = fmtValue(f, row[f.key]);
                    if (!v || v === '아니오') return null;
                    return (
                      <span key={f.key}>
                        <span className="text-slate-400">{f.label} </span>
                        {v}
                      </span>
                    );
                  })}
              </div>
            </li>
          );
        })}
      </ul>
      </>)}

      <p className="mt-6 flex items-start gap-1.5 rounded-xl bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500">
        <Users size={12} className="mt-0.5 shrink-0" />
        여기 적은 내용은 업체가 스스로 관리하는 기록입니다. 처분이나 등록 요건의 최종 판단은
        관할 관청과 변호사 검토를 거쳐야 합니다.
      </p>
    </div>
  );
}
