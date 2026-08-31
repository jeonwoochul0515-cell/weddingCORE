#!/usr/bin/env node
// 시연용 표본 데이터를 운영 DB에 넣고, 시연이 끝나면 지우는 스크립트
//
// 왜 필요한가. 고객이 한 명뿐이고 그 고객도 1단계라 화면을 열면 잠긴 항목만 보인다.
// "쓰면 이렇게 된다"를 보여주려면 진행 중인 고객이 있어야 한다.
//
// 넣는 것은 전부 isDemoSeed: true 로 표시한다. 원래 있던 데이터는 건드리지 않는다.
//
// 실행 (firebase-admin 이 functions/ 에만 있어 그 폴더에서 돌린다)
//   넣기:  cd functions && node ../scripts/seedDemo.mjs
//   지우기: cd functions && node ../scripts/seedDemo.mjs --clean

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const AGENCY_ID = 'ag_nNCb6fthhdX6'; // 우리 결혼중개사무소
const STAFF_UID = 'nNCb6fthhdX6ZZHSWU1AIv4qSTE3';
const CLEAN = process.argv.includes('--clean');

initializeApp({ credential: applicationDefault(), projectId: 'sungpan2026' });
const db = getFirestore('(default)');

const ago = (days) => Timestamp.fromDate(new Date(Date.now() - days * 86400000));
const ymd = (y, m, d) => Timestamp.fromDate(new Date(Date.UTC(y, m - 1, d)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function* chunks(total, step) {
  for (let i = 0; i < total; i += step) yield i;
}

// 단계가 서로 달라야 "진행되는 모습"이 보인다.
const CLIENTS = [
  {
    stage: 3,
    note: '베트남 · 맞선 완료, 서류 준비 중',
    korean: {
      name: '김민수',
      birthDate: ymd(1985, 4, 12),
      gender: 'M',
      nationalIdMasked: '850412-1******',
      phone: '010-2841-5590',
      address: '부산광역시 사상구 광장로 15',
      maritalHistory: 'single',
      incomeAnnual: 38400000,
      occupation: '기계설비 기사',
    },
    docs: ['contract', 'background_info', 'income_proof', 'marital_cert'],
  },
  {
    stage: 5,
    note: '필리핀 · 혼인신고 완료, 비자 신청 준비',
    korean: {
      name: '박정호',
      birthDate: ymd(1979, 11, 3),
      gender: 'M',
      nationalIdMasked: '791103-1******',
      phone: '010-9330-2277',
      address: '경상남도 김해시 분성로 221',
      maritalHistory: 'divorced',
      incomeAnnual: 52700000,
      occupation: '자영업',
    },
    docs: [
      'contract',
      'background_info',
      'rights_notice',
      'income_proof',
      'criminal_record',
      'health_cert',
      'passport',
    ],
  },
  {
    stage: 1,
    note: '신규 상담 · 계약 직후',
    korean: {
      name: '이영훈',
      birthDate: ymd(1990, 7, 25),
      gender: 'M',
      nationalIdMasked: '900725-1******',
      phone: '010-5512-8834',
      address: '부산광역시 북구 만덕대로 78',
      maritalHistory: 'single',
      incomeAnnual: 31200000,
      occupation: '물류센터 관리직',
    },
    docs: ['contract'],
  },
];

const DOC_LABEL = {
  contract: '결혼중개 계약서',
  background_info: '신상정보 확인서',
  rights_notice: '권리·의무 안내 확인서',
  criminal_record: '범죄경력 회보서',
  health_cert: '건강진단서',
  income_proof: '소득금액증명',
  marital_cert: '혼인관계증명서',
  passport: '여권 사본',
};

async function deleteAll(path) {
  const items = await db.collection(path).get();
  for (const start of chunks(items.docs.length, 400)) {
    const batch = db.batch();
    for (const d of items.docs.slice(start, start + 400)) batch.delete(d.ref);
    await batch.commit();
  }
  return items.size;
}

async function clean() {
  const seeded = await db
    .collection(`agencies/${AGENCY_ID}/clients`)
    .where('isDemoSeed', '==', true)
    .get();
  console.log(`표본 고객 ${seeded.size}명을 지웁니다.`);
  for (const c of seeded.docs) {
    for (const sub of ['timeline', 'documents', 'obligations']) {
      await deleteAll(`${c.ref.path}/${sub}`);
    }
    await c.ref.delete();
    console.log(`  지움: ${c.data().koreanClient?.name ?? c.id}`);
  }
  const jobs = await db
    .collection(`agencies/${AGENCY_ID}/automationJobs`)
    .where('isDemoSeed', '==', true)
    .get();
  for (const j of jobs.docs) await j.ref.delete();
  console.log(`표본 자동화 작업 ${jobs.size}건을 지웠습니다.`);
  console.log('원래 있던 고객과 데이터는 그대로입니다.');
}

async function seed() {
  const created = [];
  for (const spec of CLIENTS) {
    const ref = db.collection(`agencies/${AGENCY_ID}/clients`).doc();
    await ref.set({
      clientId: ref.id,
      agencyId: AGENCY_ID,
      koreanClient: spec.korean,
      profile: null,
      birthInfo: null,
      assignedStaffUid: STAFF_UID,
      currentStage: 1, // 전개 트리거가 1단계를 기준으로 만든다. 뒤에서 올린다.
      overallProgress: 0,
      status: 'active',
      isDemoSeed: true,
      createdAt: ago(spec.stage === 1 ? 2 : spec.stage * 24),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created.push({ ...spec, ref });
    console.log(`고객 생성: ${spec.korean.name} — ${spec.note}`);
  }

  console.log('\n의무 전개(onClientCreated)를 기다립니다...');
  for (let i = 0; i < 24; i += 1) {
    await sleep(2500);
    const counts = await Promise.all(
      created.map(async (c) => (await db.collection(`${c.ref.path}/timeline`).count().get()).data().count),
    );
    process.stdout.write(`  전개 상황: ${counts.join(' / ')}   \r`);
    if (counts.every((n) => n > 0)) break;
  }
  console.log('');

  for (const c of created) {
    const items = await db.collection(`${c.ref.path}/timeline`).get();
    if (items.empty) {
      console.log(`  ! ${c.korean.name}: 의무가 전개되지 않았습니다. 함수 로그를 확인하세요.`);
      continue;
    }
    let done = 0;
    let pending = 0;
    let warn = 0;
    for (const start of chunks(items.docs.length, 400)) {
      const batch = db.batch();
      for (const d of items.docs.slice(start, start + 400)) {
        const stage = d.data().stage ?? 1;
        let status;
        if (stage < c.stage) {
          status = 'done';
          done += 1;
        } else if (stage === c.stage) {
          // 진행 중인 단계는 섞어 둔다 — 끝난 것도 남은 것도 보여야 한다.
          if ((pending + warn) % 3 === 0) {
            status = 'warning';
            warn += 1;
          } else {
            status = 'pending';
            pending += 1;
          }
        } else {
          status = 'blocked';
        }
        batch.update(d.ref, {
          status,
          ...(status === 'done' ? { completedAt: ago(3), completedBy: STAFF_UID } : {}),
          ...(status === 'warning'
            ? { warningReason: '기한이 일주일 안으로 다가왔습니다.' }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
    console.log(`  ${c.korean.name}: 완료 ${done} · 진행 ${pending} · 주의 ${warn}`);

    const docBatch = db.batch();
    for (const type of c.docs) {
      const dref = db.collection(`${c.ref.path}/documents`).doc();
      docBatch.set(dref, {
        docId: dref.id,
        agencyId: AGENCY_ID,
        type,
        subject: 'korean',
        storageUrl: '',
        fileName: `${DOC_LABEL[type] ?? type}.pdf`,
        mimeType: 'application/pdf',
        issuedAt: ago(30),
        validUntil: null,
        ocrExtracted: null,
        uploadedBy: STAFF_UID,
        uploadedAt: ago(20),
        replaces: null,
        isDemoSeed: true,
      });
    }
    await docBatch.commit();
    console.log(`     서류 ${c.docs.length}건`);

    // 진행률은 화면(TimelineView)이 완료 비율로 다시 계산한다. 저장값을 따로 정하면
    // 목록(46%)과 상세(27%)가 다르게 보인다. 실제 완료 수로 맞춰 둔다.
    await c.ref.update({
      currentStage: c.stage,
      overallProgress: Math.round((done / items.size) * 100),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

if (CLEAN) {
  await clean();
} else {
  await seed();
  // 캐럿이 비어 있으면 화면에 "—" 가 나온다. 시연 전에 숫자가 보이게 둔다.
  const now = new Date();
  await db.doc(`agencies/${AGENCY_ID}`).set(
    {
      aiCredits: {
        monthlyAllowance: 20,
        used: 0,
        purchased: 80,
        resetAt: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
      },
    },
    { merge: true },
  );
  console.log('\n캐럿을 설정했습니다 — 월 무료 20 · 충전 80.');
  console.log('시연 후 정리: cd functions && node ../scripts/seedDemo.mjs --clean');
}
process.exit(0);
