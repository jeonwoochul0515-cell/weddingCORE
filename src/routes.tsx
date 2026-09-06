// 라우트 정의. 공개 페이지는 즉시, 로그인이 필요한 화면은 지연 로드한다.
//
// 로그인 뒤 화면들은 Firebase(약 530KB)를 쓴다. 이를 정적으로 불러오면 홈·시뮬레이터만
// 보러 온 방문자도 그 용량을 함께 받게 되어 첫 화면이 늦어진다. 지연 로드로 분리한다.

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import VisaSimulatorPage from './pages/VisaSimulatorPage';
import MbtiTestPage from './pages/MbtiTestPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPage from './pages/PrivacyPage';

const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AgencySignupPage = lazy(() => import('./pages/AgencySignupPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const AgencyDashboardPage = lazy(() => import('./pages/AgencyDashboardPage'));
const ClientListPage = lazy(() => import('./pages/ClientListPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const AdminAgenciesPage = lazy(() => import('./pages/AdminAgenciesPage'));
const RegulatoryRadarPage = lazy(() => import('./pages/RegulatoryRadarPage'));
const BackgroundInfoPage = lazy(() => import('./pages/BackgroundInfoPage'));
const MatchingPage = lazy(() => import('./pages/MatchingPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const AutomationCenterPage = lazy(() => import('./pages/AutomationCenterPage'));
const LawyerWorkbenchPage = lazy(() => import('./pages/LawyerWorkbenchPage'));
const MarketingCenterPage = lazy(() => import('./pages/MarketingCenterPage'));
const VisaWorkCenterPage = lazy(() => import('./pages/VisaWorkCenterPage'));
const PrecedentsPage = lazy(() => import('./pages/PrecedentsPage'));
const OfficePage = lazy(() => import('./pages/OfficePage'));
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const LawMapPage = lazy(() => import('./pages/LawMapPage'));
const LawArticlePage = lazy(() => import('./pages/LawArticlePage'));
const GuideDetailPage = lazy(() => import('./pages/GuideDetailPage'));
// 빠른 요건 점검. 업체 홈페이지에 iframe으로 들어가므로 가볍게 유지한다(Firebase를 쓰지 않는다).
const QuickCheckPage = lazy(() => import('./pages/QuickCheckPage'));
const EmbedCheckPage = lazy(() => import('./pages/EmbedCheckPage'));

function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center text-slate-400">불러오는 중…</div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* 공개 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/visa-simulator" element={<VisaSimulatorPage />} />
        <Route path="/check" element={<QuickCheckPage />} />
        <Route path="/embed/check" element={<EmbedCheckPage />} />
        <Route path="/mbti-test" element={<MbtiTestPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        {/* 결혼중개업법 해석 — 검색으로 들어오는 공개 입구 */}
        <Route path="/law" element={<LawMapPage />} />
        <Route path="/law/:slug" element={<LawArticlePage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuideDetailPage />} />

        {/* 로그인 후: 가입/대기 분기 */}
        <Route path="/signup/agency" element={<AgencySignupPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />

        {/* 업체 본진 (승인 완료 필요) */}
        <Route element={<ProtectedRoute allowedRoles={['owner', 'manager', 'staff', 'readonly']} />}>
          <Route element={<AppLayout />}>
            <Route path="/agency" element={<AgencyDashboardPage />} />
            <Route path="/agency/clients" element={<ClientListPage />} />
            <Route path="/agency/clients/:clientId" element={<ClientDetailPage />} />
            <Route path="/agency/clients/:clientId/background-info" element={<BackgroundInfoPage />} />
            <Route path="/agency/regulatory" element={<RegulatoryRadarPage />} />
            <Route path="/agency/matching" element={<MatchingPage />} />
            <Route path="/agency/partners" element={<PartnersPage />} />
            <Route path="/agency/automation" element={<AutomationCenterPage />} />
            <Route path="/agency/marketing" element={<MarketingCenterPage />} />
            <Route path="/agency/visa" element={<VisaWorkCenterPage />} />
            <Route path="/agency/precedents" element={<PrecedentsPage />} />
            <Route path="/agency/office" element={<OfficePage />} />
            {/* 결제 결과 — 토스에서 돌아오는 곳 */}
            <Route path="/payment/success" element={<PaymentResultPage mode="success" />} />
            <Route path="/payment/fail" element={<PaymentResultPage mode="fail" />} />
          </Route>
        </Route>

        {/* 변호사 검토 백엔드 */}
        <Route element={<ProtectedRoute allowedRoles={['lawyer', 'admin']} />}>
          <Route element={<AppLayout />}>
            <Route path="/lawyer/reviews" element={<LawyerWorkbenchPage />} />
          </Route>
        </Route>

        {/* 관리자 */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/agencies" element={<AdminAgenciesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
