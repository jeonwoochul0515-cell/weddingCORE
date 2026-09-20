// AI 캐럿(크레딧) 정책값
//
// automation/index.ts에 있던 것을 떼어 왔다. 거기엔 Anthropic SDK import가 있어서,
// 엔트리(index.ts)가 상수 하나를 읽으려고 그 파일을 부르면 SDK가 모든 함수의
// 콜드스타트에 딸려 온다. 정의만 있는 파일은 가볍게 따로 둔다.

/**
 * 월간 기본 제공 캐럿. 무상 제공량은 운영 정책에 따라 조정하므로
 * 코드 상수가 아니라 환경변수(AI_MONTHLY_ALLOWANCE)로 먼저 읽는다.
 * 업체 문서에 monthlyAllowance가 있으면 그 값이 항상 우선한다.
 */
const configuredAllowance = Number(process.env.AI_MONTHLY_ALLOWANCE);

export const DEFAULT_MONTHLY_ALLOWANCE =
  Number.isFinite(configuredAllowance) && configuredAllowance >= 0 ? configuredAllowance : 20;
