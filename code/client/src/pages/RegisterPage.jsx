import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { api } from '../api/client';
import ErrorAlert from '../components/common/ErrorAlert';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    role: 'receiver',
    email: '',
    password: '',
    display_name: '',
    phone: '',
    language: '',
    biography: ''
  });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.auth.register(form);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <h1>Create account</h1>
        <p>Public registration supports receiver and provider accounts.</p>
        <ErrorAlert message={error} onClose={() => setError('')} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="receiver">Receiver</option>
              <option value="provider">Provider</option>
            </select>
          </label>
          <label>
            Email
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <label>
            Display name
            <input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          {form.role === 'receiver' ? (
            <label>
              Language
              <input value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} />
            </label>
          ) : (
            <label>
              Biography
              <textarea rows="4" value={form.biography} onChange={(event) => setForm({ ...form, biography: event.target.value })} />
            </label>
          )}
          <button className="button primary" type="submit" disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="auth-footnote">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
