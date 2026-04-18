import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { FieldKey, SupportedLang } from './fields';

export type BackgroundSubject = 'korean' | 'partner';

export type BackgroundInfoDoc = {
  id: string;
  agencyId: string;
  clientId: string;
  subject: BackgroundSubject;
  sourceLang: SupportedLang;
  fields: Partial<Record<FieldKey, string | number>>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type TranslationDoc = {
  lang: SupportedLang;
  fields: Partial<Record<FieldKey, string>>;
  translatedBy: 'ai' | 'human';
  translationQuality: 'draft' | 'reviewed' | 'certified';
  signedAt: Timestamp | null;
  signedByName: string | null;
  translatedAt?: Timestamp;
};

export function useBackgroundInfoList(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<BackgroundInfoDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    const q = query(
      collection(db, `agencies/${agencyId}/clients/${clientId}/backgroundInfo`),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BackgroundInfoDoc, 'id'>) })));
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId]);

  return { items, loading };
}

export function useBackgroundInfo(clientId: string | undefined, infoId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [info, setInfo] = useState<BackgroundInfoDoc | null>(null);
  const [translations, setTranslations] = useState<TranslationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId || !infoId) { setLoading(false); return; }
    const path = `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}`;
    const unsub1 = onSnapshot(doc(db, path), (snap) => {
      setInfo(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<BackgroundInfoDoc, 'id'>) } : null);
      setLoading(false);
    });
    const unsub2 = onSnapshot(
      collection(db, `${path}/translations`),
      (snap) => {
        setTranslations(snap.docs.map((d) => d.data() as TranslationDoc));
      },
    );
    return () => { unsub1(); unsub2(); };
  }, [agencyId, clientId, infoId]);

  return { info, translations, loading };
}

export async function createBackgroundInfo(params: {
  agencyId: string;
  clientId: string;
  subject: BackgroundSubject;
  sourceLang: SupportedLang;
  fields: Partial<Record<FieldKey, string | number>>;
}) {
  const ref = await addDoc(
    collection(db, `agencies/${params.agencyId}/clients/${params.clientId}/backgroundInfo`),
    {
      agencyId: params.agencyId,
      clientId: params.clientId,
      subject: params.subject,
      sourceLang: params.sourceLang,
      fields: params.fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  return ref.id;
}

export async function updateBackgroundInfoFields(
  agencyId: string,
  clientId: string,
  infoId: string,
  fields: Partial<Record<FieldKey, string | number>>,
) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}`);
  await updateDoc(ref, { fields, updatedAt: serverTimestamp() });
}

export async function saveTranslation(params: {
  agencyId: string;
  clientId: string;
  infoId: string;
  lang: SupportedLang;
  fields: Partial<Record<FieldKey, string>>;
  translatedBy?: 'ai' | 'human';
}) {
  const ref = doc(
    db,
    `agencies/${params.agencyId}/clients/${params.clientId}/backgroundInfo/${params.infoId}/translations/${params.lang}`,
  );
  await setDoc(ref, {
    lang: params.lang,
    fields: params.fields,
    translatedBy: params.translatedBy ?? 'ai',
    translationQuality: 'draft',
    signedAt: null,
    signedByName: null,
    translatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function signTranslation(params: {
  agencyId: string;
  clientId: string;
  infoId: string;
  lang: SupportedLang;
  signerName: string;
}) {
  const ref = doc(
    db,
    `agencies/${params.agencyId}/clients/${params.clientId}/backgroundInfo/${params.infoId}/translations/${params.lang}`,
  );
  await updateDoc(ref, {
    signedAt: serverTimestamp(),
    signedByName: params.signerName,
  });
}
