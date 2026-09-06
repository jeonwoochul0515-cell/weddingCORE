// 사람 사진 한 장 — 고객과 후보가 같은 규칙을 쓴다
//
// 서류함과 경로를 나눈 이유. 사진은 화면에 늘 보이는 것이고 서류는 증빙이다.
// 서류함에 섞어 두면 목록이 지저분해지고, 프로필에 쓸 사진을 골라내기 어렵다.
import { useState } from 'react';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export type PhotoKind = 'clients' | 'partners';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const path = (agencyId: string, kind: PhotoKind, targetId: string) =>
  `agencies/${agencyId}/photos/${kind}/${targetId}/photo`;

/**
 * 한 사람당 한 장만 둔다. 파일 이름을 고정해 두면 새로 올릴 때 옛 사진이 저절로 덮인다.
 * 여러 장이 필요해지면 그때 경로에 번호를 붙인다.
 */
export function usePhotoUpload(agencyId: string | null | undefined, kind: PhotoKind) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(targetId: string, file: File): Promise<string | null> {
    if (!agencyId) return null;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('사진 파일만 올릴 수 있습니다.');
      return null;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('사진은 5MB까지 올릴 수 있습니다. 휴대폰에서 찍은 사진이면 크기를 줄여 주세요.');
      return null;
    }
    setBusy(true);
    try {
      const r = ref(storage, path(agencyId, kind, targetId));
      await uploadBytes(r, file, { contentType: file.type });
      return await getDownloadURL(r);
    } catch (e) {
      setError(`사진을 올리지 못했습니다. (${(e as Error).message})`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function remove(targetId: string) {
    if (!agencyId) return;
    setError(null);
    setBusy(true);
    try {
      await deleteObject(ref(storage, path(agencyId, kind, targetId)));
    } catch (e) {
      // 이미 없는 파일을 지우는 것은 실패가 아니다
      if (!/object-not-found/.test((e as Error).message)) {
        setError(`사진을 지우지 못했습니다. (${(e as Error).message})`);
      }
    } finally {
      setBusy(false);
    }
  }

  return { upload, remove, busy, error };
}
