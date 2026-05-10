import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { defaultPathForRole, isPathAllowedForRole } from '../../utils/roleAccess';
import ErrorBoundary from '../common/ErrorBoundary';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  if (user && !isPathAllowedForRole(user.role, location.pathname)) {
    return <Navigate to={defaultPathForRole(user.role)} replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="workspace">
        <Topbar />
        <main key={`${user?.role || 'guest'}:${user?.user_id || 'none'}`}>
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
