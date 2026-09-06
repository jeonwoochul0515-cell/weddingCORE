// 결혼중개 계약서 초안 — 이미 갖고 있는 값으로 서식을 채우고 인쇄한다
//
// ⚠ 이 화면이 만드는 것은 **초안**이다.
//    법 제10조와 시행규칙이 요구하는 기재사항 전부를 담았는지는 이 코드가 보증하지 않는다.
//    조문 원문을 공개 경로로 확인하지 못해(법제처 API는 등록된 IP만 받는다), 확인된 항목만
//    담고 나머지는 변호사 검토로 남겼다. 근거와 남은 일은 docs/checklist-gap5.md에 적어 두었다.
//
// 그래도 값이 있는 이유. 상호·등록번호·대표자·주소·고객 정보를 매번 손으로 옮겨 적는 일이
// 사라진다. 그 옮겨 적기에서 오타가 나고, 오타 난 계약서가 처분 자료가 된다.
import { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { useAgency } from '@/features/agency/useAgency';
import { formatPhone } from '@/lib/korean';
import type { Client } from '@/types/schema';

type Props = { client: Client & { id: string }; onClose: () => void };

const won = (v: string) => {
  const n = Number(String(v).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString()}원` : '—';
};

export default function ContractDraft({ client, onClose }: Props) {
  const { agency } = useAgency();
  const [fee, setFee] = useState('');
  const [service, setService] = useState('국제결혼 상대방 소개, 맞선 주선, 혼인 절차와 비자 서류 안내');
  const [period, setPeriod] = useState('계약일부터 12개월');
  const [refund, setRefund] = useState('');
  const [signedOn, setSignedOn] = useState(new Date().toISOString().slice(0, 10));

  const k = client.koreanClient;
  const rows: Array<[string, string]> = [
    ['상호', agency?.name ?? '—'],
    ['대표자', agency?.ownerName ?? '—'],
    ['등록번호', agency?.registrationNumber ?? '—'],
    ['사업자등록번호', agency?.businessNumber ?? '—'],
    ['소재지', agency?.address ?? '—'],
    ['연락처', agency?.phone ? formatPhone(agency.phone) : '—'],
  ];
  const clientRows: Array<[string, string]> = [
    ['성명', k?.name ?? '—'],
    ['생년월일', k?.birthDate?.toDate?.().toLocaleDateString('ko-KR') ?? '—'],
    ['연락처', k?.phone ? formatPhone(k.phone) : '—'],
    ['주소', k?.address || '—'],
  ];

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 p-4 print:static print:bg-white print:p-0">
      <div className="mx-auto my-6 w-full max-w-[210mm] print:my-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 print:hidden">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-white/90">중개 수수료
              <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="numeric" placeholder="3000000" className="mt-1 block w-36 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900" />
            </label>
            <label className="text-xs font-semibold text-white/90">계약일
              <input type="date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#102621] px-3.5 py-2 text-sm font-semibold text-white">
              <Printer size={15} />인쇄
            </button>
            <button type="button" onClick={onClose} aria-label="닫기" className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-10 print:rounded-none print:border-none print:p-0">
          <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 print:border-slate-400 print:bg-white">
            <strong>초안입니다.</strong> 법 제10조와 시행규칙이 요구하는 기재사항을 모두 담았는지
            변호사 검토를 거친 뒤 사용하세요. 특히 환불·해지 조건은 업체마다 달라 그대로 쓸 수 없습니다.
          </p>

          <h1 className="mb-6 text-center text-xl font-bold text-[#102621]">결혼중개 계약서</h1>

          <section className="mb-5">
            <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold text-slate-700">중개업자</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {rows.map(([a, b]) => (
                <div key={a} className="flex gap-2 py-0.5"><dt className="w-28 shrink-0 text-slate-500">{a}</dt><dd className="min-w-0 text-slate-900">{b}</dd></div>
              ))}
            </dl>
          </section>

          <section className="mb-5">
            <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold text-slate-700">이용자</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {clientRows.map(([a, b]) => (
                <div key={a} className="flex gap-2 py-0.5"><dt className="w-28 shrink-0 text-slate-500">{a}</dt><dd className="min-w-0 text-slate-900">{b}</dd></div>
              ))}
            </dl>
          </section>

          <section className="mb-5">
            <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold text-slate-700">계약 내용</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">제공 서비스</dt>
                <dd className="min-w-0 flex-1"><textarea value={service} onChange={(e) => setService(e.target.value)} className="w-full resize-y rounded border border-slate-200 px-2 py-1 text-sm print:border-none print:p-0" rows={2} /></dd></div>
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">제공 기간</dt>
                <dd className="min-w-0 flex-1"><input value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded border border-slate-200 px-2 py-1 text-sm print:border-none print:p-0" /></dd></div>
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">중개 수수료</dt>
                <dd className="min-w-0 flex-1 text-slate-900">{won(fee)}</dd></div>
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">계약일</dt>
                <dd className="min-w-0 flex-1 text-slate-900">{signedOn ? new Date(signedOn).toLocaleDateString('ko-KR') : '—'}</dd></div>
            </dl>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold text-slate-700">환불·해지 조건</h2>
            <textarea
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
              rows={5}
              placeholder="어떤 경우에 얼마를 돌려주는지 적습니다. 이 칸은 비워 두면 안 됩니다."
              className="w-full resize-y rounded border border-slate-200 px-2 py-1.5 text-sm leading-6 print:border-none print:p-0"
            />
            {!refund.trim() && (
              <p className="mt-1 text-xs text-red-600 print:hidden">
                환불 조건은 법이 계약서에 담으라고 하는 항목입니다. 비워 두고 인쇄하지 마세요.
              </p>
            )}
          </section>

          <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-8 text-xs text-slate-500">중개업자</p>
              <div className="border-b border-slate-400" />
              <p className="mt-1 text-xs text-slate-400">{agency?.name ?? ''} (인)</p>
            </div>
            <div>
              <p className="mb-8 text-xs text-slate-500">이용자</p>
              <div className="border-b border-slate-400" />
              <p className="mt-1 text-xs text-slate-400">{k?.name ?? ''} (인)</p>
            </div>
          </div>

          <footer className="mt-8 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
            결혼중개업법 제10조는 수수료를 받는 결혼중개를 서면 계약으로 하도록 하고, 계약 내용을
            이용자가 이해할 수 있게 설명하도록 합니다. 이 서식은 그 이행을 돕는 초안이며
            법이 요구하는 기재사항을 빠짐없이 담았음을 보증하지 않습니다.
            <span className="ml-1">출력일 {new Date().toLocaleDateString('ko-KR')}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
