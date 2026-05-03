import React from 'react';
import { Edit3, Link2, Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PageHeader from '../components/common/PageHeader';
import SearchAndFilterBar from '../components/common/SearchAndFilterBar';
import { currency, shortDateTime } from '../utils/format';

const providerStatuses = ['active', 'resting', 'inactive', 'suspended'];

const emptyProvider = {
  username: '',
  email: '',
  password: '',
  phone: '',
  provider_status: 'active',
  biography: ''
};

const emptyLink = {
  service_id: '',
  base_hourly_rate: ''
};

export default function ProvidersPage() {
  const [providers, setProviders] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [providerServices, setProviderServices] = React.useState([]);
  const [appointments, setAppointments] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [form, setForm] = React.useState(emptyProvider);
  const [linkForm, setLinkForm] = React.useState(emptyLink);
  const [editingId, setEditingId] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  async function load() {
    try {
      setError('');
      const [providerRows, serviceRows] = await Promise.all([
        api.providers.list(),
        api.services.list()
      ]);
      setProviders(providerRows);
      setServices(serviceRows);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDetails(provider) {
    if (!provider) {
      setSelected(null);
      setProviderServices([]);
      setAppointments([]);
      setReviews([]);
      return;
    }

    try {
      setError('');
      setSelected(provider);
      const [serviceRows, appointmentRows, reviewRows] = await Promise.all([
        api.providers.services(provider.provider_id),
        api.providers.appointments(provider.provider_id),
        api.providers.reviews(provider.provider_id)
      ]);
      setProviderServices(serviceRows);
      setAppointments(appointmentRows);
      setReviews(reviewRows);
    } catch (err) {
      setError(err.message);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(emptyProvider);
    setEditingId(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.username.trim() || !form.email.trim() || (!editingId && !form.password.trim())) {
      setError('Username, email, and password are required for new providers.');
      return;
    }

    try {
      setError('');
      setNotice('');
      const payload = { ...form };
      if (editingId && !payload.password) {
        delete payload.password;
      }
      if (editingId) {
        await api.providers.update(editingId, payload);
        setNotice('Provider updated.');
      } else {
        await api.providers.create(payload);
        setNotice('Provider created.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeProvider() {
    if (!deleteTarget) {
      return;
    }
    try {
      setError('');
      const id = deleteTarget.provider_id;
      await api.providers.remove(id);
      if (selected?.provider_id === id) {
        await loadDetails(null);
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addService(event) {
    event.preventDefault();
    if (!selected) {
      setError('Select a provider first.');
      return;
    }
    if (!linkForm.service_id || Number(linkForm.base_hourly_rate) < 0) {
      setError('Service and non-negative hourly rate are required.');
      return;
    }

    try {
      setError('');
      await api.providers.addService(selected.provider_id, linkForm);
      setLinkForm(emptyLink);
      await loadDetails(selected);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeService(serviceId) {
    try {
      setError('');
      await api.providers.removeService(selected.provider_id, serviceId);
      await loadDetails(selected);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredProviders = providers.filter((provider) => {
    const haystack = [provider.username, provider.email, provider.phone, provider.biography, provider.provider_status].join(' ').toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!statusFilter || provider.provider_status === statusFilter);
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Provider operations"
        title="Providers"
        description="Manage service professionals, availability, and hourly rates."
      />
      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search username, email, phone, or biography"
        filters={(
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All provider statuses</option>
            {providerStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        )}
      />
      <div className="page-grid">
        <section className="panel form-panel">
        <div className="panel-heading">
          <h2>{editingId ? 'Edit Provider' : 'New Provider'}</h2>
        </div>
        <Alert message={error} onClose={() => setError('')} />
        <Alert message={notice} type="success" onClose={() => setNotice('')} />
        <form onSubmit={submit} className="form-grid">
          <label>
            Username
            <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required={!editingId} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label>
            Status
            <select value={form.provider_status} onChange={(event) => setForm((current) => ({ ...current, provider_status: event.target.value }))}>
              {providerStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            Biography
            <textarea value={form.biography} onChange={(event) => setForm((current) => ({ ...current, biography: event.target.value }))} rows="4" />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingId ? <Save size={16} /> : <Plus size={16} />}
              {editingId ? 'Save' : 'Create'}
            </button>
            {editingId && (
              <button className="button ghost" type="button" onClick={resetForm}>
                <X size={16} />
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <DataTable
        title="Providers"
        rows={filteredProviders}
        rowKey="provider_id"
        columns={[
          { key: 'provider_id', label: 'ID' },
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'provider_status', label: 'Status', render: (row) => <StatusBadge value={row.provider_status} /> },
          { key: 'service_count', label: 'Services' },
          { key: 'appointment_count', label: 'Appointments' }
        ]}
        actions={(row) => (
          <>
            <button className="icon-button" type="button" onClick={() => loadDetails(row)} aria-label="View provider">
              <UserRound size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => {
              setEditingId(row.provider_id);
              setForm({
                username: row.username,
                email: row.email,
                password: '',
                phone: row.phone || '',
                provider_status: row.provider_status,
                biography: row.biography || ''
              });
            }} aria-label="Edit provider">
              <Edit3 size={16} />
            </button>
            <button className="icon-button danger" type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete provider">
              <Trash2 size={16} />
            </button>
          </>
        )}
      />

        {selected && (
        <section className="panel wide-panel">
          <div className="panel-heading">
            <div>
              <h2>{selected.username}</h2>
              <p>{selected.email}</p>
            </div>
          </div>
          <div className="detail-grid three">
            <div>
              <h3>Services</h3>
              <form className="inline-form" onSubmit={addService}>
                <select value={linkForm.service_id} onChange={(event) => setLinkForm((current) => ({ ...current, service_id: event.target.value }))} required>
                  <option value="">Service</option>
                  {services.map((service) => (
                    <option key={service.service_id} value={service.service_id}>{service.service_name}</option>
                  ))}
                </select>
                <input type="number" min="0" step="0.01" placeholder="Hourly rate" value={linkForm.base_hourly_rate} onChange={(event) => setLinkForm((current) => ({ ...current, base_hourly_rate: event.target.value }))} required />
                <button className="button secondary" type="submit">
                  <Link2 size={16} />
                  Add
                </button>
              </form>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerServices.map((service) => (
                      <tr key={service.service_id}>
                        <td>{service.service_name}</td>
                        <td>{currency(service.base_hourly_rate)}</td>
                        <td>
                          <button className="icon-button danger" type="button" onClick={() => removeService(service.service_id)} aria-label="Remove service">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3>Appointments</h3>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Receiver</th>
                      <th>Service</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.app_id}>
                        <td>{appointment.receiver_name}</td>
                        <td>{appointment.service_name}</td>
                        <td>{shortDateTime(appointment.scheduled_time)}</td>
                        <td><StatusBadge value={appointment.appointment_status} /></td>
                      </tr>
                    ))}
                    {appointments.length === 0 && <tr><td colSpan="4" className="empty-cell">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3>Reviews</h3>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Rating</th>
                      <th>Direction</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.review_id}>
                        <td>{review.rating}</td>
                        <td>{review.review_direction}</td>
                        <td>{review.comment}</td>
                      </tr>
                    ))}
                    {reviews.length === 0 && <tr><td colSpan="3" className="empty-cell">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete provider"
        message={`Delete ${deleteTarget?.username}? This may fail if appointments still reference this provider.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={removeProvider}
      />
    </div>
  );
}
