// 화상맞선 준비 — 누가 들어올지 정하고, 받아야 할 동의를 표시한다
//
// 왜 이 화면이 필요한가. 서버는 통역자·담당자 배정과 동의를 읽어서 통화를 열지 말지
// 판정하는데, 정작 그것을 넣을 자리가 어디에도 없었다. 그래서 통화가 영영 안 열렸다.
//
// 동의 체크는 「받았다」는 표시일 뿐 동의서 자체가 아니다. 서면은 따로 보관해야 한다 —
// 재결례에서 「통역이 설명했다」는 항변이 기각된 것과 같은 자리다.

import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, Loader2, UserRound, Languages } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import {
  useOfficeCollection,
  type Interpreter,
  type LocalPartner,
} from '@/features/office/useOffice';
import { useStaff } from '@/features/office/useStaff';
import type { MatchListItem } from '@/features/matching/useMatches';

type Props = { match: MatchListItem; onSaved: () => void };

/** 동의 한 줄. 무엇에 대한 동의인지 풀어서 적는다 */
type ConsentRow = {
  key: 'meetingClient' | 'meetingPartner' | 'recordingClient' | 'recordingPartner' | 'crossBorder';
  label: string;
  hint: string;
};

const CONSENT_ROWS: ConsentRow[] = [
  {
    key: 'meetingClient',
    label: '한국인 고객의 만남 동의서를 받았습니다',
    hint: '서면으로 받아 보관해야 합니다. 이 체크는 받았다는 표시일 뿐입니다.',
  },
  {
    key: 'meetingPartner',
    label: '신부 후보의 만남 동의서를 받았습니다',
    hint: '현지 파트너를 통해 받습니다.',
  },
  {
    key: 'recordingClient',
    label: '한국인 고객이 녹화에 동의했습니다',
    hint: '녹화 목적과 보관기간(5년)을 설명한 뒤 받습니다.',
  },
  {
    key: 'recordingPartner',
    label: '신부 후보가 녹화에 동의했습니다',
    hint: '상대방 언어로 설명해야 합니다.',
  },
  {
    key: 'crossBorder',
    label: '신부 후보가 개인정보 국외 이전에 동의했습니다',
    hint: '신부 후보가 한국에 있으면 이 항목은 건너뛰어도 됩니다.',
  },
];

export default function CallSetupPanel({ match, onSaved }: Props) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const { items: interpreters } = useOfficeCollection('interpreters');
  const { items: partners } = useOfficeCollection('localPartners');
  const { members } = useStaff();

  // 우리 통역자와 현지 파트너를 한 목록에서 고른다. 사장에게는 둘 다 「통역을 누가 하나」다.
  // 값에 접두사를 붙여 어느 쪽인지 가린다 — 두 컬렉션의 id가 겹칠 수 있다.
  const [interpChoice, setInterpChoice] = useState(
    match.interpreterId
      ? `itp:${match.interpreterId}`
      : match.interpretationPartnerId
        ? `lp:${match.interpretationPartnerId}`
        : '',
  );
  const [agentUid, setAgentUid] = useState(match.agentUid ?? '');
  const [consents, setConsents] = useState<Record<ConsentRow['key'], boolean>>({
    meetingClient: match.callConsents?.meeting?.client ?? false,
    meetingPartner: match.callConsents?.meeting?.partner ?? false,
    recordingClient: match.callConsents?.recording?.client ?? false,
    recordingPartner: match.callConsents?.recording?.partner ?? false,
    crossBorder: match.callConsents?.crossBorder === true,
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 활성만 고를 수 있게 한다. 비활성을 고르면 서버가 어차피 막는다.
  const activeInterpreters = (interpreters as Interpreter[]).filter((i) => i.active);
  const activePartners = (partners as LocalPartner[]).filter((p) => p.active);

  async function save() {
    if (!agencyId) return;
    setBusy(true);
    setNotice(null);
    try {
      await updateDoc(doc(db, `agencies/${agencyId}/matches/${match.id}`), {
        // 둘 중 하나만 채운다. 서버는 우리 통역자를 먼저 보므로 양쪽이 차 있으면 헷갈린다.
        interpreterId: interpChoice.startsWith('itp:') ? interpChoice.slice(4) : null,
        interpretationPartnerId: interpChoice.startsWith('lp:') ? interpChoice.slice(3) : null,
        agentUid: agentUid || null,
        callConsents: {
          meeting: { client: consents.meetingClient, partner: consents.meetingPartner },
          recording: { client: consents.recordingClient, partner: consents.recordingPartner },
          // 체크를 안 했으면 「한국에 있어 묻지 않는다」는 뜻의 null로 둔다.
          // false로 저장하면 서버가 「거부했다」로 읽어 통화를 막는다.
          crossBorder: consents.crossBorder ? true : null,
        },
        updatedAt: serverTimestamp(),
      });
      setNotice('저장했습니다.');
      onSaved();
    } catch {
      setNotice('저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h4 className="text-sm font-bold text-[#102621]">통화에 들어올 사람</h4>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          신랑 후보·신부 후보와 함께 통역과 담당 직원이 들어옵니다. 네 사람이 각자 자기 자리에서
          접속하고, 사람마다 다른 링크를 받습니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Languages size={13} />통역
          </span>
          <select
            value={interpChoice}
            onChange={(e) => setInterpChoice(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">선택 안 함</option>
            {activeInterpreters.length > 0 && (
              <optgroup label="우리 통역자">
                {activeInterpreters.map((i) => (
                  <option key={i.id} value={`itp:${i.id}`}>
                    {i.name}
                    {i.languages && ` · ${i.languages}`}
                  </option>
                ))}
              </optgroup>
            )}
            {activePartners.length > 0 && (
              <optgroup label="현지 파트너가 붙임">
                {activePartners.map((p) => (
                  <option key={p.id} value={`lp:${p.id}`}>
                    {p.companyName}
                    {p.country && ` · ${p.country}`}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            통역사가 현지 에이전시 쪽 사람이면 「현지 파트너가 붙임」에서 그 파트너를 고르세요.
            통역료를 업체가 직접 주지 않는 경우가 여기 해당합니다.
          </p>
          {activeInterpreters.length === 0 && activePartners.length === 0 && (
            <p className="mt-1 text-[11px] leading-4 text-amber-700">
              고를 수 있는 통역자도 현지 파트너도 없습니다. 업체 정보 화면에서 먼저 등록해 주세요.
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <UserRound size={13} />배석할 담당 직원
          </span>
          <select
            value={agentUid}
            onChange={(e) => setAgentUid(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">선택 안 함</option>
            {members.map((m) => (
              <option key={m.id} value={m.uid}>
                {m.email ?? m.uid}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h4 className="text-sm font-bold text-[#102621]">받아야 할 동의</h4>
        <ul className="mt-2 space-y-2">
          {CONSENT_ROWS.map((row) => (
            <li key={row.key}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={consents[row.key]}
                  onChange={(e) => setConsents((c) => ({ ...c, [row.key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-xs font-medium text-slate-800">{row.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{row.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={save} disabled={busy} className="primary-button !py-2 text-xs">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {busy ? '저장하는 중…' : '저장'}
      </button>

      {notice && <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{notice}</p>}
    </div>
  );
}
