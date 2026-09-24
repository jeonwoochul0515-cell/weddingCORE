// 로그인 뒤 원래 열려던 업체 화면으로 돌려보낼 주소를 고른다 — 문자 속 접수 링크(?lead=)가 로그인 뒤에도 그 건을 열게
// 우리 사이트 안의 /agency 화면만 받는다. 바깥 주소나 이상한 경로는 버려서 로그인 화면이 남의 사이트로 튕기지 않게 한다.

type FromLike = { pathname?: unknown; search?: unknown } | null | undefined;

export function agencyReturnPath(from: FromLike): string | null {
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  const search = typeof from?.search === 'string' ? from.search : '';
  if (!/^\/agency(\/[A-Za-z0-9_\-/]*)?$/.test(pathname)) return null;
  if (search && !/^\?[A-Za-z0-9_\-=&%.]*$/.test(search)) return pathname;
  return pathname + search;
}
