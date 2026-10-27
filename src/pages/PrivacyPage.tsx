// 개인정보처리방침 — 실제로 처리하는 것만 적는다
//
// 고지와 실제 처리가 어긋나면 허위 고지가 된다. 기능을 추가할 때마다 이 문서를 함께 고친다.

import { Link } from 'react-router-dom';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { breadcrumbSchema, webPageSchema } from '@/lib/schema';
import BusinessInfo from '@/components/layout/BusinessInfo';

const UPDATED_AT = '2026-10-27';

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
                ['화상맞선 통화', '영상·음성 녹화본, 대화 전사본, 참여자·입장 시각 기록', '맞선 진행 증빙, 분쟁 대응'],
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

          <Section title="4. 화상맞선 통화의 녹화">
            <p>
              업체가 사이트 안에서 화상맞선을 열면 통화 전체가 <strong>영상·음성으로 녹화</strong>됩니다.
              녹화는 법이 요구하는 것이 아니라 weddingCORE의 운영 정책이며, 한국인 고객과 외국인
              후보 <strong>양쪽의 동의가 모두 확인된 때에만</strong> 통화가 열립니다. 동의를 받는 일은
              해당 업체가 직접 합니다.
            </p>
            <p className="mt-3">
              통화방에는 녹화가 진행 중임을 알리는 표시가 뜨며, 이 표시는 정책값이 아니라
              실제로 녹화가 걸렸을 때만 나타납니다. 통화방에서는 채팅·파일 전송·화면 공유를
              사용할 수 없습니다.
            </p>
            <p className="mt-3">
              녹화본은 아래 5항의 수탁자 저장소에 보관되며, 보관 기간은 6항에 적어 두었습니다.
            </p>
          </Section>

          <Section title="5. 처리 위탁과 국외 이전">
            <Table
              head={['수탁자', '위탁 업무', '처리 국가']}
              rows={[
                ['Google (Firebase)', '데이터 보관, 계정 인증, 서버 기능 실행', '대한민국(서울) · 운영 지원은 미국'],
                ['Cloudflare', '웹사이트 전송·보안, 화상맞선 녹화본 보관(R2)', '미국 등 국외'],
                ['LiveKit', '화상맞선 통화 중계와 녹화 생성', '국외'],
                ['Anthropic', 'AI 문서 초안·번역·상담 챗봇 응답 생성, 사업자등록증 사진 판독', '미국'],
                ['Solapi (솔라피)', '상담 접수 알림 문자 발송', '대한민국'],
                ['토스페이먼츠', '캐럿 충전·서비스 결제 처리', '대한민국'],
              ]}
            />
            <p className="mt-4">
              국외로 이전되는 항목은 위 업무 수행에 필요한 범위로 한정됩니다. 화상맞선의 경우
              영상·음성과 대화 전사본이 통화가 열릴 때마다 암호화된 전송 구간을 통해 이전되며,
              보유 기간은 아래 6항과 같습니다. 이전를 거부하실 수 있으나, 거부하시면 해당 기능을
              이용하실 수 없습니다. 수탁자가 변경되면 이 방침을 통해 알립니다.
            </p>
          </Section>

          <Section title="6. 보유 기간">
            <p>
              업체 가입 정보는 회원 탈퇴 시까지 보관하며, 탈퇴 후에는 관계 법령이 정한 기간을 제외하고
              지체 없이 파기합니다. 상담 접수 정보와 동의를 받아 보관한 상담 대화는 마지막 대화로부터
              1년이 지나면 매일 새벽 자동으로 파기합니다.
            </p>
            <p className="mt-3">
              고객 자료와 화상맞선 기록은 구분해 보관하고, 기간이 지나면 매일 새벽 자동으로 파기합니다.
            </p>
            <Table
              head={['구분', '보유 기간', '근거']}
              rows={[
                ['영상·음성 녹화본', '통화로부터 1년', 'weddingCORE 정책. 저장소 수명주기 규칙으로 자동 삭제됩니다.'],
                ['대화 전사본·통화 기록', '통화로부터 5년', '결혼중개업법 제10조의의 및 같은 법 시행규칙 제9조에 따른 서류 보존'],
                [
                  '고객 신상정보·서류(여권·범죄경력·건강진단서·소득증빙)',
                  '계약 종료로부터 5년',
                  '같은 조항의 서류 보존. 기간이 지나면 서류 파일까지 함께 파기하고, 개인정보가 없는 파기 기록만 남깁니다.',
                ],
              ]}
            />
            <p className="mt-4">
              영상을 더 짧게 두는 것은, 보존 의무가 「서류」를 대상으로 하고 있어 얼굴 영상을
              필요 없이 오래 보관하는 것이 오히려 개인정보 최소보관 원칙에 어긋나기 때문입니다.
            </p>
          </Section>

          <Section title="7. 이용자의 권리">
            <p>
              언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구하실 수 있습니다.
              아래 연락처로 요청하시면 지체 없이 조치합니다. 동의를 철회하시면 보관 중인 상담 대화를
              삭제합니다.
            </p>
          </Section>

          <Section title="8. 안전조치">
            <p>
              업체별 데이터는 서로 분리되어 다른 업체가 접근할 수 없도록 통제합니다. 전송 구간은
              암호화되며, 주요 기능은 접근 권한과 감사 기록을 두어 관리합니다.
            </p>
          </Section>

          <Section title="9. 자동으로 개인정보를 수집하는 장치의 설치·운영 및 거부 (네이버 광고 전환 추적)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                사용 목적: 네이버 검색광고를 보고 방문하신 분이 상담 신청 등으로 이어졌는지 확인해 광고
                효과를 측정합니다. (회원 업체 전용 화면에서는 수집하지 않습니다.)
              </li>
              <li>
                수집 항목: 방문한 페이지 주소, 이전에 머문 페이지(유입 경로), 광고 클릭 정보, 쿠키 등
                접속 기록. 성함·연락처·상담 내용은 보내지 않습니다.
              </li>
              <li>수집하는 곳: 네이버 주식회사(검색광고 전환 추적)</li>
              <li>
                거부 방법: 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다(예: 크롬 — 설정 › 개인정보
                및 보안 › 서드파티 쿠키). 거부하셔도 weddingCORE 이용에는 지장이 없습니다.
              </li>
            </ol>
          </Section>

          <Section title="10. 문의">
            <p>
              개인정보 보호책임자는 법률사무소 청송law 대표변호사 김창희입니다.
              전화 <a href="tel:16604452" className="font-medium text-emerald-700 underline">1660-4452</a>로
              연락하시거나, 아래 「상담 접수」에서 성함과 연락처를 남겨 주시면 확인 후 연락드립니다.
            </p>
            <p className="mt-3">
              <Link to="/check" className="font-medium text-emerald-700 underline">
                상담 접수 열기 — 요건 점검과 함께 연락처를 남길 수 있습니다
              </Link>
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <Link to="/" className="text-sm text-emerald-700 underline">
            홈으로 돌아가기
          </Link>
        </div>
        <BusinessInfo className="mt-8 border-t border-slate-200 pt-6" />
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
