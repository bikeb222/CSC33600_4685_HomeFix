import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../auth/useAuth';
import { defaultPathForRole, isPathAllowedForRole } from '../utils/roleAccess';

const roleConfig = {
  receiver: {
    label: 'Receiver',
    path: '/login',
    email: 'receiver1@homefix.com',
    copy: 'Book services, track appointments, pay invoices, and review providers.'
  },
  provider: {
    label: 'Provider',
    path: '/login/provider',
    email: 'provider1@homefix.com',
    copy: 'Manage assigned appointments, skills, reviews, and unavailable time.'
  },
  manager: {
    label: 'Manager',
    path: '/login/manager',
    email: 'manager@homefix.com',
    copy: 'Monitor operations, approve provider skills, manage users, and review reports.'
  }
};

function roleFromPath(pathname) {
  if (pathname.includes('/login/provider')) {
    return 'provider';
  }
  if (pathname.includes('/login/manager')) {
    return 'manager';
  }
  return 'receiver';
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = roleFromPath(location.pathname);
  const activeRole = roleConfig[role];
  const [form, setForm] = React.useState({ email: activeRole.email, password: 'Password123!' });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setForm({ email: activeRole.email, password: 'Password123!' });
    setError('');
  }, [activeRole.email]);

  if (isAuthenticated) {
    return <Navigate to={defaultPathForRole(user?.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      const nextUser = await login({ ...form, role });
      const requestedPath = location.state?.from?.pathname || '/';
      const nextPath = isPathAllowedForRole(nextUser.role, requestedPath)
        ? requestedPath
        : defaultPathForRole(nextUser.role);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <nav className="auth-role-nav" aria-label="Sign-in role">
        {Object.entries(roleConfig).map(([key, config]) => (
          <Link
            className={key === role ? 'active' : ''}
            key={key}
            to={config.path}
          >
            {config.label}
          </Link>
        ))}
      </nav>
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>Homefix</strong>
            <span>Role-based workspace</span>
          </div>
        </div>
        <h1>{activeRole.label} sign in</h1>
        <p>{activeRole.copy}</p>
        <ErrorAlert message={error} onClose={() => setError('')} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="demo-accounts">
          <span>Demo accounts</span>
          <code>receiver1@homefix.com / Password123!</code>
          <code>provider1@homefix.com / Password123!</code>
          <code>manager@homefix.com / Password123!</code>
          <code>receiver1@homefix.com also exists as a provider demo account.</code>
        </div>
        <p className="auth-footnote">
          <Link to="/register">Create a receiver or provider account</Link>
        </p>
      </section>
    </main>
  );
}
