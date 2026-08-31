// 검색·AI 답변엔진이 페이지 구조를 읽도록 구조화 데이터(JSON-LD)를 만드는 헬퍼
//
// 왜 필요한가
// - BreadcrumbList: /guides/x, /law/x 처럼 계층이 있는 주소에서 "어디에 속한 글인지"를
//   알려준다. 검색결과에 이동경로가 표시되고, 문서끼리의 관계가 분명해진다.
// - Article: 이 페이지가 "글"이라는 것과 언제 손봤는지를 알려준다. 생성형 AI는
//   오래된 글의 인용을 줄이는 경향이 있어 갱신일이 없으면 불리하다.
//
// ★ 화면에 없는 내용을 스키마에 넣지 않는다. 넣으면 스팸으로 처리된다.

const ORIGIN = 'https://weddingcore.net';

/**
 * 해설 본문을 마지막으로 검토한 날.
 * 조문·해석 내용을 고칠 때마다 이 날짜를 함께 올린다. 실제로 손보지 않았는데
 * 날짜만 올리면 거짓 신선도 신호가 되므로 그러지 않는다.
 */
export const CONTENT_REVIEWED = '2026-08-31';

type Crumb = { name: string; path: string };

/** 홈 → 목록 → 현재 글 순서로 넘긴다. 마지막 항목이 현재 페이지다. */
export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${ORIGIN}${c.path}`,
    })),
  };
}

export function articleSchema(args: {
  headline: string;
  description: string;
  path: string;
  /** 원 자료가 나온 날(법제처 회신일·선고일 등). 우리 글의 발행일이 아니다. */
  sourceDate?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.headline,
    description: args.description,
    mainEntityOfPage: `${ORIGIN}${args.path}`,
    inLanguage: 'ko',
    dateModified: CONTENT_REVIEWED,
    ...(args.sourceDate ? { datePublished: args.sourceDate } : {}),
    author: { '@type': 'Organization', name: 'weddingCORE', url: ORIGIN },
    publisher: { '@type': 'Organization', name: 'weddingCORE', url: ORIGIN },
  };
}
