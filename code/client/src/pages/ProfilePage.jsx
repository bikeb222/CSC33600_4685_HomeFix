import React from 'react';
import { Save } from 'lucide-react';
import { api } from '../api/client';
import ErrorAlert from '../components/common/ErrorAlert';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../auth/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = React.useState({
    display_name: user?.display_name || '',
    phone: user?.phone || ''
  });
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      await api.users.update(user.user_id, form);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="My Profile" description="Account information connected to your Homefix role." />
      <ErrorAlert message={error} onClose={() => setError('')} />
      {message && <div className="alert success">{message}</div>}
      <section className="panel">
        <div className="detail-grid three">
          <div className="summary-strip"><span>Role</span><strong>{user.role}</strong></div>
          <div className="summary-strip"><span>Email</span><strong>{user.email}</strong></div>
          <div className="summary-strip"><span>Status</span><strong>{user.is_active ? 'Active' : 'Inactive'}</strong></div>
        </div>
        <form className="form-grid two" onSubmit={handleSubmit}>
          <label>
            Display name
            <input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <div className="form-actions end wide-panel">
            <button className="button primary" type="submit">
              <Save size={16} />
              Save Profile
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
