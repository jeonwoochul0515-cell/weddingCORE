import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { ClientDocument } from '@/types/schema';
import { computeValidUntil, type DocType } from './types';

export type DocumentListItem = ClientDocument & { id: string };

export function useClientDocuments(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    const q = query(
      collection(db, `agencies/${agencyId}/clients/${clientId}/documents`),
      orderBy('uploadedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ClientDocument) })));
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId]);

  return { items, loading };
}

export async function uploadClientDocument(params: {
  agencyId: string;
  clientId: string;
  uid: string;
  file: File;
  type: DocType;
  subject: 'korean' | 'partner' | 'both';
  issuedAt: Date | null;
  validUntilOverride: Date | null;
}) {
  const { agencyId, clientId, uid, file, type, subject, issuedAt, validUntilOverride } = params;

  // 1) Storage 업로드
  const ext = file.name.split('.').pop();
  const fileKey = `${type}_${Date.now()}.${ext}`;
  const storageRef = ref(
    storage,
    `agencies/${agencyId}/clients/${clientId}/documents/${fileKey}`,
  );
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // 2) 유효기간 계산
  const validUntil =
    validUntilOverride ??
    (issuedAt ? computeValidUntil(type, issuedAt) : null);

  // 3) Firestore 메타데이터
  await addDoc(
    collection(db, `agencies/${agencyId}/clients/${clientId}/documents`),
    {
      agencyId,
      type,
      subject,
      storageUrl: url,
      fileName: file.name,
      mimeType: file.type,
      issuedAt: issuedAt ? Timestamp.fromDate(issuedAt) : null,
      validUntil: validUntil ? Timestamp.fromDate(validUntil) : null,
      ocrExtracted: null,
      uploadedBy: uid,
      uploadedAt: serverTimestamp(),
      replaces: null,
    },
  );
}
