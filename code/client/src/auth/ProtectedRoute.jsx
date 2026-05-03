import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingState from '../components/common/LoadingState';
import { useAuth } from './AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
