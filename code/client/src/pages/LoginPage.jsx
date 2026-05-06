import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../auth/useAuth';
import { defaultPathForRole, isPathAllowedForRole } from '../utils/roleAccess';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = React.useState({ email: 'manager@homefix.com', password: 'Password123!' });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  if (isAuthenticated) {
    return <Navigate to={defaultPathForRole(user?.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      const nextUser = await login(form);
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
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>Homefix</strong>
            <span>Role-based workspace</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p>Use a seeded account to enter the correct manager, provider, or receiver workspace.</p>
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
          <code>manager@homefix.com / Password123!</code>
          <code>receiver1@homefix.com / Password123!</code>
          <code>provider1@homefix.com / Password123!</code>
        </div>
        <p className="auth-footnote">
          <Link to="/register">Create a receiver or provider account</Link>
        </p>
      </section>
    </main>
  );
}
