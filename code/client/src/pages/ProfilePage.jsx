import React from 'react';
import { MapPin, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ErrorAlert from '../components/common/ErrorAlert';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../auth/useAuth';

const emptyAddress = {
  street: '',
  city: '',
  state: 'NY',
  zip_code: '',
  is_default: false
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = React.useState({
    display_name: user?.display_name || '',
    phone: user?.phone || ''
  });
  const [addresses, setAddresses] = React.useState([]);
  const [addressForm, setAddressForm] = React.useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = React.useState(null);
  const [deleteAddressTarget, setDeleteAddressTarget] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  async function loadAddresses() {
    if (user?.role !== 'receiver') {
      return;
    }
    setAddresses(await api.receivers.addresses(user.receiver_id));
  }

  React.useEffect(() => {
    loadAddresses().catch((err) => setError(err.message));
  }, [user?.role, user?.receiver_id]);

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

  async function handleAddressSubmit(event) {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      if (editingAddressId) {
        await api.addresses.update(editingAddressId, addressForm);
      } else {
        await api.receivers.addAddress(user.receiver_id, addressForm);
      }
      setAddressForm(emptyAddress);
      setEditingAddressId(null);
      await loadAddresses();
      setMessage(editingAddressId ? 'Address updated.' : 'Address added.');
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditAddress(address) {
    setError('');
    setMessage('');
    setEditingAddressId(address.address_id);
    setAddressForm({
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zip_code: address.zip_code || '',
      is_default: Boolean(address.is_default)
    });
  }

  function cancelEditAddress() {
    setEditingAddressId(null);
    setAddressForm(emptyAddress);
  }

  async function removeAddress() {
    if (!deleteAddressTarget) {
      return;
    }
    try {
      setError('');
      setMessage('');
      await api.addresses.remove(deleteAddressTarget.address_id);
      if (Number(editingAddressId) === Number(deleteAddressTarget.address_id)) {
        cancelEditAddress();
      }
      setDeleteAddressTarget(null);
      await loadAddresses();
      setMessage('Address deleted.');
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
      {user.role === 'receiver' && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>My Addresses</h2>
              <p>Add service locations for future appointments.</p>
            </div>
            <MapPin size={22} />
          </div>
          <form className="form-grid two" onSubmit={handleAddressSubmit}>
            <label>
              Street
              <input
                value={addressForm.street}
                onChange={(event) => setAddressForm({ ...addressForm, street: event.target.value })}
                required
              />
            </label>
            <label>
              City
              <input
                value={addressForm.city}
                onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })}
                required
              />
            </label>
            <label>
              State
              <input
                value={addressForm.state}
                onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })}
              />
            </label>
            <label>
              Zip code
              <input
                value={addressForm.zip_code}
                onChange={(event) => setAddressForm({ ...addressForm, zip_code: event.target.value })}
              />
            </label>
            <label className="check-line wide-panel">
              <input
                type="checkbox"
                checked={addressForm.is_default}
                onChange={(event) => setAddressForm({ ...addressForm, is_default: event.target.checked })}
              />
              Make this my default address
            </label>
            <div className="form-actions end wide-panel">
              {editingAddressId && (
                <button className="button ghost" type="button" onClick={cancelEditAddress}>
                  <X size={16} />
                  Cancel Edit
                </button>
              )}
              <button className="button primary" type="submit">
                {editingAddressId ? <Save size={16} /> : <Plus size={16} />}
                {editingAddressId ? 'Save Address' : 'Add Address'}
              </button>
            </div>
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
                    <td>{address.street}, {address.city}, {address.state || ''} {address.zip_code || ''}</td>
                    <td>{address.is_default ? 'Yes' : 'No'}</td>
                    <td className="row-actions">
                      <button className="button mini" type="button" onClick={() => startEditAddress(address)}>
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => setDeleteAddressTarget(address)} aria-label="Delete address">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {addresses.length === 0 && (
                  <tr>
                    <td className="empty-cell" colSpan="3">No saved addresses yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={Boolean(deleteAddressTarget)}
        title="Delete address"
        message={`Delete ${deleteAddressTarget?.street || 'this address'}? Existing appointments may prevent deletion if they still reference this address.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteAddressTarget(null)}
        onConfirm={removeAddress}
      />
    </div>
  );
}
