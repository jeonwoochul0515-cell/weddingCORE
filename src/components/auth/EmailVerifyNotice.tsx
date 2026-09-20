// 초대장은 왔는데 메일 인증이 안 끝난 사람에게 무엇을 해야 하는지 알려 준다
//
// 왜 필요한가. 직원 초대 수락(claimStaffInvite)은 메일 주소를 정말 가진 사람인지 확인한다.
// 확인 전에는 초대가 붙지 않는데, 그 사실을 화면이 말해주지 않으면 사용자는 "가입 화면만
// 반복해서 나온다"고 느끼고 결국 자기 업체를 새로 만들어 버린다. 그러면 초대장은 영영 뜬 채로 남는다.

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { resendEmailVerification } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

export default function EmailVerifyNotice({ onDismiss }: { onDismiss: () => void }) {
  const email = useAuthStore((s) => s.user?.email);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await resendEmailVerification();
      setSent(true);
    } catch {
      setError('메일을 보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
        <MailCheck size={18} className="shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1 text-xs leading-5 text-amber-900">
          {sent ? (
            <>인증 메일을 다시 보냈습니다. 메일의 링크를 누른 뒤 다시 로그인하면 직원으로 들어옵니다.</>
          ) : (
            <>
              <b>직원 초대장이 와 있습니다.</b> 메일 주소({email ?? ''}) 확인이 끝나면 자동으로 들어옵니다.
              받은 메일의 링크를 누른 뒤 다시 로그인해 주세요.
            </>
          )}
          {error && <span className="ml-1 font-semibold text-red-700">{error}</span>}
        </div>
        <div className="flex shrink-0 gap-2">
          {!sent && (
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? '보내는 중…' : '인증 메일 다시 받기'}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-300"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
