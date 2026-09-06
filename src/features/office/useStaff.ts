// 업체 구성원과 초대장 — 대표가 직원을 부르고 역할을 정한다
//
// 소속과 역할은 커스텀 클레임에 들어가 있고 클라이언트가 못 바꾼다.
// 그래서 초대장만 화면에서 만들고, 실제로 붙이고 떼는 일은 서버 함수가 한다.
import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export type StaffRole = 'manager' | 'staff' | 'readonly';

export const ROLE_LABEL: Record<string, string> = {
  owner: '대표',
  manager: '관리자',
  staff: '직원',
  readonly: '보기만',
};

/** 무엇을 할 수 있는지 한 줄로. 대표가 역할을 고를 때 읽는 글이다 */
export const ROLE_HELP: Record<StaffRole, string> = {
  manager: '고객·서류·매칭을 모두 다루고 업체 정보도 고칠 수 있습니다.',
  staff: '고객·서류·매칭을 다룹니다. 업체 정보와 직원은 못 고칩니다.',
  readonly: '보기만 합니다. 아무것도 고치거나 지우지 못합니다.',
};

export type Member = {
  id: string;
  uid: string;
  email?: string;
  role: string;
  joinedAt?: Timestamp | null;
};

export type Invite = {
  id: string;
  email: string;
  role: StaffRole;
  status: 'pending' | 'accepted';
  invitedAt?: Timestamp | null;
};

export function useStaff() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    const unsubM = onSnapshot(
      collection(db, `agencies/${agencyId}/members`),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    const unsubI = onSnapshot(
      collection(db, `agencies/${agencyId}/invites`),
      (snap) => setInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invite, 'id'>) }))),
      () => undefined,
    );
    return () => { unsubM(); unsubI(); };
  }, [agencyId]);

  return { members, invites, loading };
}

const normalize = (email: string) => email.trim().toLowerCase();

/** 문서 id를 이메일로 쓴다. 같은 사람을 두 번 부르는 일을 저장소가 막아 준다 */
export async function inviteStaff(agencyId: string, email: string, role: StaffRole, byUid: string) {
  const id = normalize(email);
  await setDoc(doc(db, `agencies/${agencyId}/invites/${id}`), {
    email: id,
    role,
    status: 'pending',
    invitedBy: byUid,
    invitedAt: serverTimestamp(),
  });
}

export async function cancelInvite(agencyId: string, inviteId: string) {
  await deleteDoc(doc(db, `agencies/${agencyId}/invites/${inviteId}`));
}

export const removeStaff = (uid: string) =>
  httpsCallable(functions, 'removeStaff')({ uid });

export const changeStaffRole = (uid: string, role: StaffRole) =>
  httpsCallable(functions, 'changeStaffRole')({ uid, role });

/** 로그인했는데 아직 소속이 없을 때 한 번 부른다. 초대장이 있으면 그 업체 직원이 된다 */
export const claimStaffInvite = () =>
  httpsCallable<unknown, { joined: boolean; agencyId?: string; role?: string; reason?: string }>(
    functions,
    'claimStaffInvite',
  )({});
