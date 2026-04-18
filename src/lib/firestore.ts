import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

/**
 * 모든 Firestore 문서에 타입 안전성을 부여하는 제네릭 컨버터.
 * collection(db, 'agencies').withConverter(converter<Agency>()) 식으로 사용.
 */
export function converter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
  };
}
