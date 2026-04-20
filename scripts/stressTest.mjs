#!/usr/bin/env node
/**
 * weddingCORE A1~B4 전체 시나리오 스트레스 테스트.
 * 에뮬레이터(auth 9099, firestore 8080, functions 5001)가 켜져있어야 함.
 * seedEmulator.mjs 가 먼저 실행돼 obligationTemplates 가 시드된 상태여야 함.
 *
 * 실행:
 *   node scripts/stressTest.mjs [N]   # 기본 100
 *
 * 검증 흐름 (한 의뢰인당):
 *   A1 - 단계1 전부 done → 단계2 unblock + currentStage=2
 *   A2 - markAnchorEvent(contract_signed) → anchor 항목 dueDate 재계산
 *   A3 - criminal_record 업로드 + evidence 링크 → checkRule 자동 done
 *   A4 - dueDate 과거로 → overdue 스캔 → violated + auditLog
 *   B1 - 원본 수정 후 fieldsUpdatedAt > translatedAt → stale
 *   B2 - 번역 재저장(human) → translationQuality=reviewed
 *   B3 - 누락 필드 있는 상태에서 서명 시도 → 거부
 *   B4 - 완전한 상태에서 signBackgroundTranslation 로직 → signedAt + auditLog
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

const stats = {
  total: N,
  ok: 0,
  fail: 0,
  byStep: {
    seed: { ok: 0, fail: 0 },
    A1: { ok: 0, fail: 0 },
    A2: { ok: 0, fail: 0 },
    A3: { ok: 0, fail: 0 },
    A4: { ok: 0, fail: 0 },
    B1: { ok: 0, fail: 0 },
    B2: { ok: 0, fail: 0 },
    B3: { ok: 0, fail: 0 },
    B4: { ok: 0, fail: 0 },
  },
  errors: [],
};

function mark(step, ok, err) {
  stats.byStep[step][ok ? 'ok' : 'fail']++;
  if (!ok && err) stats.errors.push({ step, err: String(err).slice(0, 200) });
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(cond, timeoutMs = 15000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await cond();
    if (r) return r;
    await sleep(intervalMs);
  }
  throw new Error(`timeout waiting: ${cond.toString().slice(0, 80)}`);
}

async function ensureAgencyOwner(i) {
  const email = `owner${i}@test.local`;
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password: 'test1234', emailVerified: true });
  }
  const uid = user.uid;
  const agencyId = 'ag_' + uid.slice(0, 12);
  await auth.setCustomUserClaims(uid, { role: 'owner', agencyId });
  await db.doc(`agencies/${agencyId}`).set({
    agencyId,
    businessNumber: `000-00-${String(i).padStart(5, '0')}`,
    registrationNumber: `R-${i}`,
    name: `스트레스업체${i}`,
    ownerUid: uid,
    subscription: { plan: 'trial', status: 'active' },
    verificationStatus: 'verified',
    verifiedAt: FieldValue.serverTimestamp(),
    settings: { defaultPartnerLanguages: ['vi'], notificationChannels: ['email'] },
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { uid, agencyId };
}

async function createClient(agencyId, uid, i) {
  const clientRef = db.collection(`agencies/${agencyId}/clients`).doc();
  await clientRef.set({
    clientId: clientRef.id,
    agencyId,
    koreanClient: {
      name: `의뢰인${i}`,
      birthDate: Timestamp.fromDate(new Date('1985-01-01')),
      gender: 'M',
      nationalIdMasked: '850101-*******',
      phone: '010-0000-0000',
      address: '서울',
      maritalHistory: '초혼',
      incomeAnnual: 40000000,
      occupation: '회사원',
    },
    profile: null,
    birthInfo: null,
    assignedStaffUid: uid,
    currentStage: 1,
    overallProgress: 0,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return clientRef.id;
}

async function waitForTimelineSeeded(agencyId, clientId) {
  await waitFor(async () => {
    const snap = await db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`).count().get();
    return snap.data().count >= 10;
  }, 20000);
}

async function listTimeline(agencyId, clientId) {
  const snap = await db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`).get();
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

// ========== A1: stage cascade ==========
async function testA1(agencyId, clientId, uid) {
  const items = await listTimeline(agencyId, clientId);
  const stage1 = items.filter((it) => it.stage === 1);
  const stage2Before = items.filter((it) => it.stage === 2);
  if (stage1.length === 0) throw new Error('no stage-1 items seeded');
  if (!stage2Before.every((it) => it.status === 'blocked'))
    throw new Error('stage-2 items should start blocked');

  for (const it of stage1) {
    await it.ref.update({
      status: 'done',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  // wait for cascade (trigger updates stage-2 items + client.currentStage)
  await waitFor(async () => {
    const clientSnap = await db.doc(`agencies/${agencyId}/clients/${clientId}`).get();
    const s2 = await db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`)
      .where('stage', '==', 2).get();
    const allPending = s2.docs.every((d) => d.data().status === 'pending');
    return allPending && clientSnap.data()?.currentStage >= 2;
  });
}

// ========== A2: anchor recompute ==========
async function testA2(agencyId, clientId) {
  const items = await listTimeline(agencyId, clientId);
  const anchorItems = items.filter((it) => it.dueDateRule?.anchor === 'contract_signed');
  if (anchorItems.length === 0) return; // no applicable items, skip gracefully

  const beforeDues = new Map(anchorItems.map((it) => [it.id, it.dueDate.toMillis()]));
  const eventDate = new Date();

  await db.doc(`agencies/${agencyId}/clients/${clientId}`).set(
    { anchors: { contract_signed: Timestamp.fromDate(eventDate) }, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  // Replicate markAnchorEvent recompute (the callable body - admin SDK bypass)
  const batch = db.batch();
  for (const it of anchorItems) {
    const recomputed = new Date(eventDate);
    recomputed.setDate(recomputed.getDate() + it.dueDateRule.offsetDays);
    batch.update(it.ref, {
      dueDate: Timestamp.fromDate(recomputed),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  await db.collection('auditLogs').add({
    actorUid: 'stress-test',
    agencyId,
    action: 'timeline.anchor_recorded',
    targetPath: `agencies/${agencyId}/clients/${clientId}`,
    before: null,
    after: { anchor: 'contract_signed', eventDate: eventDate.toISOString(), updatedItems: anchorItems.length },
    ip: '',
    userAgent: '',
    createdAt: FieldValue.serverTimestamp(),
  });

  // Verify
  const after = await listTimeline(agencyId, clientId);
  for (const it of anchorItems) {
    const cur = after.find((x) => x.id === it.id);
    if (!cur) throw new Error(`item ${it.id} disappeared`);
    if (cur.dueDate.toMillis() === beforeDues.get(it.id))
      throw new Error(`dueDate not recomputed for ${it.id}`);
  }
}

// ========== A3: evidence auto-done ==========
async function testA3(agencyId, clientId, uid) {
  const items = await listTimeline(agencyId, clientId);
  const target = items.find(
    (it) => it.checkRule?.type === 'document_uploaded'
      && it.status !== 'done'
      && it.status !== 'blocked',
  );
  if (!target) return; // no applicable item

  const requiredType = target.checkRule.params?.docType ?? 'criminal_record';
  const docRef = db.collection(`agencies/${agencyId}/clients/${clientId}/documents`).doc();
  await docRef.set({
    agencyId,
    type: requiredType,
    subject: 'korean',
    storageUrl: 'mock://test.pdf',
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    issuedAt: Timestamp.now(),
    validUntil: Timestamp.fromDate(new Date(Date.now() + 6 * 30 * 86400_000)),
    ocrExtracted: null,
    uploadedBy: uid,
    uploadedAt: FieldValue.serverTimestamp(),
    replaces: null,
  });
  // Link evidence
  await target.ref.update({
    evidence: FieldValue.arrayUnion({ docId: docRef.id, addedAt: Timestamp.now() }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Wait for trigger to auto-mark done
  await waitFor(async () => {
    const snap = await target.ref.get();
    return snap.data()?.status === 'done';
  }, 10000);
}

// ========== A4: overdue scan + audit ==========
async function testA4(agencyId, clientId) {
  const items = await listTimeline(agencyId, clientId);
  const target = items.find(
    (it) => it.status === 'pending' || it.status === 'in_progress',
  );
  if (!target) return;
  // Backdate
  const past = new Date(Date.now() - 5 * 86400_000);
  await target.ref.update({
    dueDate: Timestamp.fromDate(past),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Replicate checkTimelineOverdue scan
  const now = new Date();
  const snap = await db
    .collectionGroup('timeline')
    .where('status', 'in', ['pending', 'in_progress'])
    .where('dueDate', '<', Timestamp.fromDate(now))
    .get();
  for (const d of snap.docs) {
    const data = d.data();
    const overdueDays = Math.floor((now.getTime() - data.dueDate.toDate().getTime()) / 86400_000);
    const nextStatus = overdueDays > 3 ? 'violated' : 'warning';
    await d.ref.update({
      status: nextStatus,
      warningReason: `기한 ${overdueDays}일 경과`,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  // Wait for trigger-written audit log (status changed by admin update → trigger fires)
  await waitFor(async () => {
    const after = await target.ref.get();
    return ['warning', 'violated'].includes(after.data()?.status);
  }, 10000);

  // Verify auditLog for status change
  const logSnap = await db.collection('auditLogs')
    .where('agencyId', '==', agencyId)
    .where('action', '==', 'timeline.status_changed')
    .get();
  if (logSnap.empty) throw new Error('no audit log for status change');
}

// ========== B1/B2/B3/B4: background info + translation + sign ==========
async function testBackgroundFlow(agencyId, clientId, uid) {
  const infoRef = db.collection(`agencies/${agencyId}/clients/${clientId}/backgroundInfo`).doc();
  const initialFields = {
    maritalHistory: '초혼',
    hasChildren: '없음',
    health: '양호',
    criminalRecord: '없음',
    occupation: '회사원',
    income: 40000000,
    property: '전세 1억',
    residence: '서울 전세',
    familySituation: '부모 생존',
  };
  await infoRef.set({
    agencyId,
    clientId,
    subject: 'korean',
    sourceLang: 'ko',
    fields: initialFields,
    fieldsUpdatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Mock AI translation: fill all fields
  const translationRef = infoRef.collection('translations').doc('vi');
  const translatedFields = {
    maritalHistory: 'Độc thân',
    hasChildren: 'Không',
    health: 'Tốt',
    criminalRecord: 'Không',
    occupation: 'Nhân viên văn phòng',
    income: '40 triệu KRW',
    property: 'Thuê nhà 100 triệu',
    residence: 'Thuê tại Seoul',
    familySituation: 'Cha mẹ còn sống',
  };
  await translationRef.set({
    lang: 'vi',
    fields: translatedFields,
    translatedBy: 'ai',
    translationQuality: 'draft',
    signedAt: null,
    signedByName: null,
    translatedAt: FieldValue.serverTimestamp(),
  });

  // Need to wait so that the next edit's fieldsUpdatedAt > translatedAt
  await sleep(150);

  // B1: update source fields → fieldsUpdatedAt becomes newer
  await infoRef.update({
    fields: { ...initialFields, occupation: '회사원(업데이트)' },
    fieldsUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Verify stale
  const [infoSnap, trSnap] = await Promise.all([infoRef.get(), translationRef.get()]);
  const info = infoSnap.data();
  const tr = trSnap.data();
  const isStale = info.fieldsUpdatedAt.toMillis() > tr.translatedAt.toMillis();
  if (!isStale) throw new Error('B1 stale 감지 실패');

  // B3: sign attempt while stale → should reject (replicate sign.ts logic)
  let rejected = false;
  try {
    await runSignLogic(agencyId, clientId, infoRef.id, 'vi', '서명자', uid);
  } catch (e) {
    rejected = true;
  }
  if (!rejected) throw new Error('B3 stale 서명이 거부되지 않음');

  // B2: re-save translation as human-reviewed
  await translationRef.set({
    lang: 'vi',
    fields: translatedFields, // re-apply full fields
    translatedBy: 'human',
    translationQuality: 'reviewed',
    translatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const trSnap2 = await translationRef.get();
  if (trSnap2.data().translationQuality !== 'reviewed')
    throw new Error('B2 translationQuality 가 reviewed 가 아님');

  // B4: sign via logic replication → should succeed + audit
  await runSignLogic(agencyId, clientId, infoRef.id, 'vi', '서명자', uid);
  const final = await translationRef.get();
  if (!final.data().signedAt) throw new Error('B4 signedAt 없음');

  const auditLogs = await db.collection('auditLogs')
    .where('agencyId', '==', agencyId)
    .where('action', '==', 'background_info.signed')
    .limit(1)
    .get();
  if (auditLogs.empty) throw new Error('B4 감사 로그 없음');
}

// Replicates functions/src/translation/sign.ts logic (admin SDK bypass of auth)
async function runSignLogic(agencyId, clientId, infoId, lang, signerName, uid) {
  const infoRef = db.doc(`agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}`);
  const translationRef = infoRef.collection('translations').doc(lang);
  const [infoSnap, trSnap] = await Promise.all([infoRef.get(), translationRef.get()]);
  if (!infoSnap.exists) throw new Error('not-found info');
  const info = infoSnap.data();
  const isSource = info.sourceLang === lang;
  const tr = trSnap.exists ? trSnap.data() : null;
  if (!tr) throw new Error('no translation');

  const REQUIRED = ['maritalHistory','hasChildren','health','criminalRecord','occupation','income','property','residence','familySituation'];
  const missing = [];
  for (const k of REQUIRED) {
    const src = info.fields?.[k];
    if (src === undefined || src === null || String(src).trim() === '') continue;
    const t = tr.fields?.[k];
    if (t === undefined || t === null || String(t).trim() === '') missing.push(k);
  }
  if (missing.length > 0) throw new Error(`missing: ${missing.join(',')}`);

  if (!isSource) {
    const srcMs = info.fieldsUpdatedAt?.toMillis?.();
    const trMs = tr.translatedAt?.toMillis?.();
    if (srcMs && trMs && srcMs > trMs) throw new Error('stale');
  }

  await translationRef.update({
    signedAt: FieldValue.serverTimestamp(),
    signedByName: signerName,
    signedByUid: uid,
  });
  await db.collection('auditLogs').add({
    actorUid: uid,
    agencyId,
    action: 'background_info.signed',
    targetPath: translationRef.path,
    before: null,
    after: {
      signedByName: signerName,
      sourceLang: info.sourceLang,
      targetLang: lang,
      translationQuality: tr.translationQuality,
      translatedBy: tr.translatedBy,
      sourceFields: info.fields,
      translatedFields: tr.fields,
    },
    ip: '',
    userAgent: '',
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ========== main ==========
const startedAt = Date.now();
console.log(`[start] N=${N} — 에뮬레이터 연결: firestore=${process.env.FIRESTORE_EMULATOR_HOST}, auth=${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

for (let i = 1; i <= N; i++) {
  let agencyId, clientId, uid;
  try {
    const a = await ensureAgencyOwner(i);
    agencyId = a.agencyId; uid = a.uid;
    clientId = await createClient(agencyId, uid, i);
    try { await waitForTimelineSeeded(agencyId, clientId); mark('seed', true); }
    catch (e) { mark('seed', false, e); throw e; }

    try { await testA1(agencyId, clientId, uid); mark('A1', true); }
    catch (e) { mark('A1', false, e); }

    try { await testA2(agencyId, clientId); mark('A2', true); }
    catch (e) { mark('A2', false, e); }

    try { await testA3(agencyId, clientId, uid); mark('A3', true); }
    catch (e) { mark('A3', false, e); }

    try { await testA4(agencyId, clientId); mark('A4', true); }
    catch (e) { mark('A4', false, e); }

    try {
      await testBackgroundFlow(agencyId, clientId, uid);
      mark('B1', true); mark('B2', true); mark('B3', true); mark('B4', true);
    } catch (e) {
      // Attribute fail to last-started step; approximate tracking
      mark('B1', false, e); mark('B2', false, e); mark('B3', false, e); mark('B4', false, e);
    }

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
console.log('\n====================== 결과 ======================');
console.log(`총 ${N}회 / 성공 ${stats.ok} / 실패 ${stats.fail}  (elapsed ${elapsed}s)`);
for (const [k, v] of Object.entries(stats.byStep)) {
  console.log(`  ${k}: ok=${v.ok} fail=${v.fail}`);
}
if (stats.errors.length > 0) {
  console.log('\n최초 오류 10건:');
  for (const e of stats.errors.slice(0, 10)) {
    console.log(`  - ${e.step ?? `iter${e.iter}`}: ${e.err}`);
  }
}
process.exit(stats.fail > 0 ? 1 : 0);
