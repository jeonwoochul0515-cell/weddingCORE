// 고객 서류 목록 구독과 업로드·삭제 — 파일은 Storage에, 기록은 Firestore에 둔다
import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';
import type { ClientDocument } from '@/types/schema';
import { computeValidUntil, type DocType } from './types';

export type DocumentListItem = ClientDocument & { id: string };

export function useClientDocuments(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    setError(null);
    const q = query(
      collection(db, `agencies/${agencyId}/clients/${clientId}/documents`),
      orderBy('uploadedAt', 'desc'),
    );
    return liveQuery(
      '고객 서류',
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ClientDocument) })));
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId, clientId]);

  return { items, loading, error };
}

/** 파일명에서 경로 문자와 공백을 걷어낸다. Storage 경로에 그대로 들어간다 */
function safeFileName(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|#%]/g, '_').replace(/\s+/g, '_');
  return cleaned.length > 0 ? cleaned.slice(-120) : 'file';
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

  // 기록 id를 먼저 정해 파일 경로에 넣는다. 저장 규칙이 documents/{문서id}/{파일명} 두 칸을 본다.
  const docRef = doc(collection(db, `agencies/${agencyId}/clients/${clientId}/documents`));
  const storagePath = `agencies/${agencyId}/clients/${clientId}/documents/${docRef.id}/${safeFileName(file.name)}`;

  // 1) Storage 업로드
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(storageRef);

  // 2) 유효기간 계산
  const validUntil =
    validUntilOverride ??
    (issuedAt ? computeValidUntil(type, issuedAt) : null);

  // 3) Firestore 메타데이터
  await setDoc(docRef, {
    agencyId,
    type,
    subject,
    storageUrl: url,
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    issuedAt: issuedAt ? Timestamp.fromDate(issuedAt) : null,
    validUntil: validUntil ? Timestamp.fromDate(validUntil) : null,
    ocrExtracted: null,
    uploadedBy: uid,
    uploadedAt: serverTimestamp(),
    replaces: null,
  });
  return docRef.id;
}

/**
 * 서류를 지운다. 파일부터 지우고 기록을 지운다. 파일이 이미 없으면(예전 경로 불일치로
 * 올라가지 못한 경우) 기록만 지운다. 기록이 남으면 화면에 유령 서류가 계속 보이기 때문이다.
 */
export async function deleteClientDocument(params: {
  agencyId: string;
  clientId: string;
  documentId: string;
  storagePath?: string | null;
  storageUrl?: string | null;
}) {
  const { agencyId, clientId, documentId, storagePath, storageUrl } = params;
  const target = storagePath || storageUrl;
  if (target) {
    try {
      await deleteObject(ref(storage, target));
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'storage/object-not-found') throw err;
    }
  }
  await deleteDoc(doc(db, `agencies/${agencyId}/clients/${clientId}/documents/${documentId}`));
}
