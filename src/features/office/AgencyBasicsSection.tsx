// 업체 정보의 「기본 정보」 탭 — 가입 때 넣은 상호·대표자·전화·주소를 보고, 대표 계정이 고친다
import { useEffect, useState } from 'react';
import { Pencil, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { isMobilePhone, updateAgencyBasics, useAgency } from '@/features/agency/useAgency';

const VERIFICATION_LABEL: Record<string, string> = {
  pending: '승인 대기 중',
  verified: '승인됨',
  rejected: '반려됨',
};

/** 화면의 역할 값과 규칙의 역할 값이 다른 이름을 쓴다. 둘 다 대표로 본다 */
function isOwnerRole(role: string | null | undefined) {
  return role === 'agency_owner' || role === 'owner';
}

export default function AgencyBasicsSection() {
  const user = useAuthStore((s) => s.user);
  const { agency, loading, error } = useAgency();
  const owner = isOwnerRole(user?.role);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', ownerName: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // 문서가 바뀌면(다른 기기에서 고쳤을 때) 편집 중이 아닐 때만 칸을 새 값으로 맞춘다
  useEffect(() => {
    if (!agency || editing) return;
    setForm({
      name: agency.name ?? '',
      ownerName: agency.ownerName ?? '',
      phone: agency.phone ?? '',
      address: agency.address ?? '',
    });
  }, [agency, editing]);

  async function save() {
    if (!agency) return;
    setNotice(null);
    if (!form.name.trim()) { setNotice({ ok: false, text: '상호를 적어 주세요.' }); return; }
    if (!isMobilePhone(form.phone)) {
      setNotice({ ok: false, text: '접수 문자를 받는 번호라 휴대폰 번호여야 합니다. 사무실 유선번호는 문자를 받지 못합니다.' });
      return;
    }
    setSaving(true);
    try {
      await updateAgencyBasics(agency.id, form);
      setEditing(false);
      setNotice({ ok: true, text: '저장했습니다. 홈페이지 접수 문자는 이제 이 번호로 갑니다.' });
    } catch (err) {
      setNotice({ ok: false, text: `저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(err as Error).message})` });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (error || !agency) {
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">업체 정보를 불러오지 못했습니다. 화면을 새로고침해 보세요.{error ? ` (${error})` : ''}</p>;
  }

  const rows: Array<[string, string]> = [
    ['상호', agency.name],
    ['대표자', agency.ownerName || '—'],
    ['연락처 · 접수 문자 받는 번호', agency.phone],
    ['주소', agency.address || '—'],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#102621]">가입 때 넣은 정보</h3>
          {owner && !editing && (
            <button type="button" onClick={() => { setEditing(true); setNotice(null); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300">
              <Pencil size={13} />고치기
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">상호
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600">대표자
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" value={form.ownerName} onChange={(e) => setForm((s) => ({ ...s, ownerName: e.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600">연락처 · 접수 문자 받는 번호
              <input type="tel" inputMode="tel" placeholder="010-0000-0000" className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
              <span className="mt-1 block text-[11px] font-normal text-slate-400">홈페이지 점검 위젯으로 손님이 접수하면 이 번호로 문자가 옵니다. 휴대폰 번호만 됩니다.</span>
            </label>
            <label className="text-xs font-semibold text-slate-600">주소
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => { setEditing(false); setNotice(null); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500">취소</button>
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        )}

        {notice && <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</p>}
        {!owner && <p className="mt-3 text-[11px] text-slate-400">기본 정보는 대표 계정만 고칠 수 있습니다.</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-[#102621]">등록 번호와 승인 상태</h3>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-400">사업자등록번호</dt><dd className="text-slate-800">{agency.businessNumber || '—'}</dd></div>
          <div><dt className="text-xs text-slate-400">결혼중개업 등록번호</dt><dd className="text-slate-800">{agency.registrationNumber || '—'}</dd></div>
          <div><dt className="text-xs text-slate-400">가입 승인</dt><dd className="text-slate-800">{VERIFICATION_LABEL[agency.verificationStatus] ?? agency.verificationStatus}</dd></div>
        </dl>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-slate-500">
          <Phone size={12} className="mt-1 shrink-0" />
          <span>등록 번호는 가입 승인의 근거라 화면에서 바꾸지 않습니다. 번호가 바뀌었으면 새 등록증 사진을 준비해 <a href="tel:1660-4452" className="font-semibold text-emerald-700 underline">1660-4452</a>로 알려 주세요. 확인 뒤 바꿔 드립니다.</span>
        </p>
      </div>
    </div>
  );
}
