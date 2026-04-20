#!/usr/bin/env node
/**
 * 국제결혼중개업 전수 수집 + 필터 파라미터 동작 확인.
 */
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) { console.error('DATA_GO_KR_KEY 누락'); process.exit(1); }
const BASE = 'https://apis.data.go.kr/1383000/gmis/instMrgBrkpgServiceV2/getInstMrgBrkpgListV2';

async function fetchPage(pageNo, extra = {}) {
  const q = new URLSearchParams({
    serviceKey: KEY,
    pageNo: String(pageNo),
    numOfRows: '100',
    type: 'json',
    ...extra,
  });
  const res = await fetch(`${BASE}?${q}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then(t => t.slice(0,100))}`);
  return res.json();
}

// 1) 전수 수집
console.log('=== 전수 수집 ===');
const all = [];
for (let p = 1; p <= 5; p++) {
  const j = await fetchPage(p);
  const items = j.response?.body?.items?.item ?? [];
  const total = j.response?.body?.totalCount ?? 0;
  all.push(...items);
  console.log(`page ${p}: ${items.length}건 누적 ${all.length}/${total}`);
  if (all.length >= total) break;
}
console.log(`최종 ${all.length}건`);

// 2) 필드별 통계
const operYnStats = {};
const ctpvStats = {};
let withDsps = 0;
let withBizEnd = 0;
let withRegNo = 0;
let withPhone = 0;
for (const it of all) {
  operYnStats[it.operYn || '_'] = (operYnStats[it.operYn || '_'] ?? 0) + 1;
  ctpvStats[it.ctpvNm || '_'] = (ctpvStats[it.ctpvNm || '_'] ?? 0) + 1;
  if (it.dspsCn) withDsps++;
  if (it.bizEndYmd) withBizEnd++;
  if (it.mrbrkRno) withRegNo++;
  if (it.rprsTelno) withPhone++;
}
console.log('\noperYn 분포:', operYnStats);
console.log('시도별 분포:', ctpvStats);
console.log(`\n처분 이력 있음 (dspsCn 비어있지 않음): ${withDsps}건`);
console.log(`사업 종료 기록 (bizEndYmd): ${withBizEnd}건`);
console.log(`결혼중개업 등록번호 기록 (mrbrkRno): ${withRegNo}건`);
console.log(`전화번호 공개: ${withPhone}건`);

// 3) 처분 이력 있는 케이스 샘플 3건
if (withDsps > 0) {
  console.log('\n=== 처분 이력 샘플 ===');
  const sampled = all.filter(i => i.dspsCn).slice(0, 3);
  for (const s of sampled) {
    console.log(`- ${s.entrpsNm} (${s.ctpvNm} ${s.sggNm})`);
    console.log(`  처분일: ${s.dspsYmd} / 내용: ${s.dspsCn}`);
  }
}

// 4) 필터 파라미터 동작 확인
console.log('\n=== 필터 동작 확인 ===');
async function probeFilter(name, extra) {
  try {
    const j = await fetchPage(1, extra);
    const total = j.response?.body?.totalCount ?? 0;
    const sample = j.response?.body?.items?.item?.[0];
    console.log(`[${name}] total=${total}, first=${sample?.entrpsNm ?? '—'} (${sample?.ctpvNm ?? ''} ${sample?.sggNm ?? ''})`);
  } catch (e) {
    console.log(`[${name}] ERR: ${e.message}`);
  }
}
await probeFilter('entrpsNm=결혼', { entrpsNm: '결혼' });
await probeFilter('ctpvNm=부산', { ctpvNm: '부산' });
await probeFilter('sggNm=연제구', { sggNm: '연제구' });
await probeFilter('operYn=N', { operYn: 'N' });
await probeFilter('mrbrkRno=<첫업체>', all[0]?.mrbrkRno ? { mrbrkRno: all[0].mrbrkRno } : {});

// 5) 부산 연제구(창희변호사 소재지) 업체 리스트
console.log('\n=== 부산 연제구 업체 ===');
const busan = all.filter(i => i.ctpvNm === '부산' && i.sggNm === '연제구');
console.log(`${busan.length}건:`);
busan.forEach(b => console.log(`  - ${b.entrpsNm} (${b.rprsvNm}) 등록일 ${b.mrbrkRegYmd}`));
