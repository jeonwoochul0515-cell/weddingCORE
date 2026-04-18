/**
 * 모니터링 대상 법령 목록.
 * law.go.kr의 법령ID(MST) 또는 검색 쿼리로 지정.
 */
export type MonitoredStatute = {
  statuteId: string; // Firestore 문서 ID (우리가 지정)
  lawName: string; // law.go.kr 검색 키워드 (정확한 명칭)
  mst?: string; // 법령 마스터 ID (확정된 경우)
  priority: 'critical' | 'high' | 'medium'; // 알림 중요도
};

export const MONITORED_STATUTES: MonitoredStatute[] = [
  {
    statuteId: 'marriage-brokerage-act',
    lawName: '결혼중개업의 관리에 관한 법률',
    priority: 'critical',
  },
  {
    statuteId: 'immigration-control-act',
    lawName: '출입국관리법',
    priority: 'critical',
  },
  {
    statuteId: 'multicultural-families-support-act',
    lawName: '다문화가족지원법',
    priority: 'high',
  },
  {
    statuteId: 'international-private-law',
    lawName: '국제사법',
    priority: 'medium',
  },
];

export const LAW_GO_KR_BASE = 'https://www.law.go.kr/DRF';
