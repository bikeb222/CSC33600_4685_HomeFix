import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarPlus, LogOut, Search } from 'lucide-react';
import { roleNavItems } from '../../utils/constants';
import { useAuth } from '../../auth/useAuth';

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const items = roleNavItems[user?.role] || roleNavItems.manager;
  const current = items.find((item) => item.path === location.pathname) || items[0];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <span className="eyebrow">Homefix admin</span>
        <h1>{current.title}</h1>
        <p>{current.subtitle}</p>
      </div>

      <div className="topbar-actions">
        <label className="topbar-search">
          <Search size={16} />
          <input placeholder="Search workspace" />
        </label>
        {user?.role !== 'provider' && (
          <Link className="button primary" to="/appointments?new=1">
            <CalendarPlus size={16} />
            New Appointment
          </Link>
        )}
        <div className="admin-chip">
          <span>{user?.role}</span>
          <strong>{user?.display_name}</strong>
        </div>
        <button className="icon-button" type="button" onClick={handleLogout} title="Log out">
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
