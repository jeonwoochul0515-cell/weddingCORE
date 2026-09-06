// 업체 정보의 「직원」 탭 — 대표가 직원을 부르고 역할을 정하고 내보낸다
import { useState } from 'react';
import { Mail, Trash2, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  cancelInvite,
  changeStaffRole,
  inviteStaff,
  removeStaff,
  ROLE_HELP,
  ROLE_LABEL,
  useStaff,
  type StaffRole,
} from './useStaff';

const ROLES: StaffRole[] = ['manager', 'staff', 'readonly'];
const isOwner = (role: string | null | undefined) => role === 'owner' || role === 'agency_owner';

export default function StaffSection() {
  const user = useAuthStore((s) => s.user);
  const owner = isOwner(user?.role);
  const { members, invites, loading } = useStaff();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);

  const pending = invites.filter((i) => i.status === 'pending');

  async function run(job: () => Promise<unknown>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      await job();
      setNotice({ ok: true, text: done });
    } catch (error) {
      setNotice({ ok: false, text: `못 했습니다. 잠시 뒤 다시 해 보세요. (${(error as Error).message})` });
    } finally {
      setBusy(false);
    }
  }

  function invite() {
    if (!user?.agencyId) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setNotice({ ok: false, text: '이메일을 정확히 적어 주세요.' });
      return;
    }
    void run(
      () => inviteStaff(user.agencyId!, value, role, user.uid),
      `${value} 님을 불렀습니다. 그 이메일로 가입하면 자동으로 직원이 됩니다.`,
    ).then(() => setEmail(''));
  }

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;

  return (
    <div className="space-y-4">
      {owner && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-bold text-[#102621]">직원 부르기</h3>
          <p className="mb-3 text-xs leading-5 text-slate-500">
            직원이 쓸 이메일을 적으면 초대장이 남습니다. 그 이메일로 가입하면 따로 승인하지 않아도
            우리 업체 직원이 됩니다. 이미 다른 업체에 속한 계정은 들어오지 않습니다.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-56 flex-1 text-xs font-semibold text-slate-600">이메일
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">역할
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
              >
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={invite}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <UserPlus size={14} />부르기
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">{ROLE_HELP[role]}</p>
        </div>
      )}

      {notice && (
        <p className={`rounded-lg px-3 py-2 text-xs ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {notice.text}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-[#102621]">지금 함께 쓰는 사람 {members.length}명</h3>
        <ul className="space-y-2">
          {members.map((m) => {
            const me = m.uid === user?.uid;
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5">
                <span className="min-w-0 text-sm">
                  {/* 옛 구성원 문서에는 email이 없다. 내부 ID를 그대로 보여 주면 누구인지 모른다.
                      나면 내 이메일을 쓰고, 남이면 이메일이 안 적혔다고 말한다. */}
                  <span className="font-semibold text-slate-800">
                    {m.email ?? (me ? user?.email ?? '나' : '이메일이 적히지 않은 구성원')}
                  </span>
                  {me && <span className="ml-1.5 text-xs text-slate-400">(나)</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  {owner && m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      disabled={busy}
                      onChange={(e) => void run(
                        () => changeStaffRole(m.uid, e.target.value as StaffRole),
                        '역할을 바꿨습니다. 그 사람이 다시 로그인하면 적용됩니다.',
                      )}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  )}
                  {owner && m.role !== 'owner' && (
                    confirmUid === m.uid ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">내보낼까요?</span>
                        <button type="button" disabled={busy} onClick={() => void run(() => removeStaff(m.uid), '내보냈습니다.').then(() => setConfirmUid(null))} className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white">내보내기</button>
                        <button type="button" onClick={() => setConfirmUid(null)} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-500 ring-1 ring-slate-200">취소</button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmUid(m.uid)}
                        aria-label={`${m.email ?? m.uid} 내보내기`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-[#102621]">아직 안 들어온 초대 {pending.length}건</h3>
          <ul className="space-y-2">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 text-slate-700"><Mail size={14} className="text-slate-400" />{i.email}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{ROLE_LABEL[i.role]}</span>
                  {owner && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => cancelInvite(user!.agencyId!, i.id), '초대를 거뒀습니다.')}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
                    >
                      거두기
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!owner && <p className="text-[11px] text-slate-400">직원을 부르거나 역할을 바꾸는 것은 대표 계정만 할 수 있습니다.</p>}
    </div>
  );
}
