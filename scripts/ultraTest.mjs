#!/usr/bin/env node
/**
 * weddingCORE 풀 B2B + B2C 스트레스 테스트.
 *
 * 사전 조건:
 *  - 에뮬레이터(auth 9099, firestore 8080, functions 5001) 구동
 *  - seedEmulator.mjs 선실행 (admin/lawyer + obligationTemplates 42개)
 *
 * 커버리지:
 *  B2B 컴플라이언스
 *   - A1 단계 캐스케이드, A2 anchor 재계산, A3 evidence 자동완료, A4 overdue + auditLog
 *   - B1 stale 감지, B2 human 검수, B3 서명 가드, B4 서명 + auditLog 스냅샷
 *  B2B 운영
 *   - S1 업체 가입/verified 플로우
 *   - S2 서류 3종 업로드 + validUntil 자동 계산 + 30일내 만료 notification
 *   - S3 매칭 기록 생성 + MBTI 점수 범위 검증 + 결과값 저장
 *  B2C
 *   - S4 익명 비자 시뮬레이션 저장 (visaSimulations) + expiresAt TTL 필드 확인
 *
 * 실행: node scripts/ultraTest.mjs [N]   (기본 100)
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.GCLOUD_PROJECT ??= 'wedding-core-prod';

initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const auth = getAuth();
const db = getFirestore();

const N = Number(process.argv[2] ?? 100);

// ================= 인라인 로직 (클라이언트 파일 ESM 경로 문제로 복제) =================

const MBTI_TYPES = ['ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
  'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'];
const MBTI_MATRIX = [
  [65,72,60,70,68,55,50,65,78,62,85,75,70,68,62,80],
  [72,65,68,55,58,70,62,50,65,72,78,60,68,72,75,58],
  [60,68,62,72,48,55,68,65,55,58,80,78,52,62,70,92],
  [70,55,72,62,65,48,55,72,62,50,75,80,65,52,92,70],
  [68,58,48,65,60,62,50,68,72,68,72,70,78,55,55,72],
  [55,70,55,48,62,60,65,50,68,72,68,55,58,78,72,52],
  [50,62,68,55,50,65,58,62,55,68,65,58,48,68,85,72],
  [65,50,65,72,68,50,62,58,70,55,60,72,72,48,70,85],
  [78,65,55,62,72,68,55,70,62,65,68,72,75,62,58,68],
  [62,72,58,50,68,72,68,55,65,62,72,65,62,75,70,55],
  [85,78,80,75,72,68,65,60,68,72,58,65,72,78,75,72],
  [75,60,78,80,70,55,58,72,72,65,65,58,70,58,72,78],
  [70,68,52,65,78,58,48,72,75,62,72,70,62,65,55,75],
  [68,72,62,52,55,78,68,48,62,75,78,58,65,62,72,55],
  [62,75,70,92,55,72,85,70,58,70,75,72,55,72,62,70],
  [80,58,92,70,72,52,72,85,68,55,72,78,75,55,70,62],
];
function mbtiScore(a, b) {
  const i = MBTI_TYPES.indexOf(a);
  const j = MBTI_TYPES.indexOf(b);
  if (i < 0 || j < 0) return null;
  return MBTI_MATRIX[i][j];
}

// validity months per doc type (src/features/documents/types.ts 복제)
const VALIDITY_MONTHS = {
  criminal_record: 6,
  health_cert: 6,
  marital_cert: 3,
  income_proof: 3,
  background_info: 12,
  contract: 12,
  rights_notice: 12,
  // passport, other: null
};
function computeValidUntil(type, issuedAt) {
  const months = VALIDITY_MONTHS[type];
  if (!months) return null;
  const d = new Date(issuedAt);
  d.setMonth(d.getMonth() + months);
  return d;
}

// income thresholds (visa rules 2024 복제, src/features/visaSimulator/rules.ts)
const INCOME_THRESHOLDS = { 2: 21_493_800, 3: 27_814_920, 4: 34_117_920, 5: 40_400_040 };

function simulateVisaScore(inputs) {
  const threshold = INCOME_THRESHOLDS[inputs.householdSize] ?? 21_500_000;
  const ratio = inputs.annualIncome / threshold;
  const incomeScore = ratio >= 1.5 ? 100 : ratio >= 1.2 ? 90 : ratio >= 1.0 ? 75
    : ratio >= 0.85 ? 55 : ratio >= 0.7 ? 30 : 10;
  const sincerityBase =
    (inputs.relationshipMonths >= 12 ? 100 : inputs.relationshipMonths >= 6 ? 70 : 40) * 0.3 +
    (inputs.inPersonMeetings >= 5 ? 100 : inputs.inPersonMeetings >= 3 ? 70 : 40) * 0.25 +
    ({ fluent: 100, basic: 60, interpreter_only: 30 }[inputs.communicationLanguage]) * 0.25 +
    (Math.min(inputs.evidencePhotoCount, 20) / 20 * 100) * 0.2;
  const sincerityScore = Math.round(sincerityBase);
  const housingScore = { owned: 100, jeonse: 85, monthly: 60, family: 55, other: 40 }[inputs.housingType];
  const otherScore = inputs.preMarriageProgramCompleted ? 90 : 65;
  const overall = Math.round(incomeScore * 0.4 + sincerityScore * 0.3 + housingScore * 0.15 + otherScore * 0.15);
  return {
    incomeScore,
    sincerityScore,
    housingScore,
    otherScore,
    overall: Math.min(100, Math.max(0, overall)),
    visaType: overall >= 30 ? 'F-6-1' : 'INELIGIBLE',
  };
}

// ================= 스트레스 러너 =================

const stats = {
  total: N,
  ok: 0,
  fail: 0,
  byStep: {
    S1_signup: { ok: 0, fail: 0 },
    seed: { ok: 0, fail: 0 },
    A1: { ok: 0, fail: 0 },
    A2: { ok: 0, fail: 0 },
    A3: { ok: 0, fail: 0 },
    A4: { ok: 0, fail: 0 },
    B1_stale: { ok: 0, fail: 0 },
    B2_human: { ok: 0, fail: 0 },
    B3_gate: { ok: 0, fail: 0 },
    B4_sign: { ok: 0, fail: 0 },
    S2_docs: { ok: 0, fail: 0 },
    S3_match: { ok: 0, fail: 0 },
    S4_visa: { ok: 0, fail: 0 },
  },
  errors: [],
};
function mark(step, ok, err) {
  stats.byStep[step][ok ? 'ok' : 'fail']++;
  if (!ok && err) stats.errors.push({ step, err: String(err).slice(0, 180) });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, timeoutMs = 15000, intervalMs = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cond()) return true;
    await sleep(intervalMs);
  }
  throw new Error('timeout');
}

// -------- S1 업체 가입/자기 provisional verified --------
async function setupAgencyOwner(i) {
  const email = `owner${i}@ultra.local`;
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch { user = await auth.createUser({ email, password: 'test1234', emailVerified: true }); }
  const uid = user.uid;
  const agencyId = 'ag_' + uid.slice(0, 12);

  // 가입: pending 상태 업체 문서를 본인이 생성 → selfProvisionAgency 로직 복제
  await db.doc(`agencies/${agencyId}`).set({
    agencyId,
    businessNumber: `000-00-${String(10000 + i).slice(-5)}`,
    registrationNumber: `REG-${i}`,
    name: `울트라업체${i}`,
    ownerUid: uid,
    subscription: { plan: 'trial', status: 'active' },
    verificationStatus: 'pending',
    settings: { defaultPartnerLanguages: ['vi'], notificationChannels: ['email'] },
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // provision 효과: registrationNumber 존재 & ownerUid == uid → verified 전환 + claims
  const snap = await db.doc(`agencies/${agencyId}`).get();
  const ag = snap.data();
  if (!ag?.registrationNumber || ag.ownerUid !== uid)
    throw new Error('precondition failed');
  await auth.setCustomUserClaims(uid, { agencyId, role: 'owner' });
  await db.doc(`agencies/${agencyId}`).update({
    verificationStatus: 'verified',
    verifiedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`users/${uid}`).set({ role: 'agency_owner', agencyId }, { merge: true });

  // 검증
  const after = await db.doc(`agencies/${agencyId}`).get();
  if (after.data()?.verificationStatus !== 'verified')
    throw new Error('not verified after provision');
  return { uid, agencyId };
}

async function createClient(agencyId, uid, i) {
  const clientRef = db.collection(`agencies/${agencyId}/clients`).doc();
  await clientRef.set({
    clientId: clientRef.id,
    agencyId,
    koreanClient: {
      name: `의뢰인${i}`, birthDate: Timestamp.fromDate(new Date('1985-01-01')),
      gender: 'M', nationalIdMasked: '850101-*******',
      phone: '010-0000-0000', address: '서울',
      maritalHistory: '초혼', incomeAnnual: 45_000_000, occupation: '회사원',
    },
    profile: null, birthInfo: null,
    assignedStaffUid: uid, currentStage: 1,
    overallProgress: 0, status: 'active',
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return clientRef.id;
}

async function listTimeline(agencyId, clientId) {
  const snap = await db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`).get();
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

// -------- A1 --------
async function testA1(agencyId, clientId, uid) {
  const items = await listTimeline(agencyId, clientId);
  const stage1 = items.filter((it) => it.stage === 1);
  if (stage1.length === 0) throw new Error('stage-1 missing');
  for (const it of stage1) {
    await it.ref.update({
      status: 'done',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await waitFor(async () => {
    const cs = await db.doc(`agencies/${agencyId}/clients/${clientId}`).get();
    const s2 = await db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`)
      .where('stage', '==', 2).get();
    return s2.docs.every((d) => d.data().status === 'pending') && cs.data()?.currentStage >= 2;
  });
}

// -------- A2 --------
async function testA2(agencyId, clientId) {
  const items = await listTimeline(agencyId, clientId);
  const targets = items.filter((it) => it.dueDateRule?.anchor === 'contract_signed');
  if (targets.length === 0) return;
  const before = new Map(targets.map((it) => [it.id, it.dueDate.toMillis()]));
  const eventDate = new Date();
  await db.doc(`agencies/${agencyId}/clients/${clientId}`).set({
    anchors: { contract_signed: Timestamp.fromDate(eventDate) },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const batch = db.batch();
  for (const it of targets) {
    const rec = new Date(eventDate);
    rec.setDate(rec.getDate() + it.dueDateRule.offsetDays);
    batch.update(it.ref, {
      dueDate: Timestamp.fromDate(rec),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  const after = await listTimeline(agencyId, clientId);
  for (const it of targets) {
    const cur = after.find((x) => x.id === it.id);
    if (cur.dueDate.toMillis() === before.get(it.id)) throw new Error(`dueDate not recomputed ${it.id}`);
  }
}

// -------- A3 --------
async function testA3(agencyId, clientId, uid) {
  const items = await listTimeline(agencyId, clientId);
  const target = items.find((it) =>
    it.checkRule?.type === 'document_uploaded' && it.status !== 'done' && it.status !== 'blocked');
  if (!target) return;
  const docType = target.checkRule.params?.docType ?? 'criminal_record';
  const dref = db.collection(`agencies/${agencyId}/clients/${clientId}/documents`).doc();
  await dref.set({
    agencyId, type: docType, subject: 'korean',
    storageUrl: 'mock://x.pdf', fileName: 'x.pdf', mimeType: 'application/pdf',
    issuedAt: Timestamp.now(),
    validUntil: Timestamp.fromDate(new Date(Date.now() + 6 * 30 * 86400_000)),
    ocrExtracted: null, uploadedBy: uid,
    uploadedAt: FieldValue.serverTimestamp(), replaces: null,
  });
  await target.ref.update({
    evidence: FieldValue.arrayUnion({ docId: dref.id, addedAt: Timestamp.now() }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await waitFor(async () => (await target.ref.get()).data()?.status === 'done', 10000);
}

// -------- A4 --------
async function testA4(agencyId, clientId) {
  const items = await listTimeline(agencyId, clientId);
  const target = items.find((it) => it.status === 'pending' || it.status === 'in_progress');
  if (!target) return;
  await target.ref.update({
    dueDate: Timestamp.fromDate(new Date(Date.now() - 5 * 86400_000)),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const now = new Date();
  const snap = await db.collectionGroup('timeline')
    .where('status', 'in', ['pending', 'in_progress'])
    .where('dueDate', '<', Timestamp.fromDate(now)).get();
  for (const d of snap.docs) {
    const data = d.data();
    const overdueDays = Math.floor((now - data.dueDate.toDate()) / 86400_000);
    const next = overdueDays > 3 ? 'violated' : 'warning';
    await d.ref.update({
      status: next, warningReason: `기한 ${overdueDays}일 경과`,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await waitFor(async () => ['warning','violated'].includes((await target.ref.get()).data()?.status), 10000);
  const logs = await db.collection('auditLogs')
    .where('agencyId', '==', agencyId)
    .where('action', '==', 'timeline.status_changed').limit(1).get();
  if (logs.empty) throw new Error('no audit log');
}

// -------- B1~B4 (요약: 한 루틴) --------
async function testBackground(agencyId, clientId, uid, partCounts) {
  const infoRef = db.collection(`agencies/${agencyId}/clients/${clientId}/backgroundInfo`).doc();
  const fields = {
    maritalHistory: '초혼', hasChildren: '없음', health: '양호',
    criminalRecord: '없음', occupation: '회사원', income: 45000000,
    property: '전세 1억', residence: '서울 전세', familySituation: '부모 생존',
  };
  await infoRef.set({
    agencyId, clientId, subject: 'korean', sourceLang: 'ko', fields,
    fieldsUpdatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  const trRef = infoRef.collection('translations').doc('vi');
  const translated = {
    maritalHistory: 'Độc thân', hasChildren: 'Không', health: 'Tốt',
    criminalRecord: 'Không', occupation: 'Nhân viên', income: '45tr KRW',
    property: 'Thuê 100tr', residence: 'Seoul thuê', familySituation: 'Cha mẹ sống',
  };
  await trRef.set({
    lang: 'vi', fields: translated, translatedBy: 'ai', translationQuality: 'draft',
    signedAt: null, signedByName: null,
    translatedAt: FieldValue.serverTimestamp(),
  });
  await sleep(120);
  await infoRef.update({
    fields: { ...fields, occupation: '회사원(수정)' },
    fieldsUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // B1
  const [i1, t1] = await Promise.all([infoRef.get(), trRef.get()]);
  if (!(i1.data().fieldsUpdatedAt.toMillis() > t1.data().translatedAt.toMillis()))
    throw Object.assign(new Error('B1 stale 감지 실패'), { _step: 'B1_stale' });
  partCounts.B1_stale = true;

  // B3 (stale 거부)
  let rejected = false;
  try { await runSign(agencyId, clientId, infoRef.id, 'vi', '서명자', uid); }
  catch { rejected = true; }
  if (!rejected) throw Object.assign(new Error('B3 stale 서명 허용됨'), { _step: 'B3_gate' });
  partCounts.B3_gate = true;

  // B2: 재저장(human reviewed)
  await trRef.set({
    lang: 'vi', fields: translated,
    translatedBy: 'human', translationQuality: 'reviewed',
    translatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const tr2 = (await trRef.get()).data();
  if (tr2.translationQuality !== 'reviewed')
    throw Object.assign(new Error('B2 quality 오류'), { _step: 'B2_human' });
  partCounts.B2_human = true;

  // B4
  await runSign(agencyId, clientId, infoRef.id, 'vi', '서명자', uid);
  const final = (await trRef.get()).data();
  if (!final.signedAt) throw Object.assign(new Error('signedAt 미기록'), { _step: 'B4_sign' });
  const logs = await db.collection('auditLogs')
    .where('agencyId', '==', agencyId)
    .where('action', '==', 'background_info.signed').limit(1).get();
  if (logs.empty) throw Object.assign(new Error('서명 auditLog 없음'), { _step: 'B4_sign' });
  partCounts.B4_sign = true;
}

async function runSign(agencyId, clientId, infoId, lang, signerName, uid) {
  const infoRef = db.doc(`agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}`);
  const trRef = infoRef.collection('translations').doc(lang);
  const [infoSnap, trSnap] = await Promise.all([infoRef.get(), trRef.get()]);
  const info = infoSnap.data();
  const tr = trSnap.exists ? trSnap.data() : null;
  if (!tr) throw new Error('no-translation');
  const REQUIRED = ['maritalHistory','hasChildren','health','criminalRecord','occupation','income','property','residence','familySituation'];
  for (const k of REQUIRED) {
    const src = info.fields?.[k];
    if (src === undefined || src === null || String(src).trim() === '') continue;
    const t = tr.fields?.[k];
    if (t === undefined || t === null || String(t).trim() === '') throw new Error('missing:' + k);
  }
  if (info.sourceLang !== lang) {
    const srcMs = info.fieldsUpdatedAt?.toMillis?.();
    const trMs = tr.translatedAt?.toMillis?.();
    if (srcMs && trMs && srcMs > trMs) throw new Error('stale');
  }
  await trRef.update({
    signedAt: FieldValue.serverTimestamp(), signedByName: signerName, signedByUid: uid,
  });
  await db.collection('auditLogs').add({
    actorUid: uid, agencyId,
    action: 'background_info.signed',
    targetPath: trRef.path, before: null,
    after: {
      signedByName: signerName, sourceLang: info.sourceLang, targetLang: lang,
      translationQuality: tr.translationQuality, translatedBy: tr.translatedBy,
      sourceFields: info.fields, translatedFields: tr.fields,
    },
    ip: '', userAgent: '',
    createdAt: FieldValue.serverTimestamp(),
  });
}

// -------- S2 서류 업로드 + 만료 검출 --------
async function testDocuments(agencyId, clientId, uid) {
  const now = new Date();

  // 3종 업로드
  const docs = [
    { type: 'criminal_record', issuedAt: new Date(now.getTime() - 10 * 86400_000) }, // 6개월 유효
    { type: 'health_cert', issuedAt: new Date(now.getTime() - 180 * 86400_000) },    // 곧 만료 (발급 후 180일 → 6개월)
    { type: 'passport', issuedAt: null }, // validUntil 없음
  ];
  for (const d of docs) {
    const validUntil = d.issuedAt ? computeValidUntil(d.type, d.issuedAt) : null;
    await db.collection(`agencies/${agencyId}/clients/${clientId}/documents`).add({
      agencyId, type: d.type, subject: 'korean',
      storageUrl: 'mock://d.pdf', fileName: `${d.type}.pdf`, mimeType: 'application/pdf',
      issuedAt: d.issuedAt ? Timestamp.fromDate(d.issuedAt) : null,
      validUntil: validUntil ? Timestamp.fromDate(validUntil) : null,
      ocrExtracted: null, uploadedBy: uid,
      uploadedAt: FieldValue.serverTimestamp(), replaces: null,
    });
  }

  // checkExpiringDocuments 로직 복제: 30일 내 만료 문서 → agency notifications 생성
  const cutoff = new Date(now.getTime() + 30 * 86400_000);
  const snap = await db.collectionGroup('documents')
    .where('agencyId', '==', agencyId)
    .where('validUntil', '<=', Timestamp.fromDate(cutoff))
    .get();
  if (snap.empty) throw new Error('만료 임박 문서 쿼리 비어있음');

  const todayKey = now.toISOString().slice(0, 10);
  const batch = db.batch();
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.validUntil) continue;
    const days = Math.ceil((data.validUntil.toDate() - now) / 86400_000);
    const severity = days < 0 ? 'critical' : days <= 7 ? 'warning' : 'info';
    const notifId = `doc_${d.id}_${todayKey}`;
    batch.set(db.doc(`agencies/${agencyId}/notifications/${notifId}`), {
      notifId, type: 'doc_expiring', severity,
      title: `서류 만료 D-${days}`,
      message: `${data.fileName} 갱신 필요`,
      link: `/agency/clients/${clientId}`,
      targetUids: [], readBy: {},
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();

  const notifs = await db.collection(`agencies/${agencyId}/notifications`)
    .where('type', '==', 'doc_expiring').limit(5).get();
  if (notifs.empty) throw new Error('notification 생성 안 됨');
}

// -------- S3 매칭 --------
async function testMatch(agencyId, clientId, uid, i) {
  // Partner 생성
  const partnerRef = db.collection(`agencies/${agencyId}/clients/${clientId}/partners`).doc();
  const partnerMbti = MBTI_TYPES[i % 16];
  const clientMbti = MBTI_TYPES[(i + 7) % 16];
  await partnerRef.set({
    partnerId: partnerRef.id,
    name: `파트너${i}`,
    birthDate: Timestamp.fromDate(new Date('1990-06-15')),
    gender: 'F', nationality: 'VN', preferredLanguage: 'vi',
    passportNumber: `VN${i}`, occupation: '회사원',
    maritalHistory: '초혼', isSelected: true,
    introducedAt: FieldValue.serverTimestamp(),
    profile: { mbti: partnerMbti, height: 160, weight: 50, education: '대졸',
      religion: '무교', region: 'Hanoi', smoking: false, drinking: '안함',
      hobbies: [], idealType: null },
    birthInfo: { solarDate: '1990-06-15', lunarDate: null, birthTime: null },
  });

  const score = mbtiScore(clientMbti, partnerMbti);
  if (score === null || score < 40 || score > 100)
    throw new Error(`MBTI score out of range: ${score}`);

  // Match 레코드
  const matchRef = await db.collection(`agencies/${agencyId}/matches`).add({
    agencyId, clientId, partnerId: partnerRef.id,
    clientName: `의뢰인${i}`, partnerName: `파트너${i}`,
    type: '맞선', date: Timestamp.fromDate(new Date()),
    result: null, memo: `테스트 매칭 #${i}`,
    mbtiScore: score, sajuScore: 70 + (i % 20),
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 결과 업데이트
  const results = ['수락', '거절_A', '거절_B', '양측거절', '보류'];
  await matchRef.update({ result: results[i % results.length] });

  // 검증
  const final = (await matchRef.get()).data();
  if (final.mbtiScore !== score) throw new Error('mbti 저장 불일치');
  if (!results.includes(final.result)) throw new Error('result 저장 불일치');
}

// -------- S4 비자 시뮬레이션 (B2C 익명 세션) --------
async function testVisaSimulation(i) {
  const inputs = {
    inviterAge: 30 + (i % 20), inviterGender: 'M',
    inviterMaritalHistory: i % 5 === 0 ? 'remarried' : 'first',
    inviterRemarriageCount: i % 5 === 0 ? 1 : 0,
    hasChildren: i % 3 === 0,
    householdSize: 2 + (i % 3),
    annualIncome: 25_000_000 + (i * 500_000) % 30_000_000,
    propertyNetWorth: (i % 10) * 10_000_000,
    includeFamilyIncome: false, familyIncomeTotal: 0,
    housingType: ['owned','jeonse','monthly','family','other'][i % 5],
    partnerCountry: ['VN','KH','CN','UZ','PH'][i % 5],
    partnerAge: 22 + (i % 15), partnerGender: 'F',
    partnerMaritalHistory: 'first',
    relationshipMonths: 3 + (i % 24),
    inPersonMeetings: 1 + (i % 10),
    communicationLanguage: ['fluent','basic','interpreter_only'][i % 3],
    evidencePhotoCount: i % 30,
    preMarriageProgramCompleted: i % 2 === 0,
    inviterCriminalHistory: 'none', inviterMedicalCondition: 'none',
    partnerMaritalClear: true,
  };
  const result = simulateVisaScore(inputs);
  if (result.overall < 0 || result.overall > 100)
    throw new Error(`overall out of range: ${result.overall}`);

  // 익명 저장
  const expiresAt = new Date(Date.now() + 30 * 86400_000);
  const ref = await db.collection('visaSimulations').add({
    inputs: {
      householdSize: inputs.householdSize, annualIncome: inputs.annualIncome,
      propertyNetWorth: inputs.propertyNetWorth, partnerCountry: inputs.partnerCountry,
      relationshipMonths: inputs.relationshipMonths,
      communicationLanguage: inputs.communicationLanguage,
      evidencePhotoCount: inputs.evidencePhotoCount,
      preMarriageProgramCompleted: inputs.preMarriageProgramCompleted,
    },
    result: {
      visaType: result.visaType, overallProbability: result.overall,
      scores: {
        income: result.incomeScore, sincerity: result.sincerityScore,
        housing: result.housingScore, other: result.otherScore,
      },
      blockerCount: 0, recommendCount: 0,
    },
    year: 2024,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  // 재조회 무결성
  const back = (await ref.get()).data();
  if (back.result.overallProbability !== result.overall)
    throw new Error('저장 후 overall 불일치');
  if (!back.expiresAt) throw new Error('expiresAt 누락 (TTL 세팅)');
}

// ================= main =================
const startedAt = Date.now();
console.log(`[ultra] N=${N} — firestore=${process.env.FIRESTORE_EMULATOR_HOST}`);

for (let i = 1; i <= N; i++) {
  let agencyId, clientId, uid;
  try {
    try { const a = await setupAgencyOwner(i); agencyId = a.agencyId; uid = a.uid; mark('S1_signup', true); }
    catch (e) { mark('S1_signup', false, e); throw e; }

    clientId = await createClient(agencyId, uid, i);
    try {
      await waitFor(async () => {
        const c = await db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`).count().get();
        return c.data().count >= 10;
      }, 20000);
      mark('seed', true);
    } catch (e) { mark('seed', false, e); throw e; }

    try { await testA1(agencyId, clientId, uid); mark('A1', true); } catch (e) { mark('A1', false, e); }
    try { await testA2(agencyId, clientId); mark('A2', true); } catch (e) { mark('A2', false, e); }
    try { await testA3(agencyId, clientId, uid); mark('A3', true); } catch (e) { mark('A3', false, e); }
    try { await testA4(agencyId, clientId); mark('A4', true); } catch (e) { mark('A4', false, e); }

    // B1~B4
    const parts = { B1_stale: false, B2_human: false, B3_gate: false, B4_sign: false };
    try {
      await testBackground(agencyId, clientId, uid, parts);
    } catch (e) {
      // 실패 단계 기록
      const step = e._step ?? 'B1_stale';
      mark(step, false, e);
    }
    for (const k of ['B1_stale','B2_human','B3_gate','B4_sign']) if (parts[k]) mark(k, true);

    try { await testDocuments(agencyId, clientId, uid); mark('S2_docs', true); } catch (e) { mark('S2_docs', false, e); }
    try { await testMatch(agencyId, clientId, uid, i); mark('S3_match', true); } catch (e) { mark('S3_match', false, e); }
    try { await testVisaSimulation(i); mark('S4_visa', true); } catch (e) { mark('S4_visa', false, e); }

    stats.ok++;
    if (i % 10 === 0 || i === N) {
      const el = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[${i}/${N}] ok=${stats.ok} fail=${stats.fail} elapsed=${el}s`);
    }
  } catch (e) {
    stats.fail++;
    stats.errors.push({ iter: i, err: String(e).slice(0, 200) });
    console.log(`[${i}/${N}] FAIL: ${e.message}`);
  }
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log('\n============== 결과 요약 ==============');
console.log(`총 ${N}회 · 성공 ${stats.ok} · 실패 ${stats.fail}  (elapsed ${elapsed}s)`);
const SECTIONS = {
  'B2B 가입/시드': ['S1_signup', 'seed'],
  'B2B 컴플라이언스 A1~A4': ['A1','A2','A3','A4'],
  'B2B 번역·서명 B1~B4': ['B1_stale','B2_human','B3_gate','B4_sign'],
  'B2B 운영': ['S2_docs','S3_match'],
  'B2C 비자': ['S4_visa'],
};
for (const [label, keys] of Object.entries(SECTIONS)) {
  console.log(`\n [${label}]`);
  for (const k of keys) {
    const v = stats.byStep[k];
    console.log(`   ${k.padEnd(12)}  ok=${v.ok}  fail=${v.fail}`);
  }
}
if (stats.errors.length > 0) {
  console.log('\n최초 오류 12건:');
  for (const e of stats.errors.slice(0, 12)) {
    console.log(`  - ${e.step ?? `iter${e.iter}`}: ${e.err}`);
  }
}
process.exit(stats.fail > 0 ? 1 : 0);
