/**
 * 성평등가족부 결혼중개업 공시 API 프록시.
 *
 * - 클라이언트 인증키 노출 방지를 위해 모든 호출은 이 Cloud Function 을 경유.
 * - 업체 가입 화면 자동완성(실시간 검색) 및 가입 업체 야간 동기화에 공통 사용.
 *
 * 사전 준비:
 *   functions/.env 에 DATA_GO_KR_KEY 설정 (Decoded 일반 인증키)
 *
 * API 스펙 (2026-04-19 실측):
 *   GET https://apis.data.go.kr/1383000/gmis/instMrgBrkpgServiceV2/getInstMrgBrkpgListV2
 *   params: serviceKey, pageNo, numOfRows, type=json, entrpsNm?, ctpvNm?, sggNm?
 *   response: response.body.items.item[] (최대 100/page, 전국 267건)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
const REGION = 'asia-northeast3';
const DATA_GO_KR_KEY = defineSecret('DATA_GO_KR_KEY');
const BASE = 'https://apis.data.go.kr/1383000/gmis/instMrgBrkpgServiceV2/getInstMrgBrkpgListV2';
function normalize(raw) {
    const ctpv = raw.ctpvNm?.trim() ?? '';
    const sgg = raw.sggNm?.trim() ?? '';
    return {
        entrpsNm: raw.entrpsNm?.trim() ?? '',
        rprsvNm: raw.rprsvNm?.trim() ?? '',
        region: [ctpv, sgg].filter(Boolean).join(' '),
        mrbrkRegYmd: raw.mrbrkRegYmd?.trim() || null,
        operYn: (raw.operYn ?? '').trim().toUpperCase() === 'Y',
        hasSanctions: !!raw.dspsCn?.trim(),
        location: typeof raw.lat === 'number' && typeof raw.lot === 'number'
            ? { lat: raw.lat, lng: raw.lot }
            : null,
    };
}
/**
 * 업체명 부분일치로 최대 20건 검색.
 * - 로그인 사용자만 호출 가능 (가입 진행 중 누구나 접근)
 * - keyword 최소 2자, 최대 40자
 * - 운영 중(operYn=Y)만 반환
 */
export const searchBrokerRegistry = onCall({ region: REGION, secrets: [DATA_GO_KR_KEY], timeoutSeconds: 15, memory: '256MiB' }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const keyword = String(request.data?.keyword ?? '').trim();
    if (keyword.length < 2) {
        throw new HttpsError('invalid-argument', '검색어는 2자 이상이어야 합니다.');
    }
    if (keyword.length > 40) {
        throw new HttpsError('invalid-argument', '검색어가 너무 깁니다.');
    }
    const key = DATA_GO_KR_KEY.value();
    if (!key) {
        throw new HttpsError('failed-precondition', 'DATA_GO_KR_KEY 미설정');
    }
    const qs = new URLSearchParams({
        serviceKey: key,
        pageNo: '1',
        numOfRows: '20',
        type: 'json',
        entrpsNm: keyword,
    });
    let json;
    try {
        const res = await fetch(`${BASE}?${qs.toString()}`, {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            const body = await res.text();
            logger.error('공시 API 오류', { status: res.status, body: body.slice(0, 300) });
            throw new HttpsError('unavailable', `공시 API 오류 (${res.status})`);
        }
        json = (await res.json());
    }
    catch (err) {
        if (err instanceof HttpsError)
            throw err;
        logger.error('공시 API 호출 실패', err);
        throw new HttpsError('unavailable', '공시 API 호출 실패');
    }
    const rc = json.response?.header?.resultCode;
    if (rc !== '0' && rc !== '00') {
        logger.error('공시 API 비정상 응답', json.response?.header);
        throw new HttpsError('internal', `공시 API: ${json.response?.header?.resultMsg ?? 'unknown'}`);
    }
    const rawItems = json.response?.body?.items?.item;
    const arr = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const hits = arr
        .map(normalize)
        .filter((h) => h.entrpsNm && h.operYn); // 운영 중만
    return {
        ok: true,
        count: hits.length,
        totalCount: json.response?.body?.totalCount ?? hits.length,
        hits,
    };
});
/**
 * 단일 업체의 공시 스냅샷을 가져온다 (업체명 정확일치 first hit).
 * - 회원가입 확정 시 publicProfile 생성에 사용
 * - 야간 sync 함수에서도 재사용
 */
export async function fetchBrokerByName(entrpsNm) {
    const key = process.env.DATA_GO_KR_KEY;
    if (!key)
        throw new Error('DATA_GO_KR_KEY 미설정');
    const qs = new URLSearchParams({
        serviceKey: key,
        pageNo: '1',
        numOfRows: '20',
        type: 'json',
        entrpsNm,
    });
    const res = await fetch(`${BASE}?${qs.toString()}`, {
        headers: { Accept: 'application/json' },
    });
    if (!res.ok)
        return null;
    const json = (await res.json());
    const rawItems = json.response?.body?.items?.item;
    const arr = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const exact = arr.find((r) => r.entrpsNm?.trim() === entrpsNm.trim());
    const hit = exact ?? arr[0];
    return hit ? normalize(hit) : null;
}
