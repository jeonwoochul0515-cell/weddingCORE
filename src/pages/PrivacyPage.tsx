// 개인정보처리방침 — 실제로 처리하는 것만 적는다
//
// 고지와 실제 처리가 어긋나면 허위 고지가 된다. 기능을 추가할 때마다 이 문서를 함께 고친다.

import { Link } from 'react-router-dom';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { breadcrumbSchema, webPageSchema } from '@/lib/schema';

const UPDATED_AT = '2026-08-28';

export default function PrivacyPage() {
  usePageMeta({
    title: '개인정보처리방침',
    description: 'weddingCORE가 수집·이용하는 개인정보의 항목과 보유 기간, 처리 위탁과 국외 이전, 이용자가 행사할 수 있는 권리를 안내합니다.',
    path: '/privacy',
  });

  const schemas = [
    breadcrumbSchema([
      { name: 'weddingCORE', path: '/' },
      { name: '개인정보처리방침', path: '/privacy' },
    ]),
    webPageSchema({
      name: '개인정보처리방침',
      description: 'weddingCORE가 수집·이용하는 개인정보의 항목과 처리 방법을 안내합니다.',
      path: '/privacy',
      updated: UPDATED_AT,
    }),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <Link to="/" aria-label="weddingCORE 홈">
          <BrandMark />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">개인정보처리방침</h1>
        <p className="mt-3 text-sm text-slate-500">최종 개정일 {UPDATED_AT}</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-slate-700">
          <Section title="1. 수집하는 항목과 이용 목적">
            <Table
              rows={[
                ['업체 가입', '상호, 사업자등록번호, 결혼중개업 등록번호, 대표자 성명, 연락처, 사업장 주소, 등록증 사본', '가입 심사, 서비스 제공, 공지'],
                ['상담 접수', '성함, 연락처, (선택 동의 시) 상담 대화 내용', '문의 회신'],
                ['서비스 이용', '접속 일시, 서비스 이용 기록', '보안, 장애 대응'],
              ]}
            />
            <p className="mt-4">
              주민등록번호, 계좌번호, 신용카드 정보는 수집하지 않습니다. 상담 챗봇도 이러한 정보를
              묻지 않으며, 입력하지 않으시기를 권합니다.
            </p>
          </Section>

          <Section title="2. 상담 챗봇 '하람'">
            <p>
              사이트의 상담 챗봇과 나눈 대화는 <strong>서버에 저장하지 않습니다.</strong> 대화 내용은
              이용자의 브라우저에만 보관되며 브라우저를 닫으면 사라집니다.
            </p>
            <p className="mt-3">
              다만 답변을 만들기 위해 대화 내용이 AI 처리 사업자(Anthropic)의 서버로 전송됩니다.
              민감한 정보나 고객의 신상은 입력하지 말아 주세요.
            </p>
            <p className="mt-3">
              상담 접수 시 <strong>&ldquo;대화 내용 함께 전달&rdquo;에 동의하신 경우에 한해</strong> 그때까지의 대화와
              이후 이어지는 대화를 보안 저장소에 보관하고 상담 담당자가 열람합니다. 이 동의는 기본
              해제 상태이며, 동의하지 않으셔도 상담 접수는 정상적으로 이루어집니다.
            </p>
          </Section>

          <Section title="3. 업체가 입력한 고객 정보의 처리">
            <p>
              가입 업체가 자사 고객 정보를 입력하는 경우, 그 정보의 개인정보처리자는 해당 업체이며
              weddingCORE는 업체의 위탁을 받아 보관·처리하는 수탁자입니다. 업체는 자사 고객으로부터
              필요한 동의를 직접 받아야 합니다.
            </p>
            <p className="mt-3">
              AI 문서 초안 생성과 번역 기능은 <strong>고객의 개인정보 처리 동의 증빙이 등록된 경우에만</strong>{' '}
              동작합니다. 동의 증빙이 없으면 기능이 차단됩니다.
            </p>
          </Section>

          <Section title="4. 처리 위탁">
            <Table
              head={['수탁자', '위탁 업무']}
              rows={[
                ['Google (Firebase)', '데이터 보관, 계정 인증, 서버 기능 실행'],
                ['Cloudflare', '웹사이트 전송, 보안'],
                ['Anthropic', 'AI 문서 초안·번역·상담 챗봇 응답 생성'],
                ['Solapi (솔라피)', '상담 접수 알림 문자 발송'],
              ]}
            />
            <p className="mt-4">
              수탁자가 변경되면 이 방침을 통해 알립니다. 국외 이전이 포함된 서비스가 있으며,
              이전되는 항목은 위 위탁 업무 수행에 필요한 범위로 한정됩니다.
            </p>
          </Section>

          <Section title="5. 보유 기간">
            <p>
              업체 가입 정보는 회원 탈퇴 시까지 보관하며, 탈퇴 후에는 관계 법령이 정한 기간을 제외하고
              지체 없이 파기합니다. 상담 접수 정보는 문의 처리 후 1년간 보관 후 파기합니다.
              동의를 받아 보관한 상담 대화는 상담 종료 후 1년간 보관합니다.
            </p>
          </Section>

          <Section title="6. 이용자의 권리">
            <p>
              언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구하실 수 있습니다.
              아래 연락처로 요청하시면 지체 없이 조치합니다. 동의를 철회하시면 보관 중인 상담 대화를
              삭제합니다.
            </p>
          </Section>

          <Section title="7. 안전조치">
            <p>
              업체별 데이터는 서로 분리되어 다른 업체가 접근할 수 없도록 통제합니다. 전송 구간은
              암호화되며, 주요 기능은 접근 권한과 감사 기록을 두어 관리합니다.
            </p>
          </Section>

          <Section title="8. 문의">
            <p>
              개인정보 관련 문의는 사이트의 상담 접수를 통해 남겨 주시면 확인 후 연락드립니다.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <Link to="/" className="text-sm text-emerald-700 underline">
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head?: string[]; rows: string[][] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-300 bg-slate-100">
            {(head ?? ['구분', '항목', '목적']).map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-slate-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-slate-200 align-top">
              {r.map((c, i) => (
                <td key={i} className="px-3 py-2.5 leading-5 text-slate-600">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
