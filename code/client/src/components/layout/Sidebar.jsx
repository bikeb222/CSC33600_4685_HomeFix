import { NavLink } from 'react-router-dom';
import { roleNavItems } from '../../utils/constants';
import { useAuth } from '../../auth/useAuth';

export default function Sidebar() {
  const { user } = useAuth();
  const items = roleNavItems[user?.role] || roleNavItems.manager;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div>
          <strong>Homefix</strong>
          <span>Service Operations</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
