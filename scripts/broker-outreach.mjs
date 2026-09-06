// 국제결혼중개업체 명부를 "먼저 전화할 순서"로 정렬해 CSV로 뽑는다
//
// 손님이 437곳뿐인 시장이다. 광고로 월 20회 검색을 사는 것보다 명부를 열고 거는 편이 빠르다.
// 근거와 문안은 docs/업체-영업계획-2026-09-06.md.
//
// 쓰는 법
//   node scripts/broker-outreach.mjs               화면에 요약
//   node scripts/broker-outreach.mjs --csv         data/outreach-list.csv 로 저장
//
// ⚠ 이 파일이 만드는 목록에는 사업자의 상호·대표자·전화번호가 들어 있다.
//   공시 자료라 공개된 정보이지만, 저장소 밖으로 내보내거나 제3자에게 넘기지 말 것.

import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'data/international_marriage_brokers_2026-07.csv'
const OUT = 'data/outreach-list.csv'

/** 아주 단순한 CSV 파서 — 따옴표 안의 쉼표만 지켜 주면 된다 */
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (ch !== '\r') cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const head = rows.shift().map((h) => h.replace(/^﻿/, ''))
  return rows.filter((r) => r.length === head.length)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

const has = (v) => Boolean(v && v.trim() && v.trim() !== '-')
const isMobile = (v) => /^01[016789]/.test((v || '').replace(/-/g, ''))
// 공시 PDF를 옮기는 과정에서 칸이 밀린 행이 있다. 전화 칸에 주소나 URL이 들어온다.
// 그대로 걸면 엉뚱한 곳에 전화한다. 전화처럼 생긴 것만 전화로 인정한다.
const isPhone = (v) => /^0\d{1,2}[-)]?\d{3,4}-?\d{4}$/.test((v || '').trim().replace(/\s/g, ''))

const all = parseCsv(readFileSync(SRC, 'utf-8'))
const live = all.filter((r) => r['공시행_구분'] === '공식집계업체' && r['영업상태_분류'] === '영업')

// 가까운 곳부터. 사무소가 부산이라 직접 만나 사례를 만들 수 있다.
const NEAR = new Set(['부산', '경남', '울산'])

function score(r) {
  let s = 0
  const why = []
  if (has(r['처분내용'])) { s += 5; why.push('처분 이력') }
  if (NEAR.has(r['공시시도'])) { s += 3; why.push('직접 방문 가능') }
  if (!has(r['인터넷_홈페이지'])) { s += 2; why.push('홈페이지 없음') }
  if ((r['신고등록일_ISO'] || '') >= '2024-01-01') { s += 2; why.push('신규 등록') }
  if (isMobile(r['전화번호'])) { s += 1; why.push('휴대폰') }
  return { s, why }
}

/** 그 업체에 무엇부터 말할 것인가. 하나만 고른다 — 여러 개를 늘어놓으면 아무것도 안 남는다 */
function opener(r) {
  if (has(r['처분내용'])) return '기한 관리'
  if ((r['신고등록일_ISO'] || '') >= '2024-01-01') return '무엇을 언제'
  if (!has(r['인터넷_홈페이지'])) return '홈페이지'
  return '접수 위젯'
}

const rows = live
  .map((r) => {
    const { s, why } = score(r)
    return {
      우선순위: s,
      첫마디: opener(r),
      고른이유: why.join(' · '),
      시도: r['공시시도'],
      시군구: r['시군구명'],
      상호명: r['상호명'],
      대표자: r['대표자성명_법인명'],
      전화번호: r['전화번호'],
      번호종류: isMobile(r['전화번호']) ? '휴대폰' : isPhone(r['전화번호']) ? '유선·대표' : '없음',
      홈페이지: has(r['인터넷_홈페이지']) ? r['인터넷_홈페이지']
        : /^https?:|^www\./.test((r['전화번호'] || '').trim()) ? r['전화번호'] : '',
      등록일: r['신고등록일_ISO'],
      처분내용: r['처분내용'],
      주소: r['소재지_도로명주소'],
    }
  })
  .filter((r) => r.번호종류 !== '없음')
  .sort((a, b) => b.우선순위 - a.우선순위 || a.시도.localeCompare(b.시도))

if (process.argv.includes('--csv')) {
  const head = Object.keys(rows[0])
  const esc = (v) => (/[",\n]/.test(v ?? '') ? `"${String(v).replace(/"/g, '""')}"` : (v ?? ''))
  writeFileSync(OUT, '﻿' + [head.join(','), ...rows.map((r) => head.map((h) => esc(r[h])).join(','))].join('\n'), 'utf-8')
  console.log(`${OUT} 저장 — ${rows.length}곳`)
}

const noPhone = live.filter((r) => !isPhone(r['전화번호']))
const byOpener = {}
for (const r of rows) byOpener[r.첫마디] = (byOpener[r.첫마디] ?? 0) + 1
console.log(`전화 가능한 곳 ${rows.length}곳 (영업 중 ${live.length}곳 중)`)
console.log(`전화가 없거나 칸이 밀린 곳 ${noPhone.length}곳 — 주소가 있으니 우편으로 간다`)
console.log('\n첫마디별')
for (const [k, v] of Object.entries(byOpener).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(10)}${v}곳`)
console.log('\n먼저 걸 20곳')
console.log(`${'점'.padStart(3)}  ${'첫마디'.padEnd(10)}${'지역'.padEnd(10)}${'상호'.padEnd(24)}전화`)
for (const r of rows.slice(0, 20))
  console.log(`${String(r.우선순위).padStart(3)}  ${r.첫마디.padEnd(10)}${(r.시도 + ' ' + r.시군구).padEnd(10)}${r.상호명.slice(0, 22).padEnd(24)}${r.전화번호}`)
