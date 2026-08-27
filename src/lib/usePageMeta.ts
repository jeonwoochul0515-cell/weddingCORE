// 라우트마다 고유한 제목·설명·대표URL을 <head>에 반영하는 훅
//
// SPA는 문서가 하나뿐이라 그대로 두면 모든 화면이 같은 제목으로 색인된다.
// 검색로봇은 JS 실행 전 정적 HTML을 먼저 읽으므로 이 훅은 보조 수단이며,
// 공개 페이지의 본문 노출은 프리렌더로 따로 보장해야 한다.

import { useEffect } from 'react';

const SITE_NAME = 'weddingCORE';
const ORIGIN = 'https://weddingcore.net';

type PageMeta = {
  title: string;
  description: string;
  /** 도메인을 뺀 경로. 예: '/visa-simulator' */
  path: string;
  noindex?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function usePageMeta({ title, description, path, noindex = false }: PageMeta) {
  useEffect(() => {
    const url = `${ORIGIN}${path}`;
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertCanonical(url);
  }, [title, description, path, noindex]);
}
