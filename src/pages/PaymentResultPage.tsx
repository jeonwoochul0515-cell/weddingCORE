// 결제 결과 — 토스에서 돌아온 뒤 승인을 마치는 화면
//
// 여기서 승인을 부르기 전까지는 결제가 끝난 것이 아니다. 사용자가 이 화면을 닫으면
// 승인이 안 된 채로 남으므로, 들어오자마자 자동으로 승인을 요청하고 결과를 보여준다.

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { confirmPayment } from '@/features/payments/useCheckout';

type State =
  | { phase: 'confirming' }
  | { phase: 'done'; label: string; carats: number | null; receiptUrl: string; kind?: string }
  | { phase: 'failed'; message: string };

export default function PaymentResultPage({ mode }: { mode: 'success' | 'fail' }) {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>(
    mode === 'fail'
      ? { phase: 'failed', message: params.get('message') || '결제가 취소되었거나 실패했습니다.' }
      : { phase: 'confirming' },
  );
  // 개발 중 StrictMode에서 두 번 호출되는 것을 막는다
  const started = useRef(false);

  useEffect(() => {
    if (mode !== 'success' || started.current) return;
    started.current = true;

    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount'));

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      setState({ phase: 'failed', message: '결제 정보가 올바르지 않습니다.' });
      return;
    }

    confirmPayment({ paymentKey, orderId, amount })
      .then((r) =>
        setState({
          phase: 'done',
          label: r.label ?? '결제',
          carats: r.carats ?? null,
          receiptUrl: r.receiptUrl ?? '',
          kind: r.kind,
        }),
      )
      .catch((err) =>
        setState({
          phase: 'failed',
          message: (err as { message?: string }).message ?? '결제 승인에 실패했습니다.',
        }),
      );
  }, [mode, params]);

  return (
    <div className="mx-auto max-w-lg px-5 py-16 sm:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state.phase === 'confirming' && (
          <>
            <Loader2 size={36} className="mx-auto mb-4 animate-spin text-slate-400" />
            <h1 className="text-lg font-bold text-[#102621]">결제를 확인하고 있습니다</h1>
            <p className="mt-2 text-sm text-slate-500">
              창을 닫지 말고 잠시만 기다려 주세요.
            </p>
          </>
        )}

        {state.phase === 'done' && (
          <>
            <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-600" />
            <h1 className="text-xl font-bold text-[#102621]">결제가 끝났습니다</h1>
            <p className="mt-2 text-sm text-slate-600">{state.label}</p>
            {state.carats ? (
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {state.carats}캐럿이 충전되었습니다
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                신청이 접수되었습니다. 담당자가 연락드립니다.
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link
                to={state.kind === 'marketing' ? '/agency/marketing' : '/agency/automation'}
                className="rounded-lg bg-[#102621] px-4 py-2 text-sm font-semibold text-white"
              >
                돌아가기
              </Link>
              {state.receiptUrl && (
                <a
                  href={state.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  영수증 보기
                </a>
              )}
            </div>
          </>
        )}

        {state.phase === 'failed' && (
          <>
            <XCircle size={40} className="mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-bold text-[#102621]">결제가 완료되지 않았습니다</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{state.message}</p>
            <p className="mt-3 text-xs text-slate-500">
              카드에서 금액이 빠져나갔는데 이 화면이 보인다면 결제가 승인되지 않은 것이니
              관리자에게 알려 주세요. 승인되지 않은 건은 자동으로 취소됩니다.
            </p>
            <div className="mt-6">
              <Link
                to="/agency/automation"
                className="rounded-lg bg-[#102621] px-4 py-2 text-sm font-semibold text-white"
              >
                돌아가기
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
