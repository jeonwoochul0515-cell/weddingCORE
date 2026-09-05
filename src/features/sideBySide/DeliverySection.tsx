// 신상정보 제공 기록 화면 — 언제 누구에게 어떻게 건넸는지 남긴다
//
// 서류를 만든 것과 건넨 것은 다르다. 처분을 다툰 사건들에서 갈린 지점이 여기다.
// 맞선일과 대조해 지금 상태가 위험한지 맨 위에 먼저 보여준다.

import { useState } from 'react';
import { CheckCircle2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { LANG_LABEL, type SupportedLang } from './fields';
import type { BackgroundSubject } from './useBackgroundInfo';
import {
  addDelivery,
  checkDelivery,
  DELIVERY_METHOD_LABEL,
  removeDelivery,
  useDeliveries,
  type DeliveryMethod,
} from './useDelivery';

const SUBJECT_LABEL: Record<BackgroundSubject, string> = {
  korean: '한국인 이용자',
  partner: '외국인 상대방',
};

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function DeliverySection({
  clientId,
  infoId,
  infoSubject,
  meetingAt,
}: {
  clientId: string;
  infoId: string;
  infoSubject: BackgroundSubject;
  meetingAt: Date | null;
}) {
  const user = useAuthStore((s) => s.user);
  const { items, loading } = useDeliveries(clientId, infoId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // 제공 기록은 법정 증빙이다. 휴지통을 잘못 눌러도 바로 사라지지 않게 한 번 묻는다.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove(deliveryId: string) {
    if (!user?.agencyId) return;
    setRemoveError(null);
    try {
      await removeDelivery({ agencyId: user.agencyId, clientId, infoId, deliveryId });
      setConfirmId(null);
    } catch (error) {
      setRemoveError(`지우지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(error as Error).message})`);
    }
  }

  // 이 신상정보는 반대편에게 주는 것이 원칙이다
  const [to, setTo] = useState<BackgroundSubject>(
    infoSubject === 'korean' ? 'partner' : 'korean',
  );
  const [lang, setLang] = useState<SupportedLang>('ko');
  const [method, setMethod] = useState<DeliveryMethod>('in_person');
  const [deliveredAt, setDeliveredAt] = useState(todayInput());
  const [receiptConfirmed, setReceiptConfirmed] = useState(true);
  const [receiptSignerName, setReceiptSignerName] = useState('');
  const [explained, setExplained] = useState(true);
  const [explainedBy, setExplainedBy] = useState('');
  const [note, setNote] = useState('');

  const check = checkDelivery({ records: items, meetingAt });

  async function handleAdd() {
    if (!user?.agencyId) return;
    setSaving(true);
    try {
      await addDelivery({
        agencyId: user.agencyId,
        clientId,
        infoId,
        to,
        lang,
        method,
        deliveredAt: new Date(deliveredAt),
        receiptConfirmed,
        receiptSignerName: receiptSignerName.trim() || null,
        explained,
        explainedBy: explainedBy.trim() || null,
        note: note.trim(),
        recordedBy: user.uid,
      });
      setOpen(false);
      setReceiptSignerName('');
      setExplainedBy('');
      setNote('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 지금 상태가 위험한지 먼저 */}
      <div
        className={`flex items-start gap-2.5 rounded-xl border p-4 ${
          check.level === 'ok'
            ? 'border-emerald-200 bg-emerald-50/60'
            : check.level === 'critical'
              ? 'border-red-200 bg-red-50/60'
              : 'border-amber-200 bg-amber-50/50'
        }`}
      >
        {check.level === 'ok' ? (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <TriangleAlert
            size={18}
            className={`mt-0.5 shrink-0 ${check.level === 'critical' ? 'text-red-600' : 'text-amber-600'}`}
          />
        )}
        <div>
          <p className="text-sm font-semibold text-[#102621]">{check.message}</p>
          {meetingAt && (
            <p className="mt-1 text-xs text-slate-500">
              맞선 예정일 {meetingAt.toLocaleDateString('ko-KR')} 기준
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          제공 기록 {items.length > 0 && `(${items.length}건)`}
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg bg-[#102621] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus size={13} />기록 추가
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              누구에게 줬나
              <select
                value={to}
                onChange={(e) => setTo(e.target.value as BackgroundSubject)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                <option value="korean">{SUBJECT_LABEL.korean}</option>
                <option value="partner">{SUBJECT_LABEL.partner}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              어떤 언어본
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as SupportedLang)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                {Object.entries(LANG_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              제공 방법
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as DeliveryMethod)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                {Object.entries(DELIVERY_METHOD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              건넨 날짜
              <input
                type="date"
                value={deliveredAt}
                onChange={(e) => setDeliveredAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={receiptConfirmed}
                  onChange={(e) => setReceiptConfirmed(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-600"
                />
                수령 확인을 받았다
              </label>
              <input
                value={receiptSignerName}
                onChange={(e) => setReceiptSignerName(e.target.value)}
                placeholder="확인한 사람 이름"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={explained}
                  onChange={(e) => setExplained(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-600"
                />
                내용을 설명했다
              </label>
              <input
                value={explainedBy}
                onChange={(e) => setExplainedBy(e.target.value)}
                placeholder="설명한 사람 (통역자 포함)"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </div>
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (장소, 동석자 등)"
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAdd}
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
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          아직 제공 기록이 없습니다.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((r) => {
          const late = meetingAt && r.deliveredAt.toDate().getTime() > meetingAt.getTime();
          return (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#102621]">
                  {r.deliveredAt.toDate().toLocaleDateString('ko-KR')}
                </span>
                {late && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">
                    맞선일 이후
                  </span>
                )}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                  {SUBJECT_LABEL[r.to]}에게
                </span>
                <span className="text-slate-500">{LANG_LABEL[r.lang]}</span>
                <span className="text-slate-500">{DELIVERY_METHOD_LABEL[r.method]}</span>
                {confirmId === r.id ? (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="text-slate-600">이 기록을 지울까요?</span>
                    <button type="button" onClick={() => void handleRemove(r.id)} className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white">지우기</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-500 ring-1 ring-slate-200">취소</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setConfirmId(r.id); setRemoveError(null); }}
                    className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="이 제공 기록 지우기"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {removeError && confirmId === r.id && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{removeError}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span>
                  수령확인{' '}
                  {r.receiptConfirmed ? (
                    <b className="text-emerald-700">{r.receiptSignerName || '있음'}</b>
                  ) : (
                    <b className="text-red-600">없음</b>
                  )}
                </span>
                <span>
                  설명{' '}
                  {r.explained ? (
                    <b className="text-emerald-700">{r.explainedBy || '함'}</b>
                  ) : (
                    <b className="text-red-600">없음</b>
                  )}
                </span>
              </div>
              {r.note && <p className="mt-1.5 text-xs text-slate-500">{r.note}</p>}
            </li>
          );
        })}
      </ul>

      <p className="rounded-xl bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500">
        결혼중개업법은 맞선 전에 서면으로 제공하고 설명할 것을 요구합니다. 대법원은 이 의무를
        만남 이전에 이행해야 하는 것으로 보았습니다(2018도7989). 수령확인서 원본은 3년간
        보관해 주세요.
      </p>
    </div>
  );
}
