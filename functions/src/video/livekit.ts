// LiveKit 입장 토큰 발급
//
// 왜 LiveKit인가. P2P WebRTC는 이 용도에 못 쓴다 — 서로 IP가 노출되고(연락처를 가리는 게
// 목적인데 앞뒤가 안 맞는다), 한국↔베트남 모바일망은 대개 symmetric NAT라 TURN 없이는
// 연결도 안 되며, 무엇보다 서버 녹화가 안 된다. 증거를 남기는 게 이 기능의 절반이다.
//
// 왜 SDK를 안 쓰나. 입장 토큰은 HS256 JWT 하나다. 서버 SDK를 붙이면 콜드스타트에
// 딸려오는 무게가 이득보다 크다. 녹화(Egress)까지 서버에서 제어하게 되면 그때 SDK를 본다.
//
// 키가 없으면 기능을 연다. 자리표시 값으로 운영에 나가는 일이 없어야 한다
// (payments/toss.ts가 TOSS_SECRET_KEY에 쓰는 것과 같은 방식이다).

import { createHmac } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export type RoomGrant = {
  room: string;
  identity: string;
  /** 화면에 뜨는 이름. 연락처가 들어갈 자리를 만들지 않는다 */
  name: string;
  /** 말하고 보여줄 수 있는가. 통역사와 양측 모두 true다 */
  canPublish: boolean;
  /**
   * 데이터 채널. 언제나 false다 — 채팅·파일전송이 여기로 나간다.
   * 쉬운 연락처 교환 경로를 닫는 곳이 바로 이 한 줄이다.
   */
  canPublishData: false;
};

/** 입장 토큰 유효시간. 짧게 둔다 — 토큰이 새어도 오래 못 쓴다 */
const TTL_SECONDS = 15 * 60;

export function livekitConfigured(): boolean {
  const key = (process.env.LIVEKIT_API_KEY ?? '').trim();
  const secret = (process.env.LIVEKIT_API_SECRET ?? '').trim();
  const url = (process.env.LIVEKIT_URL ?? '').trim();
  return Boolean(key && secret && url) && secret !== 'NOT_CONFIGURED';
}

/** 화면이 붙을 주소. 키가 없으면 빈 문자열이다 */
export function livekitUrl(): string {
  return (process.env.LIVEKIT_URL ?? '').trim();
}

/**
 * 입장 토큰을 만든다.
 * 방 이름과 참가자 식별자에 개인정보를 넣지 않는다 — 토큰은 클라이언트가 들고 있고
 * 디코딩하면 그대로 보인다.
 */
export function createAccessToken(grant: RoomGrant): string {
  const key = (process.env.LIVEKIT_API_KEY ?? '').trim();
  const secret = (process.env.LIVEKIT_API_SECRET ?? '').trim();
  if (!livekitConfigured()) {
    throw new HttpsError(
      'failed-precondition',
      '영상통화가 아직 열리지 않았습니다. 사무실(1660-4452)로 문의해 주세요.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: key,
    sub: grant.identity,
    nbf: now - 10,
    exp: now + TTL_SECONDS,
    name: grant.name,
    video: {
      room: grant.room,
      roomJoin: true,
      canPublish: grant.canPublish,
      canSubscribe: true,
      // ★ 이 둘이 꺼져 있어야 채팅·파일전송이 막힌다.
      canPublishData: false,
      canUpdateOwnMetadata: false,
    },
  };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${signature}`;
}
