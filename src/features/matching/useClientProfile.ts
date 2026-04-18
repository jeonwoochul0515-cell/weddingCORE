import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { ClientProfile, BirthInfo } from '@/types/schema';

export async function updateClientProfile(
  agencyId: string,
  clientId: string,
  profile: ClientProfile,
  birthInfo: BirthInfo,
) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
  await updateDoc(ref, { profile, birthInfo, updatedAt: serverTimestamp() });
}

export async function updatePartnerProfile(
  agencyId: string,
  clientId: string,
  partnerId: string,
  profile: ClientProfile,
  birthInfo: BirthInfo,
) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}/partners/${partnerId}`);
  await updateDoc(ref, { profile, birthInfo });
}

export function useProfileUpdater() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);

  return {
    updateClient: (clientId: string, profile: ClientProfile, birthInfo: BirthInfo) => {
      if (!agencyId) throw new Error('업체 정보 없음');
      return updateClientProfile(agencyId, clientId, profile, birthInfo);
    },
    updatePartner: (clientId: string, partnerId: string, profile: ClientProfile, birthInfo: BirthInfo) => {
      if (!agencyId) throw new Error('업체 정보 없음');
      return updatePartnerProfile(agencyId, clientId, partnerId, profile, birthInfo);
    },
  };
}
