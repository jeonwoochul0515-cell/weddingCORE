import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { Client } from '@/types/schema';

export type ClientListItem = Client & { id: string };

export function useAgencyClients() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    const q = query(
      collection(db, `agencies/${agencyId}/clients`),
      where('status', '==', 'active'),
      orderBy('updatedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Client) })));
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId]);

  return { items, loading };
}

export function useClient(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [client, setClient] = useState<ClientListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
    const unsub = onSnapshot(ref, (snap) => {
      setClient(snap.exists() ? { id: snap.id, ...(snap.data() as Client) } : null);
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId]);

  return { client, loading };
}

export async function createClient(
  agencyId: string,
  uid: string,
  data: {
    name: string;
    birthDate: Date;
    gender: 'M' | 'F';
    phone: string;
    address: string;
    incomeAnnual: number;
    occupation: string;
    maritalHistory: string;
  },
) {
  const ref = await addDoc(collection(db, `agencies/${agencyId}/clients`), {
    agencyId,
    koreanClient: {
      name: data.name,
      birthDate: Timestamp.fromDate(data.birthDate),
      gender: data.gender,
      nationalIdMasked: '',
      phone: data.phone,
      address: data.address,
      maritalHistory: data.maritalHistory,
      incomeAnnual: data.incomeAnnual,
      occupation: data.occupation,
    },
    assignedStaffUid: uid,
    currentStage: 1,
    overallProgress: 0,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
