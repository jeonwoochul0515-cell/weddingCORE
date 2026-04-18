import { useRef } from 'react';
import { FileDown } from 'lucide-react';
import type { ClientProfile, BirthInfo, MbtiType } from '@/types/schema';
import { getMbtiCompat } from './mbtiCompat';
import { getSajuCompat, ELEMENT_STYLE } from './sajuCompat';

type PersonInfo = {
  name: string;
  age: number;
  gender: 'M' | 'F';
  occupation: string;
  profile: ClientProfile | null;
  birthInfo: BirthInfo | null;
};

type Props = {
  clientInfo: PersonInfo;
  partnerInfo: PersonInfo;
  managerName: string;
};

function getAge(solarDate: string): number {
  const birth = new Date(solarDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function ConditionCheck({ label, match }: { label: string; match: boolean | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {match === true ? '✅' : match === false ? '⚠️' : '➖'} {label}
    </span>
  );
}

export default function MatchReport({ clientInfo, partnerInfo, managerName }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const mbtiA = clientInfo.profile?.mbti ?? null;
  const mbtiB = partnerInfo.profile?.mbti ?? null;
  const dateA = clientInfo.birthInfo?.solarDate ?? null;
  const dateB = partnerInfo.birthInfo?.solarDate ?? null;

  const mbtiResult = mbtiA && mbtiB ? getMbtiCompat(mbtiA, mbtiB) : null;
  const sajuResult = dateA && dateB ? getSajuCompat(dateA, dateB) : null;

  async function handlePrint() {
    window.print();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <button
        onClick={handlePrint}
        className="mb-3 flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
      >
        <FileDown size={14} />리포트 출력
      </button>

      <div
        ref={reportRef}
        className="mx-auto w-full max-w-[210mm] rounded-lg border border-slate-200 bg-white p-8 print:border-none print:p-0 print:shadow-none"
      >
        {/* 헤더 */}
        <div className="mb-6 border-b border-slate-200 pb-4 text-center">
          <h1 className="text-xl font-bold text-slate-900">weddingCORE 매칭 제안서</h1>
          <p className="mt-1 text-xs text-slate-500">작성일: {today}</p>
        </div>

        {/* 양측 프로필 비교 */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <ProfileColumn person={clientInfo} label="한국측" />
          <ProfileColumn person={partnerInfo} label="외국측" />
        </div>

        {/* 궁합 섹션 */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {/* MBTI */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">MBTI 궁합</h3>
            {mbtiResult ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg font-bold">{mbtiA}</span>
                  <span className="text-slate-400">×</span>
                  <span className="text-lg font-bold">{mbtiB}</span>
                </div>
                <div className="mt-1 text-2xl font-bold">{mbtiResult.score}점</div>
                <div className={`text-sm font-semibold ${mbtiResult.gradeColor}`}>{mbtiResult.grade}</div>
                <p className="mt-2 text-xs text-slate-600">{mbtiResult.description}</p>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500">MBTI 정보 필요</p>
            )}
          </div>

          {/* 사주 */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">사주 궁합</h3>
              <span className="text-[9px] text-amber-600">재미 참고용</span>
            </div>
            {sajuResult ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <span>{ELEMENT_STYLE[sajuResult.elements.a].emoji} {sajuResult.elements.a}</span>
                  <span className="text-slate-400">×</span>
                  <span>{ELEMENT_STYLE[sajuResult.elements.b].emoji} {sajuResult.elements.b}</span>
                </div>
                <div className="mt-1 text-2xl font-bold">{sajuResult.score}점</div>
                <div className={`text-sm font-semibold ${sajuResult.gradeColor}`}>{sajuResult.grade}</div>
                <p className="mt-2 text-xs text-slate-600">{sajuResult.description}</p>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500">생년월일 정보 필요</p>
            )}
          </div>
        </div>

        {/* 조건 매칭 */}
        <div className="mb-6 rounded-lg border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">희망 조건 매칭</h3>
          <div className="flex flex-wrap gap-3">
            <ConditionCheck label="종교" match={checkReligion(clientInfo.profile, partnerInfo.profile)} />
            <ConditionCheck label="학력" match={checkEducation(clientInfo.profile, partnerInfo.profile)} />
            <ConditionCheck label="흡연" match={checkSmoking(clientInfo.profile, partnerInfo.profile)} />
            <ConditionCheck label="음주" match={checkDrinking(clientInfo.profile, partnerInfo.profile)} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-500">담당 매니저: {managerName} | {today}</p>
          <p className="mt-1 text-[10px] text-slate-400">ⓒ weddingCORE — 국제결혼중개업 올인원 운영 플랫폼</p>
          {sajuResult && (
            <p className="mt-1 text-[9px] text-slate-400">{sajuResult.disclaimer}</p>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.print-target) { display: none !important; }
          .print-target { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function ProfileColumn({ person, label }: { person: PersonInfo; label: string }) {
  const p = person.profile;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{person.name} ({person.age}세)</div>
      <div className="text-sm text-slate-600">{person.gender === 'M' ? '남' : '여'} · {person.occupation}</div>
      <dl className="mt-2 space-y-1 text-xs">
        {p?.mbti && <Row label="MBTI" value={p.mbti} />}
        {p?.education && <Row label="학력" value={p.education} />}
        {p?.religion && <Row label="종교" value={p.religion} />}
        {p?.region && <Row label="지역" value={p.region} />}
        {p?.height && <Row label="키" value={`${p.height}cm`} />}
        {p?.smoking !== null && p?.smoking !== undefined && <Row label="흡연" value={p.smoking ? '흡연' : '비흡연'} />}
        {p?.drinking && <Row label="음주" value={p.drinking} />}
        {p?.hobbies && p.hobbies.length > 0 && <Row label="취미" value={p.hobbies.join(', ')} />}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <dt className="w-12 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function checkReligion(a: ClientProfile | null, b: ClientProfile | null): boolean | null {
  if (!a?.religion || !b?.religion) return null;
  return a.religion === b.religion;
}

function checkEducation(a: ClientProfile | null, b: ClientProfile | null): boolean | null {
  if (!a?.education || !b?.education) return null;
  return true; // 단순 유무 확인
}

function checkSmoking(a: ClientProfile | null, b: ClientProfile | null): boolean | null {
  if (a?.smoking === null || a?.smoking === undefined || b?.smoking === null || b?.smoking === undefined) return null;
  return a.smoking === b.smoking;
}

function checkDrinking(a: ClientProfile | null, b: ClientProfile | null): boolean | null {
  if (!a?.drinking || !b?.drinking) return null;
  return a.drinking === b.drinking;
}
