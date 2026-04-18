import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Scale, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="text-lg font-semibold text-slate-900">weddingCORE</div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/visa-simulator" className="text-slate-700 hover:text-slate-900">
            F-6 비자 시뮬레이터
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
          >
            업체 로그인
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          국제결혼중개업의<br />법적 리스크를 자동으로 차단합니다
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          결혼중개업법 준수를 자동화하고, F-6 비자 승인 가능성을 사전에 검증하는 B2B 플랫폼.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/visa-simulator"
            className="flex items-center gap-1 rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            F-6 비자 시뮬레이터 체험 <ArrowRight size={14} />
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            업체 등록 문의
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
          <Feature
            icon={Scale}
            title="컴플라이언스 타임라인"
            body="결혼중개업법 42개 의무를 고객별 타임라인으로 자동 전개. 기한 임박 자동 알림."
          />
          <Feature
            icon={Shield}
            title="나란히 보기 (이중언어)"
            body="신상정보 교환을 한국어·모국어로 병렬 표시. 정보 비대칭을 시각적으로 차단."
          />
          <Feature
            icon={CheckCircle2}
            title="F-6 비자 시뮬레이터"
            body="소득요건·진정성·서류를 사전 검증. 불허 리스크를 신청 전에 발견."
          />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-500">
        © weddingCORE · 국제결혼 법률 컴플라이언스 플랫폼
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Scale;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 inline-flex rounded-full bg-slate-100 p-3 text-slate-900">
        <Icon size={22} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
