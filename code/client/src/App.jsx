import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';
import DashboardPage from './pages/DashboardPage';
import ReceiversPage from './pages/ReceiversPage';
import ProvidersPage from './pages/ProvidersPage';
import ServicesPage from './pages/ServicesPage';
import AppointmentsPage from './pages/AppointmentsPage';
import PaymentsPage from './pages/PaymentsPage';
import ReviewsPage from './pages/ReviewsPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';
import AiChatPage from './pages/AiChatPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route element={<RoleRoute roles={['manager']} />}>
            <Route path="receivers" element={<ReceiversPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="ai-assistant" element={<AiChatPage mode="manager" />} />
          </Route>
          <Route element={<RoleRoute roles={['receiver']} />}>
            <Route path="ai-support" element={<AiChatPage mode="receiver" />} />
          </Route>
          <Route path="services" element={<ServicesPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
