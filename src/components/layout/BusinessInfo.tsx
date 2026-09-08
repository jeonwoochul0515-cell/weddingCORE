// 공개 페이지 하단에 운영 주체(사업자) 정보를 표기하는 컴포넌트 — 네이버 검색광고 비즈채널 검수 요건

export default function BusinessInfo({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-5 text-slate-400 ${className}`}>
      운영. 법률사무소 청송law · 대표변호사 김창희 · 사업자등록번호 102-78-00061 · 부산 연제구 법원남로15번길 10, 202호(거제동, 미르코아빌딩) · 대표전화 1660-4452
    </p>
  );
}
