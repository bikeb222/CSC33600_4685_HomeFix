import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
