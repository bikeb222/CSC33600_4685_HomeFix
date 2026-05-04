import React from 'react';
import { BriefcaseBusiness, CalendarOff, Edit3, Plus, Send, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ErrorAlert from '../components/common/ErrorAlert';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import { shortDateTime } from '../utils/format';

const emptyForm = {
  service_name: '',
  description: ''
};

const emptyBlockForm = {
  start_time: '',
  end_time: '',
  reason: ''
};

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = React.useState([]);
  const [myServices, setMyServices] = React.useState([]);
  const [unavailableBlocks, setUnavailableBlocks] = React.useState([]);
  const [approvals, setApprovals] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm);
  const [skillForm, setSkillForm] = React.useState({ service_id: '', base_hourly_rate: '50' });
  const [blockForm, setBlockForm] = React.useState(emptyBlockForm);
  const [editingId, setEditingId] = React.useState(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const availableSkillServices = React.useMemo(() => {
    const existingSkillIds = new Set(myServices.map((service) => String(service.service_id)));
    return services.filter((service) => !existingSkillIds.has(String(service.service_id)));
  }, [myServices, services]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const serviceRows = await api.services.list();
      setServices(serviceRows);
      if (user.role === 'provider' && user.provider_id) {
        const [providerServiceRows, blockRows] = await Promise.all([
          api.providers.services(user.provider_id),
          api.providers.unavailableBlocks(user.provider_id)
        ]);
        setMyServices(providerServiceRows);
        setUnavailableBlocks(blockRows);
      } else if (user.role === 'provider') {
        setMyServices([]);
        setUnavailableBlocks([]);
      }
      if (user.role === 'manager') {
        setApprovals(await api.providers.serviceApprovals());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [user.role, user.provider_id]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.service_id);
    setForm({ service_name: row.service_name, description: row.description || '' });
    setModalOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.service_name.trim()) {
      setError('Service name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      if (editingId) {
        await api.services.update(editingId, form);
        setNotice('Service updated successfully.');
      } else {
        await api.services.create(form);
        setNotice('Service created successfully.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!deleteTarget) {
      return;
    }
    try {
      setError('');
      await api.services.remove(deleteTarget.service_id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestSkill(event) {
    event.preventDefault();
    if (!skillForm.service_id || Number(skillForm.base_hourly_rate) < 0) {
      setError('Service and hourly rate are required.');
      return;
    }
    try {
      setError('');
      setNotice('');
      await api.providers.addService(user.provider_id, skillForm);
      setNotice('Skill request submitted for manager approval.');
      setSkillForm({ service_id: '', base_hourly_rate: '50' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addUnavailableBlock(event) {
    event.preventDefault();
    if (!blockForm.start_time || !blockForm.end_time) {
      setError('Start time and end time are required.');
      return;
    }
    try {
      setError('');
      setNotice('');
      await api.providers.addUnavailableBlock(user.provider_id, blockForm);
      setBlockForm(emptyBlockForm);
      setNotice('Unavailable time added.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeUnavailableBlock(blockId) {
    try {
      setError('');
      setNotice('');
      await api.providers.removeUnavailableBlock(user.provider_id, blockId);
      setNotice('Unavailable time removed.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reviewSkill(row, approvalStatus) {
    try {
      setError('');
      await api.providers.reviewService(row.provider_id, row.service_id, approvalStatus);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Service catalog"
        title="Services"
        description={user.role === 'provider' ? 'Request new skills and track manager approval status.' : 'Maintain the service catalog and track provider coverage.'}
        actions={user.role === 'manager' && (
          <button className="button primary" type="button" onClick={openCreate}>
            <Plus size={16} />
            New Service
          </button>
        )}
      />

      <ErrorAlert message={error} onClose={() => setError('')} />
      {notice && <div className="alert success">{notice}</div>}

      {user.role === 'provider' && (
        <section className="panel">
          <PageHeader title="Request A Skill" description="New provider skills must be approved by a manager before they can receive appointments." />
          <form className="inline-form" onSubmit={requestSkill}>
            <label>
              Service
              <select value={skillForm.service_id} onChange={(event) => setSkillForm((current) => ({ ...current, service_id: event.target.value }))}>
                <option value="">Select service</option>
                {availableSkillServices.map((service) => <option key={service.service_id} value={service.service_id}>{service.service_name}</option>)}
              </select>
            </label>
            <label>
              Hourly Rate
              <input type="number" min="0" step="0.01" value={skillForm.base_hourly_rate} onChange={(event) => setSkillForm((current) => ({ ...current, base_hourly_rate: event.target.value }))} />
            </label>
            <button className="button primary" type="submit" disabled={availableSkillServices.length === 0}>
              <Send size={16} />
              Submit For Approval
            </button>
          </form>
        </section>
      )}

      {user.role === 'provider' && (
        <DataTable
          title="My Skill Requests"
          rows={myServices}
          rowKey={(row) => `${row.provider_id}-${row.service_id}`}
          columns={[
            { key: 'service_name', label: 'Service' },
            { key: 'base_hourly_rate', label: 'Hourly Rate', render: (row) => `$${Number(row.base_hourly_rate).toFixed(2)}` },
            { key: 'approval_status', label: 'Approval', render: (row) => <StatusBadge value={row.approval_status} /> }
          ]}
          emptyTitle="No skill requests"
        />
      )}

      {user.role === 'provider' && (
        <section className="panel">
          <PageHeader
            title="My Schedule"
            description="Normal service hours are Monday through Friday, 8:00 AM to 5:00 PM. Add unavailable time when you cannot accept appointments."
          />
          <form className="inline-form schedule-form" onSubmit={addUnavailableBlock}>
            <label>
              Start
              <input type="datetime-local" value={blockForm.start_time} onChange={(event) => setBlockForm((current) => ({ ...current, start_time: event.target.value }))} required />
            </label>
            <label>
              End
              <input type="datetime-local" value={blockForm.end_time} onChange={(event) => setBlockForm((current) => ({ ...current, end_time: event.target.value }))} required />
            </label>
            <label>
              Reason
              <input value={blockForm.reason} onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Optional" />
            </label>
            <button className="button primary" type="submit">
              <CalendarOff size={16} />
              Add Unavailable Time
            </button>
          </form>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unavailableBlocks.map((block) => (
                  <tr key={block.block_id}>
                    <td>{shortDateTime(block.start_time)}</td>
                    <td>{shortDateTime(block.end_time)}</td>
                    <td>{block.reason || 'Unavailable'}</td>
                    <td>
                      <button className="icon-button danger" type="button" onClick={() => removeUnavailableBlock(block.block_id)} aria-label="Remove unavailable time">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {unavailableBlocks.length === 0 && <tr><td colSpan="4" className="empty-cell">No unavailable times</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {user.role === 'manager' && (
        <DataTable
          title="Provider Skill Approval Queue"
          rows={approvals}
          rowKey={(row) => `${row.provider_id}-${row.service_id}`}
          columns={[
            { key: 'provider_name', label: 'Provider' },
            { key: 'service_name', label: 'Service' },
            { key: 'base_hourly_rate', label: 'Hourly Rate', render: (row) => `$${Number(row.base_hourly_rate).toFixed(2)}` },
            { key: 'approval_status', label: 'Status', render: (row) => <StatusBadge value={row.approval_status} /> }
          ]}
          actions={(row) => row.approval_status === 'pending' && (
            <>
              <button className="button mini" type="button" onClick={() => reviewSkill(row, 'approved')}>Approve</button>
              <button className="button mini" type="button" onClick={() => reviewSkill(row, 'rejected')}>Reject</button>
            </>
          )}
          emptyTitle="No provider skill requests"
        />
      )}

      <DataTable
        title="Service List"
        description="Each service can be offered by many providers at different hourly rates."
        rows={services}
        rowKey="service_id"
        loading={loading}
        searchFields={['service_name', 'description']}
        columns={[
          { key: 'service_id', label: 'ID' },
          { key: 'service_name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'provider_count', label: 'Providers' }
        ]}
        actions={user.role === 'manager' ? (row) => (
          <>
            <button className="icon-button" type="button" onClick={() => openEdit(row)} aria-label="Edit service">
              <Edit3 size={16} />
            </button>
            <button className="icon-button danger" type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete service">
              <Trash2 size={16} />
            </button>
          </>
        ) : null}
        emptyTitle="No services found"
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Service' : 'Create Service'}
        description="Keep names concise so appointment booking stays easy to scan."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={submit} className="form-grid">
          <label>
            Service name
            <input value={form.service_name} onChange={(event) => setForm((current) => ({ ...current, service_name: event.target.value }))} required />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="4" />
          </label>
          <div className="form-actions end">
            <button className="button ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="button primary" type="submit" disabled={submitting}>
              <BriefcaseBusiness size={16} />
              {submitting ? 'Saving...' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete service"
        message={`Delete ${deleteTarget?.service_name}? This may fail if appointments still reference it.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
