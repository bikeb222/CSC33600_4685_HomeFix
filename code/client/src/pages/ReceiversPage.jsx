import React from 'react';
import { Edit3, Home, MapPin, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import Alert from '../components/Alert';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PageHeader from '../components/common/PageHeader';
import { currency, shortDateTime } from '../utils/format';

const emptyReceiver = {
  username: '',
  email: '',
  password: '',
  phone: '',
  language: ''
};

const emptyAddress = {
  street: '',
  city: '',
  state: '',
  zip_code: '',
  is_default: false
};

export default function ReceiversPage() {
  const [receivers, setReceivers] = React.useState([]);
  const [form, setForm] = React.useState(emptyReceiver);
  const [addressForm, setAddressForm] = React.useState(emptyAddress);
  const [editingId, setEditingId] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [addresses, setAddresses] = React.useState([]);
  const [appointments, setAppointments] = React.useState([]);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  async function load() {
    try {
      setError('');
      setReceivers(await api.receivers.list());
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDetails(receiver) {
    if (!receiver) {
      setSelected(null);
      setAddresses([]);
      setAppointments([]);
      return;
    }

    try {
      setError('');
      setSelected(receiver);
      const [addressRows, appointmentRows] = await Promise.all([
        api.receivers.addresses(receiver.receiver_id),
        api.receivers.appointments(receiver.receiver_id)
      ]);
      setAddresses(addressRows);
      setAppointments(appointmentRows);
    } catch (err) {
      setError(err.message);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const sortedReceivers = React.useMemo(
    () => [...receivers].sort((a, b) => Number(a.receiver_id) - Number(b.receiver_id)),
    [receivers]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyReceiver);
    setEditingId(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.username.trim() || !form.email.trim() || (!editingId && !form.password.trim())) {
      setError('Username, email, and password are required for new receivers.');
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
        await api.receivers.update(editingId, payload);
        setNotice('Receiver updated.');
      } else {
        await api.receivers.create(payload);
        setNotice('Receiver created.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeReceiver() {
    if (!deleteTarget) {
      return;
    }
    try {
      setError('');
      const id = deleteTarget.receiver_id;
      await api.receivers.remove(id);
      if (selected?.receiver_id === id) {
        await loadDetails(null);
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addAddress(event) {
    event.preventDefault();
    if (!selected) {
      setError('Select a receiver first.');
      return;
    }
    if (!addressForm.street.trim() || !addressForm.city.trim()) {
      setError('Street and city are required.');
      return;
    }

    try {
      setError('');
      await api.receivers.addAddress(selected.receiver_id, addressForm);
      setAddressForm(emptyAddress);
      await loadDetails(selected);
    } catch (err) {
      setError(err.message);
    }
  }

  async function setDefault(addressId) {
    try {
      setError('');
      await api.receivers.setDefaultAddress(selected.receiver_id, addressId);
      await loadDetails(selected);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeAddress(addressId) {
    try {
      setError('');
      await api.addresses.remove(addressId);
      await loadDetails(selected);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Customer operations"
        title="Receivers"
        description="Manage customers, service addresses, and booking history."
      />
      <div className="page-grid">
        <section className="panel form-panel">
        <div className="panel-heading">
          <h2>{editingId ? 'Edit Receiver' : 'New Receiver'}</h2>
        </div>
        <Alert message={error} onClose={() => setError('')} />
        <Alert message={notice} type="success" onClose={() => setNotice('')} />
        <form onSubmit={submit} className="form-grid">
          <label>
            Username
            <input value={form.username} onChange={(event) => updateField('username', event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} required={!editingId} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
          </label>
          <label>
            Language
            <input value={form.language} onChange={(event) => updateField('language', event.target.value)} />
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
        title="Receivers"
        rows={sortedReceivers}
        rowKey="receiver_id"
        searchFields={['username', 'email', 'phone', 'language']}
        columns={[
          { key: 'receiver_id', label: 'ID' },
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'address_count', label: 'Addresses' },
          { key: 'appointment_count', label: 'Appointments' }
        ]}
        actions={(row) => (
          <>
            <button className="icon-button" type="button" onClick={() => loadDetails(row)} aria-label="View receiver">
              <Home size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => {
              setEditingId(row.receiver_id);
              setForm({
                username: row.username,
                email: row.email,
                password: '',
                phone: row.phone || '',
                language: row.language || ''
              });
            }} aria-label="Edit receiver">
              <Edit3 size={16} />
            </button>
            <button className="icon-button danger" type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete receiver">
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
          <div className="detail-stack">
            <div>
              <h3>Addresses</h3>
              <form className="inline-form" onSubmit={addAddress}>
                <input placeholder="Street" value={addressForm.street} onChange={(event) => setAddressForm((current) => ({ ...current, street: event.target.value }))} required />
                <input placeholder="City" value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} required />
                <input placeholder="State" value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} />
                <input placeholder="Zip" value={addressForm.zip_code} onChange={(event) => setAddressForm((current) => ({ ...current, zip_code: event.target.value }))} />
                <label className="check-line">
                  <input type="checkbox" checked={addressForm.is_default} onChange={(event) => setAddressForm((current) => ({ ...current, is_default: event.target.checked }))} />
                  Default
                </label>
                <button className="button secondary" type="submit">
                  <MapPin size={16} />
                  Add
                </button>
              </form>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Default</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addresses.map((address) => (
                      <tr key={address.address_id}>
                        <td>{address.street}, {address.city}, {address.state} {address.zip_code}</td>
                        <td>{address.is_default ? 'Yes' : 'No'}</td>
                        <td className="row-actions">
                          {!address.is_default && (
                            <button className="button mini" type="button" onClick={() => setDefault(address.address_id)}>Default</button>
                          )}
                          <button className="icon-button danger" type="button" onClick={() => removeAddress(address.address_id)} aria-label="Delete address">
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
                      <th>Service</th>
                      <th>Provider</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.app_id}>
                        <td>{appointment.service_name}</td>
                        <td>{appointment.provider_name}</td>
                        <td>{shortDateTime(appointment.scheduled_time)}</td>
                        <td><StatusBadge value={appointment.appointment_status} /></td>
                        <td>{currency(appointment.estimated_total)}</td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr><td colSpan="5" className="empty-cell">No data</td></tr>
                    )}
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
        title="Delete receiver"
        message={`Delete ${deleteTarget?.username}? This may fail if appointments still reference this receiver.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={removeReceiver}
      />
    </div>
  );
}
