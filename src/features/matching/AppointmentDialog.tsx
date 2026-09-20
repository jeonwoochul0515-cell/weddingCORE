// 약속 잡는 창 — 화상이든 직접 만남이든 여기서 잡는다
import { useMemo, useState } from 'react';
import { Clock, Globe, MapPin, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePartners } from '@/features/partners/usePartners';
import type { Appointment } from '@/types/schema';
import type { MatchListItem } from './useMatches';
import {
  createAppointment,
  KIND_LABEL,
  localTimeOf,
  MODE_LABEL,
  STATUS_LABEL,
  updateAppointment,
  type AppointmentItem,
} from './useAppointments';

type Props = {
  /** 어느 맞선에 붙이나. 목록에서 고르게 한다 */
  matches: MatchListItem[];
  editing?: AppointmentItem | null;
  /** 창을 열 때 미리 골라 둘 맞선 */
  presetMatchId?: string;
  onClose: () => void;
  onSaved: () => void;
};

/** Date → datetime-local 입력값. 로컬 시각 기준이라 toISOString을 쓰면 안 된다 */
function toInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 0, 0, 0); // 현지와 겹치는 시간대. 한국 저녁이 동남아 저녁이다.
  return d;
}

const KINDS = Object.keys(KIND_LABEL) as Appointment['kind'][];
const STATUSES = Object.keys(STATUS_LABEL) as Appointment['status'][];

export default function AppointmentDialog({
  matches,
  editing,
  presetMatchId,
  onClose,
  onSaved,
}: Props) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const uid = useAuthStore((s) => s.user?.uid);
  const { items: partners } = usePartners();

  const [matchId, setMatchId] = useState(editing?.matchId ?? presetMatchId ?? matches[0]?.id ?? '');
  const [mode, setMode] = useState<Appointment['mode']>(editing?.mode ?? 'online');
  const [kind, setKind] = useState<Appointment['kind']>(editing?.kind ?? '화상맞선');
  const [startAt, setStartAt] = useState(
    toInputValue(editing?.startAt?.toDate?.() ?? defaultStart()),
  );
  const [duration, setDuration] = useState(String(editing?.durationMinutes ?? 60));
  const [placeName, setPlaceName] = useState(editing?.place?.name ?? '');
  const [placeAddress, setPlaceAddress] = useState(editing?.place?.address ?? '');
  const [placeNote, setPlaceNote] = useState(editing?.place?.note ?? '');
  const [status, setStatus] = useState<Appointment['status']>(editing?.status ?? 'planned');
  const [interpreterName, setInterpreterName] = useState(editing?.interpreterName ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = matches.find((m) => m.id === matchId);
  const partner = partners.find((p) => p.id === match?.partnerId);

  /** 한국 시각이 상대 나라에서는 몇 시인가 */
  const localTime = useMemo(() => {
    if (!startAt) return null;
    const korean = new Date(startAt);
    if (Number.isNaN(korean.getTime())) return null;
    return localTimeOf(partner?.nationality, korean);
  }, [startAt, partner?.nationality]);

  /**
   * 만남 서면 동의가 있는가.
   *
   * 시행령 제3조의2는 양쪽이 모두 만남에 서면 동의한 경우에만 주선하게 한다.
   * 화상이든 직접 만남이든 「만남을 주선하는 것」은 같다. 여기서 막지는 않는다 —
   * 약속을 먼저 잡고 동의서를 받아 오는 순서가 현장에서는 흔하기 때문이다.
   * 다만 잡을 때 눈에 보이게 해서 잊고 넘어가지 않게 한다.
   */
  const consent = match?.callConsents?.meeting;
  const consentMissing = !consent?.client || !consent?.partner;

  async function save() {
    if (!agencyId || !uid) return;
    setError(null);
    if (!matchId || !match) {
      setError('어느 맞선의 약속인지 골라 주세요.');
      return;
    }
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
      setError('날짜와 시각을 확인해 주세요.');
      return;
    }
    if (mode === 'offline' && !placeName.trim()) {
      setError('직접 만나는 약속은 장소를 적어 주세요.');
      return;
    }
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError('걸리는 시간을 분 단위로 적어 주세요.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        matchId,
        clientId: match.clientId,
        partnerId: match.partnerId,
        clientName: match.clientName,
        partnerName: match.partnerName,
        mode,
        kind,
        startAt: start,
        durationMinutes: minutes,
        place:
          mode === 'offline'
            ? { name: placeName.trim(), address: placeAddress.trim(), note: placeNote.trim() }
            : null,
        status,
        interpreterName,
        agentUid: match.agentUid ?? null,
        memo,
      };
      if (editing) await updateAppointment(agencyId, editing.id, input);
      else await createAppointment(agencyId, uid, input);
      onSaved();
    } catch (e) {
      setError(`저장하지 못했습니다. (${(e as Error).message})`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#102621]">
            {editing ? '약속 고치기' : '약속 잡기'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            어느 맞선
            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              disabled={Boolean(editing)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-50"
            >
              {matches.length === 0 && <option value="">맞선을 먼저 만들어 주세요</option>}
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.clientName} · {m.partnerName}
                </option>
              ))}
            </select>
          </label>

          {consentMissing && match && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">
              <strong>만남 서면 동의가 아직 없습니다.</strong> 양쪽이 모두 서면으로 동의해야 만남을
              주선할 수 있습니다(시행령 제3조의2). 약속은 잡아 두되 만나기 전에 받아 주세요.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {(['online', 'offline'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  // 화상에서 직접 만남으로 바꾸면 종류도 같이 따라가는 게 자연스럽다.
                  if (m === 'offline' && kind === '화상맞선') setKind('현지만남');
                  if (m === 'online' && kind === '현지만남') setKind('화상맞선');
                }}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold ${
                  mode === m
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {MODE_LABEL[m]}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  {m === 'online' ? '사이트 안 통화방' : '현지·국내에서 직접'}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              종류
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as Appointment['kind'])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              상태
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Appointment['status'])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              언제 (한국 시각)
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              걸리는 시간(분)
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </label>
          </div>

          {/* 현지 시각. 이게 없으면 상대가 자고 있는 시각에 약속을 잡는다 */}
          {localTime && (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-900">
              <Globe size={13} />
              {partner?.nationality} 현지 시각{' '}
              {localTime.toLocaleString('ko-KR', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {!localTime && partner?.nationality && mode === 'online' && (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
              <Clock size={13} />
              {partner.nationality}의 시차를 몰라 현지 시각을 보여 주지 못합니다. 직접 확인해 주세요.
            </p>
          )}

          {mode === 'offline' && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <MapPin size={13} /> 어디서 만나나
              </p>
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="장소 이름 (예: 하노이 ○○호텔 로비)"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
              <input
                value={placeAddress}
                onChange={(e) => setPlaceAddress(e.target.value)}
                placeholder="주소"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
              <input
                value={placeNote}
                onChange={(e) => setPlaceNote(e.target.value)}
                placeholder="찾아가는 길, 주차, 연락처 등"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-600">
            통역 (나오는 사람)
            <input
              value={interpreterName}
              onChange={(e) => setInterpreterName(e.target.value)}
              placeholder="이름 또는 소속"
              className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            메모
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-1 min-h-16 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              placeholder="준비할 것, 주의할 점"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || matches.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
