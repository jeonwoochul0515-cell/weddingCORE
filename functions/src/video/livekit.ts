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

/**
 * 녹화본을 둘 곳 (Cloudflare R2).
 *
 * 왜 우리 저장소인가. LiveKit은 녹화본을 대신 보관해 주지 않는다. 어딘가는 우리가 대야 한다.
 * R2를 고른 이유는 꺼내 볼 때 요금이 없어서다 — 변호사와 업체가 분쟁 때 영상을 돌려 보는데
 * 볼 때마다 돈이 나가면 안 본다. 그러면 남겨 둔 의미가 없다.
 *
 * 지우는 일은 여기서 하지 않는다. R2 버킷의 수명주기 규칙이 1년 뒤 알아서 지운다.
 * 코드로 지우면 코드가 안 돌 때 안 지워지지만, 버킷 규칙은 우리가 잊어도 돈다.
 */
function r2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID ?? '').trim();
  const bucket = (process.env.R2_BUCKET ?? '').trim();
  const accessKey = (process.env.R2_ACCESS_KEY_ID ?? '').trim();
  const secret = (process.env.R2_SECRET_ACCESS_KEY ?? '').trim();
  if (!accountId || !bucket || !accessKey || !secret) return null;
  return {
    access_key: accessKey,
    secret,
    bucket,
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    // AWS가 아닌 저장소는 이것을 켜야 버킷 이름이 주소 경로로 들어간다.
    force_path_style: true,
  };
}

/** 녹화를 켤 수 있는가. 키가 없으면 통화는 열리되 녹화는 안 된다 */
export function recordingConfigured(): boolean {
  return r2Config() !== null;
}

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

// ── 녹화 (Egress) ─────────────────────────────────────────
//
// 방 전체를 한 화면으로 합쳐 MP4로 굽고 R2에 올린다.
// SDK를 안 쓰는 이유는 파일 머리와 같다 — 호출이 HTTP 한 번이라 무게를 더할 이유가 없다.

/** 서버 API용 토큰. 입장 토큰과 권한이 다르다 — 이쪽은 방에 들어가지 않는다 */
function createServerToken(grant: Record<string, unknown>): string {
  const key = (process.env.LIVEKIT_API_KEY ?? '').trim();
  const secret = (process.env.LIVEKIT_API_SECRET ?? '').trim();
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: key, sub: key, nbf: now - 10, exp: now + 60, video: grant };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${signature}`;
}

/** wss://… → https://… . 서버 API는 HTTP로 부른다 */
function apiBase(): string {
  return livekitUrl().replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
}

async function callEgress(method: string, body: unknown, grant: Record<string, unknown>) {
  const res = await fetch(`${apiBase()}/twirp/livekit.Egress/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${createServerToken(grant)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} 실패 (HTTP ${res.status}): ${text.slice(0, 200)}`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

/**
 * 방 녹화를 시작한다. 돌려주는 값은 나중에 멈출 때 쓰는 식별자다.
 *
 * 경로에 개인정보를 넣지 않는다. 통화 식별자만으로 충분하고, 저장소 목록을 보는
 * 사람에게 누구의 맞선인지 알려 줄 이유가 없다.
 */
export async function startRoomRecording(roomName: string, callId: string): Promise<string> {
  const s3 = r2Config();
  if (!s3) throw new Error('녹화 저장소가 설정되지 않았습니다.');

  const info = await callEgress(
    'StartRoomCompositeEgress',
    {
      room_name: roomName,
      // 넷이 고르게 보이는 배치. 누가 말하든 네 사람이 다 담겨야 증거가 된다.
      layout: 'grid',
      audio_only: false,
      file_outputs: [{ file_type: 'MP4', filepath: `calls/${callId}.mp4`, s3 }],
    },
    { roomRecord: true },
  );
  return String(info.egress_id ?? info.egressId ?? '');
}

/** 녹화를 멈춘다. 방이 비면 알아서도 멈추지만, 통화를 닫을 때 확실히 해 둔다 */
export async function stopRoomRecording(egressId: string): Promise<void> {
  await callEgress('StopEgress', { egress_id: egressId }, { roomRecord: true });
}
