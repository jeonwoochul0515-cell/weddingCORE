import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Inputs, Result } from './engine';

/**
 * 익명 시뮬레이션 세션을 Firestore에 저장. 로그인 불필요.
 * 30일 후 TTL 정책으로 자동 삭제 (Firestore TTL 설정 필요).
 */
export async function saveSimulationSession(inputs: Inputs, result: Result) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  try {
    const ref = await addDoc(collection(db, 'visaSimulations'), {
      inputs: {
        householdSize: inputs.householdSize,
        annualIncome: inputs.annualIncome,
        propertyNetWorth: inputs.propertyNetWorth,
        partnerCountry: inputs.partnerCountry,
        relationshipMonths: inputs.relationshipMonths,
        communicationLanguage: inputs.communicationLanguage,
        evidencePhotoCount: inputs.evidencePhotoCount,
        preMarriageProgramCompleted: inputs.preMarriageProgramCompleted,
      },
      result: {
        visaType: result.visaType,
        overallProbability: result.overallProbability,
        scores: result.scores,
        blockerCount: result.hardBlockers.length,
        recommendCount: result.recommendations.length,
      },
      year: result.ruleYear,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    return ref.id;
  } catch (err) {
    // 익명 저장 실패는 무시 (시뮬레이터 자체는 동작)
    console.warn('시뮬레이션 저장 실패', err);
    return null;
  }
}
