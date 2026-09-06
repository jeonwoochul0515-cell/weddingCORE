// 후보 프로필 인쇄 — 손님에게 종이로 건네는 한 장
//
// 국제결혼 중개는 손님이 종이를 받아 가족과 상의한다. 화면만 있으면 그 자리에서 끝난다.
import { Printer, X } from 'lucide-react';
import { useAgencyName } from '@/features/agency/useAgencyName';
import { ageOf, PARTNER_STATUS_LABEL, type PartnerItem } from './usePartners';

const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function PartnerProfilePrint({ partner, onClose }: { partner: PartnerItem; onClose: () => void }) {
  const agencyName = useAgencyName();
  const age = ageOf(partner.birthDate);
  const rows: Array<[string, string]> = [
    ['국적', fmt(partner.nationality)],
    ['나이', age != null ? `${age}세` : '—'],
    ['생년월일', partner.birthDate?.toDate?.().toLocaleDateString('ko-KR') ?? '—'],
    ['성별', partner.gender === 'F' ? '여' : partner.gender === 'M' ? '남' : '—'],
    ['현지 거주지', fmt(partner.region)],
    ['직업', fmt(partner.occupation)],
    ['학력', fmt(partner.education)],
    ['종교', fmt(partner.religion)],
    ['혼인 이력', fmt(partner.maritalHistory)],
    ['가능한 언어', fmt(partner.languages)],
    ['키', partner.height ? `${partner.height}cm` : '—'],
  ];

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 p-4 print:static print:bg-white print:p-0">
      <div className="mx-auto my-6 w-full max-w-[210mm] print:my-0">
        <div className="mb-3 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#102621] px-3.5 py-2 text-sm font-semibold text-white">
            <Printer size={15} />인쇄
          </button>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-10 print:rounded-none print:border-none print:p-0">
          <header className="mb-6 flex items-end justify-between border-b border-slate-300 pb-3">
            <h1 className="text-xl font-bold text-[#102621]">후보 프로필</h1>
            <span className="text-xs text-slate-500">{agencyName || ''}</span>
          </header>

          <div className="flex gap-6">
            <div className="h-48 w-36 shrink-0 overflow-hidden rounded border border-slate-300 bg-slate-50">
              {partner.photoUrl
                ? <img src={partner.photoUrl} alt="" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center text-xs text-slate-400">사진 없음</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-[#102621]">{partner.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                상태 · {PARTNER_STATUS_LABEL[partner.status] ?? partner.status}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex gap-2 border-b border-slate-100 py-1">
                    <dt className="w-24 shrink-0 text-slate-500">{k}</dt>
                    <dd className="min-w-0 text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {partner.memo && (
            <section className="mt-6">
              <h2 className="mb-1.5 text-sm font-bold text-slate-700">메모</h2>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{partner.memo}</p>
            </section>
          )}

          <footer className="mt-8 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
            이 종이는 소개를 위한 참고 자료입니다. 결혼중개업법이 정한 신상정보 제공은 공증인 인증을 받은
            서면으로 따로 이뤄져야 하며, 이 프로필이 그것을 대신하지 않습니다.
            <span className="ml-1">출력일 {new Date().toLocaleDateString('ko-KR')}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
