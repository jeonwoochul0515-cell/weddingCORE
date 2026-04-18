import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AgencySignupPage from './pages/AgencySignupPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import AgencyDashboardPage from './pages/AgencyDashboardPage';
import ClientListPage from './pages/ClientListPage';
import ClientDetailPage from './pages/ClientDetailPage';
import VisaSimulatorPage from './pages/VisaSimulatorPage';
import AdminAgenciesPage from './pages/AdminAgenciesPage';
import RegulatoryRadarPage from './pages/RegulatoryRadarPage';
import BackgroundInfoPage from './pages/BackgroundInfoPage';
import MatchingPage from './pages/MatchingPage';
import MbtiTestPage from './pages/MbtiTestPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 공개 */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/visa-simulator" element={<VisaSimulatorPage />} />
      <Route path="/mbti-test" element={<MbtiTestPage />} />

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
        </Route>
      </Route>

      {/* 관리자 */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/agencies" element={<AdminAgenciesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
