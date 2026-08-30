// 결제창을 띄우는 훅 — 금액은 서버가 정하고 우리는 받아서 넘기기만 한다
//
// 순서
//   1) createPaymentOrder 를 불러 주문번호와 금액을 받는다 (금액을 화면에서 만들지 않는다)
//   2) 토스 결제창을 띄운다
//   3) 결제가 끝나면 successUrl 로 돌아오고, 거기서 confirmPayment 를 부른다
//
// 클라이언트 키가 없으면 결제를 시작하지 않는다. 키 없이 버튼만 눌리면
// 사용자는 무엇이 잘못됐는지 알 수 없다.

import { useCallback, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { functions } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined;

/** 결제를 쓸 수 있는 상태인지. 키가 없으면 화면에서 버튼을 잠근다. */
export const isCheckoutReady = Boolean(CLIENT_KEY);

export type OrderKind = 'carat' | 'marketing';

type OrderResult = { orderId: string; amount: number; label: string; orderName: string };

export function useCheckout() {
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (kind: OrderKind, itemId: string) => {
      setError(null);

      if (!CLIENT_KEY) {
        setError('결제 설정이 아직 준비되지 않았습니다. 관리자에게 문의해 주세요.');
        return;
      }
      if (!user?.uid) {
        setError('로그인이 필요합니다.');
        return;
      }

      setPending(itemId);
      try {
        // 1) 서버가 금액을 정해 주문을 만든다
        const createOrder = httpsCallable<{ kind: OrderKind; itemId: string }, OrderResult>(
          functions,
          'createPaymentOrder',
        );
        const { data } = await createOrder({ kind, itemId });

        // 2) 결제창
        const toss = await loadTossPayments(CLIENT_KEY);
        const payment = toss.payment({ customerKey: user.uid });

        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: data.amount },
          orderId: data.orderId,
          orderName: data.orderName,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
          card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false },
        });
        // 여기서 페이지가 토스로 넘어간다. 아래 코드는 대개 실행되지 않는다.
      } catch (err) {
        const message = (err as { message?: string }).message ?? '결제를 시작하지 못했습니다.';
        // 사용자가 창을 닫은 것은 오류가 아니다
        if (!/취소|CANCEL|closed/i.test(message)) setError(message);
      } finally {
        setPending(null);
      }
    },
    [user?.uid],
  );

  return { start, pending, error, ready: isCheckoutReady };
}

/** 결제 후 돌아왔을 때 승인을 요청한다 */
export async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const fn = httpsCallable<
    typeof params,
    { ok: boolean; kind?: OrderKind; label?: string; carats?: number | null; receiptUrl?: string; alreadyPaid?: boolean }
  >(functions, 'confirmPayment');
  const { data } = await fn(params);
  return data;
}
