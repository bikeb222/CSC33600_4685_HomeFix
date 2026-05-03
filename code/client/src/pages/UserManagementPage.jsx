import React from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '../api/client';
import DataTable from '../components/DataTable';
import ErrorAlert from '../components/common/ErrorAlert';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  role: 'receiver',
  email: '',
  password: 'Password123!',
  display_name: '',
  phone: '',
  language: '',
  biography: '',
  department: ''
};

export default function UserManagementPage() {
  const [users, setUsers] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm);
  const [error, setError] = React.useState('');

  async function load() {
    setUsers(await api.users.list());
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function createUser(event) {
    event.preventDefault();
    try {
      setError('');
      await api.users.create(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleUser(row) {
    try {
      await api.users.update(row.user_id, { is_active: !row.is_active });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="User Management" description="Create role accounts and enable or disable login access." />
      <ErrorAlert message={error} onClose={() => setError('')} />
      <section className="panel">
        <form className="form-grid two" onSubmit={createUser}>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="manager">Manager</option>
              <option value="provider">Provider</option>
              <option value="receiver">Receiver</option>
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
          <label>
            Role detail
            <input
              value={form.role === 'manager' ? form.department : form.role === 'provider' ? form.biography : form.language}
              onChange={(event) => {
                const key = form.role === 'manager' ? 'department' : form.role === 'provider' ? 'biography' : 'language';
                setForm({ ...form, [key]: event.target.value });
              }}
              placeholder={form.role === 'manager' ? 'Department' : form.role === 'provider' ? 'Biography' : 'Language'}
            />
          </label>
          <div className="form-actions end wide-panel">
            <button className="button primary" type="submit">
              <UserPlus size={16} />
              Create User
            </button>
          </div>
        </form>
      </section>
      <DataTable
        title="Users"
        rows={users}
        rowKey="user_id"
        columns={[
          { key: 'user_id', label: 'ID' },
          { key: 'display_name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (row) => <StatusBadge value={row.role} /> },
          { key: 'is_active', label: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <button className="button mini" type="button" onClick={() => toggleUser(row)}>
                {row.is_active ? 'Disable' : 'Enable'}
              </button>
            )
          }
        ]}
      />
    </div>
  );
}
