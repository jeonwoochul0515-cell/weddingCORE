import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SUPPORTED_COUNTRIES } from './rules';
import type { Inputs } from './engine';
import { t, type UiLang } from './i18n';

type Props = {
  lang: UiLang;
  onSubmit: (inputs: Inputs) => void;
};

const STEPS = ['inviter', 'household', 'housing', 'partner', 'sincerity', 'other'] as const;

export default function InputForm({ lang, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Inputs>(DEFAULT_VALUES);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function next() { setStep((s) => Math.min(STEPS.length - 1, s + 1)); }
  function prev() { setStep((s) => Math.max(0, s - 1)); }

  const isLast = step === STEPS.length - 1;
  const stepKey = STEPS[step]!;

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-xs font-medium text-slate-500">
          {step + 1}/{STEPS.length}
        </h2>
        <h3 className="mb-4 text-xl font-semibold text-slate-900">
          {t('step', stepKey, lang)}
        </h3>

        {stepKey === 'inviter' && <InviterStep values={values} update={update} />}
        {stepKey === 'household' && <HouseholdStep values={values} update={update} />}
        {stepKey === 'housing' && <HousingStep values={values} update={update} />}
        {stepKey === 'partner' && <PartnerStep values={values} update={update} lang={lang} />}
        {stepKey === 'sincerity' && <SincerityStep values={values} update={update} />}
        {stepKey === 'other' && <OtherStep values={values} update={update} />}
      </div>

      <div className="flex justify-between">
        <button
          onClick={prev}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-30"
        >
          <ChevronLeft size={16} />{t('button', 'prev', lang)}
        </button>
        {isLast ? (
          <button
            onClick={() => onSubmit(values)}
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t('button', 'submit', lang)}
          </button>
        ) : (
          <button
            onClick={next}
            className="flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            {t('button', 'next', lang)}<ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

type StepProps = {
  values: Inputs;
  update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void;
};

function InviterStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <Row label="나이">
        <input type="number" min={18} max={100} value={values.inviterAge}
          onChange={(e) => update('inviterAge', Number(e.target.value))} className="input" />
      </Row>
      <Row label="성별">
        <select value={values.inviterGender} onChange={(e) => update('inviterGender', e.target.value as 'M' | 'F')} className="input">
          <option value="M">남</option><option value="F">여</option>
        </select>
      </Row>
      <Row label="혼인 이력">
        <select value={values.inviterMaritalHistory}
          onChange={(e) => update('inviterMaritalHistory', e.target.value as 'first' | 'remarried')} className="input">
          <option value="first">초혼</option><option value="remarried">재혼</option>
        </select>
      </Row>
      {values.inviterMaritalHistory === 'remarried' && (
        <Row label="재혼 횟수">
          <input type="number" min={1} max={5} value={values.inviterRemarriageCount}
            onChange={(e) => update('inviterRemarriageCount', Number(e.target.value))} className="input" />
        </Row>
      )}
      <Row label="자녀 유무 (본인)">
        <select value={String(values.hasChildren)} onChange={(e) => update('hasChildren', e.target.value === 'true')} className="input">
          <option value="false">없음</option><option value="true">있음</option>
        </select>
      </Row>
      <Style />
    </div>
  );
}

function HouseholdStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <Row label="가구원 수 (본인+배우자+동거 직계가족)">
        <input type="number" min={2} max={10} value={values.householdSize}
          onChange={(e) => update('householdSize', Number(e.target.value))} className="input" />
      </Row>
      <Row label="초청인 연소득 (원)">
        <input type="number" min={0} value={values.annualIncome}
          onChange={(e) => update('annualIncome', Number(e.target.value))} className="input" />
      </Row>
      <Row label="순자산 (원) - 부동산 시가 + 예금 - 부채">
        <input type="number" min={0} value={values.propertyNetWorth}
          onChange={(e) => update('propertyNetWorth', Number(e.target.value))} className="input" />
      </Row>
      <Row label="동거 직계가족 소득 합산">
        <select value={String(values.includeFamilyIncome)}
          onChange={(e) => update('includeFamilyIncome', e.target.value === 'true')} className="input">
          <option value="false">합산 안함</option><option value="true">합산</option>
        </select>
      </Row>
      {values.includeFamilyIncome && (
        <Row label="동거 직계가족 합산 연소득 (원)">
          <input type="number" min={0} value={values.familyIncomeTotal}
            onChange={(e) => update('familyIncomeTotal', Number(e.target.value))} className="input" />
        </Row>
      )}
      <Style />
    </div>
  );
}

function HousingStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <Row label="주거 형태">
        <select value={values.housingType}
          onChange={(e) => update('housingType', e.target.value as Inputs['housingType'])} className="input">
          <option value="owned">자가</option>
          <option value="jeonse">전세</option>
          <option value="monthly">월세</option>
          <option value="family">가족 소유 주택 거주</option>
          <option value="other">기타(원룸·고시원 등)</option>
        </select>
      </Row>
      <Style />
    </div>
  );
}

function PartnerStep({ values, update, lang }: StepProps & { lang: UiLang }) {
  return (
    <div className="space-y-4">
      <Row label="배우자 국적">
        <select value={values.partnerCountry}
          onChange={(e) => update('partnerCountry', e.target.value)} className="input">
          {SUPPORTED_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {lang === 'en' ? c.en : c.ko}
            </option>
          ))}
        </select>
      </Row>
      <Row label="배우자 나이">
        <input type="number" min={16} max={80} value={values.partnerAge}
          onChange={(e) => update('partnerAge', Number(e.target.value))} className="input" />
      </Row>
      <Row label="배우자 성별">
        <select value={values.partnerGender}
          onChange={(e) => update('partnerGender', e.target.value as 'M' | 'F')} className="input">
          <option value="F">여</option><option value="M">남</option>
        </select>
      </Row>
      <Row label="배우자 혼인 이력">
        <select value={values.partnerMaritalHistory}
          onChange={(e) => update('partnerMaritalHistory', e.target.value as 'first' | 'remarried')} className="input">
          <option value="first">초혼</option><option value="remarried">재혼</option>
        </select>
      </Row>
      <Row label="배우자 본국 혼인 정리 완료">
        <select value={String(values.partnerMaritalClear)}
          onChange={(e) => update('partnerMaritalClear', e.target.value === 'true')} className="input">
          <option value="true">완료</option><option value="false">미완료</option>
        </select>
      </Row>
      <Style />
    </div>
  );
}

function SincerityStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <Row label="교제 기간 (개월)">
        <input type="number" min={0} max={120} value={values.relationshipMonths}
          onChange={(e) => update('relationshipMonths', Number(e.target.value))} className="input" />
      </Row>
      <Row label="대면 만남 횟수">
        <input type="number" min={0} max={30} value={values.inPersonMeetings}
          onChange={(e) => update('inPersonMeetings', Number(e.target.value))} className="input" />
      </Row>
      <Row label="의사소통 언어">
        <select value={values.communicationLanguage}
          onChange={(e) => update('communicationLanguage', e.target.value as Inputs['communicationLanguage'])} className="input">
          <option value="fluent">통역 없이 유창한 대화 가능</option>
          <option value="basic">기초 대화 가능 (일부 통역 필요)</option>
          <option value="interpreter_only">통역 없이 대화 불가</option>
        </select>
      </Row>
      <Row label="교제 증빙 사진 수">
        <input type="number" min={0} max={200} value={values.evidencePhotoCount}
          onChange={(e) => update('evidencePhotoCount', Number(e.target.value))} className="input" />
      </Row>
      <Style />
    </div>
  );
}

function OtherStep({ values, update }: StepProps) {
  return (
    <div className="space-y-4">
      <Row label="결혼이민사전안내프로그램 이수">
        <select value={String(values.preMarriageProgramCompleted)}
          onChange={(e) => update('preMarriageProgramCompleted', e.target.value === 'true')} className="input">
          <option value="true">이수 완료</option><option value="false">미이수</option>
        </select>
      </Row>
      <Row label="초청인 범죄 경력">
        <select value={values.inviterCriminalHistory}
          onChange={(e) => update('inviterCriminalHistory', e.target.value as Inputs['inviterCriminalHistory'])} className="input">
          <option value="none">없음</option>
          <option value="minor">경미 (벌금 등)</option>
          <option value="serious">중대 (징역)</option>
          <option value="child_abuse_sex">아동학대·성범죄·가정폭력</option>
        </select>
      </Row>
      <Row label="초청인 중대 질병·장애·정신질환">
        <select value={values.inviterMedicalCondition}
          onChange={(e) => update('inviterMedicalCondition', e.target.value as Inputs['inviterMedicalCondition'])} className="input">
          <option value="none">없음</option>
          <option value="minor">경미</option>
          <option value="serious">중대</option>
        </select>
      </Row>
      <Style />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Style() {
  return (
    <style>{`
      .input {
        width: 100%;
        border: 1px solid rgb(203 213 225);
        border-radius: 0.375rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        background: white;
      }
      .input:focus { outline: none; border-color: rgb(15 23 42); }
    `}</style>
  );
}

const DEFAULT_VALUES: Inputs = {
  inviterAge: 45,
  inviterGender: 'M',
  inviterMaritalHistory: 'first',
  inviterRemarriageCount: 0,
  hasChildren: false,
  householdSize: 2,
  annualIncome: 30_000_000,
  propertyNetWorth: 100_000_000,
  includeFamilyIncome: false,
  familyIncomeTotal: 0,
  housingType: 'monthly',
  partnerCountry: 'VN',
  partnerAge: 28,
  partnerGender: 'F',
  partnerMaritalHistory: 'first',
  partnerMaritalClear: true,
  relationshipMonths: 6,
  inPersonMeetings: 2,
  communicationLanguage: 'basic',
  evidencePhotoCount: 15,
  preMarriageProgramCompleted: true,
  inviterCriminalHistory: 'none',
  inviterMedicalCondition: 'none',
};
