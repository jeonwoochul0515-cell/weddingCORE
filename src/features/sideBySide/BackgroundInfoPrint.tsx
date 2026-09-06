// 신상정보 서면 인쇄 — 화면에 다 만들어 놓고 정작 건넬 종이를 못 뽑던 것을 고친다
//
// 법 제10조의2는 서면 제공을 요구한다. 원본과 번역본을 나란히 찍어 상대가 읽을 수 있는
// 언어로 받게 한다. 이 종이 자체가 법이 요구하는 형식을 다 갖췄다고 보장하지는 않는다 —
// 공증인 인증은 별도 절차다. 그 점을 종이 아래에 적어 둔다.
import { Printer, X } from 'lucide-react';
import { useAgencyName } from '@/features/agency/useAgencyName';
import { BG_INFO_FIELDS, LANG_LABEL, type FieldKey, type SupportedLang } from './fields';
import type { BackgroundInfoDoc, TranslationDoc } from './useBackgroundInfo';

type Props = {
  info: BackgroundInfoDoc;
  /** 함께 찍을 번역본. 없으면 원본만 나온다 */
  translation?: TranslationDoc | null;
  clientName?: string;
  onClose: () => void;
};

const show = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : String(v));

export default function BackgroundInfoPrint({ info, translation, clientName, onClose }: Props) {
  const agencyName = useAgencyName();
  const src = info.sourceLang as SupportedLang;
  const tgt = translation?.lang;
  const subject = info.subject === 'korean' ? '한국인 측' : '외국인 측';

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
          <header className="mb-5 border-b border-slate-300 pb-3">
            <h1 className="text-xl font-bold text-[#102621]">신상정보 제공 서면</h1>
            <p className="mt-1 text-xs text-slate-500">
              결혼중개업법 제10조의2 · {subject}
              {clientName ? ` · 고객 ${clientName}` : ''}
              {agencyName ? ` · ${agencyName}` : ''}
            </p>
          </header>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
                <th className="w-40 py-2 pr-3 font-semibold">항목</th>
                <th className="py-2 pr-3 font-semibold">{LANG_LABEL[src]}</th>
                {tgt && <th className="py-2 font-semibold">{LANG_LABEL[tgt]}</th>}
              </tr>
            </thead>
            <tbody>
              {BG_INFO_FIELDS.map((f) => (
                <tr key={f.key} className="border-b border-slate-100 align-top">
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold text-slate-600">
                    {f.labels[src] ?? f.labels.ko}
                    <span className="mt-0.5 block font-normal text-[10px] text-slate-400">{f.legalBasis}</span>
                  </th>
                  <td className="py-2.5 pr-3 leading-6 text-slate-900">{show(info.fields[f.key as FieldKey])}</td>
                  {tgt && (
                    <td className="py-2.5 leading-6 text-slate-900">{show(translation?.fields?.[f.key as FieldKey])}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-8 text-xs text-slate-500">제공한 사람 (업체)</p>
              <div className="border-b border-slate-400" />
              <p className="mt-1 text-xs text-slate-400">서명 또는 날인</p>
            </div>
            <div>
              <p className="mb-8 text-xs text-slate-500">받은 사람</p>
              <div className="border-b border-slate-400" />
              <p className="mt-1 text-xs text-slate-400">서명 또는 날인</p>
            </div>
          </div>

          <footer className="mt-8 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
            {translation
              ? `번역 상태 · ${translation.translationQuality === 'certified' ? '인증' : translation.translationQuality === 'reviewed' ? '사람 검수' : '초벌'}`
              : '번역본이 아직 없습니다. 상대가 읽을 수 있는 언어로 제공해야 합니다.'}
            <span className="ml-1">
              이 서면이 공증인 인증까지 마쳤음을 뜻하지는 않습니다. 인증은 별도 절차이며,
              제공 시점은 맞선 이전이어야 합니다.
            </span>
            <span className="ml-1">출력일 {new Date().toLocaleDateString('ko-KR')}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
