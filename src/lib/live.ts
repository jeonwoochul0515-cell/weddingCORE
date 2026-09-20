// Firestore 실시간 구독 껍데기 — 오류를 못 본 척 넘어가지 못하게 한다
//
// 왜 필요한가. firebase의 onSnapshot은 오류 콜백이 선택이다. 안 주면 구독이 실패해도
// 성공 콜백이 영영 안 불린다. 화면은 loading=true에 갇혀 「불러오는 중…」만 띄운 채
// 멈추고, 콘솔에도 아무것도 안 남는다. 권한 규칙이 막았는지, 복합 색인이 없는지,
// 인터넷이 끊겼는지 알 길이 없다 — 대표가 보기에는 그냥 고장난 화면이다.
//
// 그래서 구독을 여는 통로를 하나로 모으고, 오류 콜백을 인자에서 뺄 수 없게 만든다.
// 새 화면을 만드는 사람이 잊어버릴 수 있는 자리를 아예 없앤다.

import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';

/** 사람이 읽을 수 있는 실패 사유. 화면에 그대로 띄워도 되는 말이다. */
export function liveErrorMessage(error: FirestoreError): string {
  switch (error.code) {
    case 'permission-denied':
      return '이 자료를 볼 권한이 없습니다. 대표에게 권한을 요청해 주세요.';
    case 'failed-precondition':
      // 대개 복합 색인이 없을 때다. 사장이 고칠 수 있는 일이 아니라 우리에게 알려야 한다.
      return '자료를 불러오지 못했습니다. 사무실(1660-4452)로 알려 주세요.';
    case 'unavailable':
      return '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    default:
      return '자료를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  }
}

function report(label: string, error: FirestoreError) {
  console.error(`[firestore] ${label} 구독 실패 (${error.code})`, error);
}

/**
 * 목록 구독. 실패하면 onError가 불린다 — 화면은 거기서 loading을 내리고 사유를 보여 준다.
 * @param label 어떤 자료인지. 실패 로그에 그대로 찍힌다.
 */
export function liveQuery<T = DocumentData>(
  label: string,
  query: Query<T>,
  onData: (snapshot: QuerySnapshot<T>) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(query, onData, (error) => {
    report(label, error);
    onError(error);
  });
}

/** 단건 구독. 나머지는 liveQuery와 같다. */
export function liveDoc<T = DocumentData>(
  label: string,
  ref: DocumentReference<T>,
  onData: (snapshot: DocumentSnapshot<T>) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(ref, onData, (error) => {
    report(label, error);
    onError(error);
  });
}
