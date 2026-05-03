import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ErrorAlert from '../components/common/ErrorAlert';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import SearchAndFilterBar from '../components/common/SearchAndFilterBar';
import { appointmentStatuses } from '../utils/constants';
import { currency, shortDateTime } from '../utils/format';

const emptyForm = {
  receiver_id: '',
  address_id: '',
  service_id: '',
  provider_id: '',
  scheduled_time: '',
  estimated_hours: '1'
};

function statusOptionsFor(user, row) {
  if (user.role === 'manager') {
    return appointmentStatuses;
  }
  if (user.role === 'provider') {
    const transitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['in_progress']
    };
    return [row.appointment_status, ...(transitions[row.appointment_status] || [])];
  }
  if (user.role === 'receiver') {
    const transitions = {
      pending: ['cancelled'],
      accepted: ['cancelled', 'completed'],
      in_progress: ['completed']
    };
    return [row.appointment_status, ...(transitions[row.appointment_status] || [])];
  }
  return [row.appointment_status];
}

function canChangeStatus(user, row) {
  return statusOptionsFor(user, row).length > 1;
}

function toDateTimeLocal(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function buildAvailableTimeSlots() {
  const slots = [];
  const hours = [9, 11, 14, 16];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
    for (const hour of hours) {
      const slot = new Date(now);
      slot.setDate(now.getDate() + dayOffset);
      slot.setHours(hour, 0, 0, 0);
      slots.push({
        value: toDateTimeLocal(slot),
        label: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }).format(slot)
      });
    }
  }

  return slots.slice(0, 8);
}

function scheduleSurchargeFor(scheduledTime, estimatedHours) {
  if (!scheduledTime) {
    return { rate: 0, reason: 'standard_hours', label: 'Standard hours' };
  }
  const start = new Date(scheduledTime);
  const day = start.getDay();
  const isWeekend = day === 0 || day === 6;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = startMinutes + Math.ceil(Number(estimatedHours || 0) * 60);
  const isAfterHours = startMinutes < 8 * 60 || endMinutes > 17 * 60;
  let rate = 0;
  const labels = [];
  if (isWeekend) {
    rate += 0.10;
    labels.push('Weekend +10%');
  }
  if (isAfterHours) {
    rate += 0.20;
    labels.push('After hours +20%');
  }
  return {
    rate,
    reason: labels.length ? labels.join(', ') : 'standard_hours',
    label: labels.length ? labels.join(', ') : 'Standard hours'
  };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canCreateAppointment = user.role === 'manager' || user.role === 'receiver';
  const [appointments, setAppointments] = React.useState([]);
  const [receivers, setReceivers] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [providers, setProviders] = React.useState([]);
  const [addresses, setAddresses] = React.useState([]);
  const [unavailableTimes, setUnavailableTimes] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sortDirection, setSortDirection] = React.useState('desc');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [formLoading, setFormLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [timeConfirmed, setTimeConfirmed] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const selectedProvider = providers.find((provider) => String(provider.provider_id) === String(form.provider_id));
  const selectedService = services.find((service) => String(service.service_id) === String(form.service_id));
  const baseRate = Number(selectedProvider?.base_hourly_rate || selectedService?.base_hourly_rate || 0);
  const scheduleSurcharge = scheduleSurchargeFor(form.scheduled_time, form.estimated_hours);
  const finalHourlyRate = baseRate * (1 + scheduleSurcharge.rate);
  const estimatedTotal = finalHourlyRate * Number(form.estimated_hours || 0);
  const availableTimeSlots = React.useMemo(() => buildAvailableTimeSlots(), []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const requests = [api.appointments.list()];
      if (user.role === 'manager') {
        requests.push(api.receivers.list());
      }
      const [appointmentRows, receiverRows = []] = await Promise.all(requests);
      setAppointments(appointmentRows);
      setReceivers(receiverRows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [user.role]);

  React.useEffect(() => {
    if (searchParams.get('new') === '1' && canCreateAppointment && !modalOpen) {
      openCreateModal();
      navigate('/appointments', { replace: true });
    }
  }, [searchParams, canCreateAppointment, modalOpen, navigate]);

  async function loadReceiverAddresses(receiverId) {
    if (!receiverId) {
      setAddresses([]);
      return;
    }
    setAddresses(await api.receivers.addresses(receiverId));
  }

  async function openCreateModal() {
    if (!canCreateAppointment) {
      return;
    }

    const initialForm = {
      ...emptyForm,
      receiver_id: user.role === 'receiver' ? String(user.receiver_id) : ''
    };

    try {
      setFormLoading(true);
      setError('');
      setForm(initialForm);
      setTimeConfirmed(false);
      setServices(await api.services.list());
      setProviders(await api.providers.list());
      setUnavailableTimes([]);
      if (user.role === 'receiver') {
        await loadReceiverAddresses(user.receiver_id);
      } else {
        setAddresses([]);
      }
      setModalOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function changeReceiver(receiverId) {
    setForm((current) => ({ ...current, receiver_id: receiverId, address_id: '' }));
    try {
      setError('');
      await loadReceiverAddresses(receiverId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeProvider(providerId) {
    try {
      setError('');
      setFormLoading(true);
      if (!providerId) {
        setForm((current) => ({ ...current, provider_id: '' }));
        setUnavailableTimes([]);
        setServices(await api.services.list());
        if (form.service_id) {
          setProviders(await api.providers.list({ serviceId: form.service_id }));
        } else {
          setProviders(await api.providers.list());
        }
        return;
      }

      const providerServices = await api.providers.services(providerId);
      setUnavailableTimes(await api.providers.unavailableTimes(providerId));
      const currentServiceStillValid = providerServices.some((service) => String(service.service_id) === String(form.service_id));
      setServices(providerServices);
      setForm((current) => ({
        ...current,
        provider_id: providerId,
        service_id: currentServiceStillValid ? current.service_id : ''
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function changeService(serviceId) {
    try {
      setError('');
      setFormLoading(true);
      if (!serviceId) {
        setForm((current) => ({ ...current, service_id: '' }));
        setProviders(await api.providers.list());
        if (form.provider_id) {
          setServices(await api.providers.services(form.provider_id));
        } else {
          setServices(await api.services.list());
        }
        return;
      }

      const qualifiedProviders = await api.providers.list({ serviceId });
      const currentProviderStillValid = qualifiedProviders.some((provider) => String(provider.provider_id) === String(form.provider_id));
      setProviders(qualifiedProviders);
      setForm((current) => ({
        ...current,
        service_id: serviceId,
        provider_id: currentProviderStillValid ? current.provider_id : ''
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
    setTimeConfirmed(false);
    setAddresses([]);
    setServices([]);
    setProviders([]);
    setUnavailableTimes([]);
  }

  async function submit(event) {
    event.preventDefault();
    const receiverId = user.role === 'receiver' ? user.receiver_id : form.receiver_id;
    if (!receiverId || !form.address_id || !form.service_id || !form.provider_id || !form.scheduled_time) {
      setError('Receiver, address, service, provider, and scheduled time are required.');
      return;
    }
    if (!timeConfirmed) {
      setError('Please confirm the scheduled time before creating the appointment.');
      return;
    }
    if (Number(form.estimated_hours) <= 0) {
      setError('Estimated hours must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      await api.appointments.create({
        ...form,
        receiver_id: receiverId
      });
      setNotice('Appointment created successfully.');
      closeModal();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      setError('');
      await api.appointments.updateStatus(id, status);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateActualHours(id, actualHours) {
    if (!actualHours || Number(actualHours) <= 0) {
      return;
    }
    try {
      setError('');
      await api.appointments.updateActualHours(id, actualHours);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!deleteTarget) {
      return;
    }
    try {
      setError('');
      await api.appointments.remove(deleteTarget.app_id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredAppointments = appointments
    .filter((appointment) => {
      const haystack = [
        appointment.receiver_name,
        appointment.provider_name,
        appointment.service_name,
        appointment.address_label,
        appointment.appointment_status
      ].join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus = !statusFilter || appointment.appointment_status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const left = new Date(a.scheduled_time).getTime();
      const right = new Date(b.scheduled_time).getTime();
      return sortDirection === 'asc' ? left - right : right - left;
    });

  const columns = [
    { key: 'app_id', label: 'ID' },
    ...(user.role !== 'receiver' ? [{ key: 'receiver_name', label: 'Receiver' }] : []),
    ...(user.role !== 'provider' ? [{ key: 'provider_name', label: 'Provider' }] : []),
    { key: 'service_name', label: 'Service' },
    { key: 'address_label', label: 'Address' },
    { key: 'appointment_status', label: 'Status', render: (row) => <StatusBadge value={row.appointment_status} /> },
    { key: 'scheduled_time', label: 'Scheduled', render: (row) => shortDateTime(row.scheduled_time) },
    { key: 'hourly_rate_at_booking', label: 'Rate', render: (row) => currency(row.hourly_rate_at_booking) },
    { key: 'schedule_surcharge_rate', label: 'Surcharge', render: (row) => Number(row.schedule_surcharge_rate || 0) ? `${Math.round(Number(row.schedule_surcharge_rate) * 100)}%` : 'None' },
    { key: 'estimated_hours', label: 'Hours' },
    { key: 'actual_hours', label: 'Actual', render: (row) => row.actual_hours || 'Not set' },
    { key: 'actual_total', label: 'Final', render: (row) => currency(row.actual_total || row.estimated_total) }
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Booking workflow"
        title={user.role === 'provider' ? 'Assigned Appointments' : 'Appointments'}
        description={user.role === 'provider'
          ? 'Review customer requests and move your assigned appointments through the service workflow.'
          : 'Create, track, and manage home service appointments.'}
      />

      <ErrorAlert message={error} onClose={() => setError('')} />
      {notice && <div className="alert success">{notice}</div>}

      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search receiver, provider, service, or address"
        filters={(
          <>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {appointmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)}>
              <option value="desc">Newest scheduled first</option>
              <option value="asc">Oldest scheduled first</option>
            </select>
          </>
        )}
      />

      <DataTable
        title="Appointment List"
        description={user.role === 'manager'
          ? 'Managers can create appointments for any receiver and qualified provider-service pair.'
          : 'The list is scoped to appointments connected to your account.'}
        rows={filteredAppointments}
        rowKey="app_id"
        loading={loading}
        columns={columns}
        actions={(row) => (
          <>
            <select
              className="small-select"
              value={row.appointment_status}
              onChange={(event) => updateStatus(row.app_id, event.target.value)}
              aria-label="Appointment status"
              disabled={!canChangeStatus(user, row)}
            >
              {statusOptionsFor(user, row).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {user.role === 'manager' && (
              <button className="icon-button danger" type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete appointment">
                <Trash2 size={16} />
              </button>
            )}
            {['provider', 'manager'].includes(user.role) && ['accepted', 'in_progress', 'completed'].includes(row.appointment_status) && (
              <input
                className="small-number"
                type="number"
                min="0.25"
                step="0.25"
                defaultValue={row.actual_hours || row.estimated_hours}
                title="Actual service hours"
                onBlur={(event) => updateActualHours(row.app_id, event.target.value)}
              />
            )}
            {['receiver', 'provider'].includes(user.role) && row.appointment_status === 'completed' && (
              <button className="button mini" type="button" onClick={() => navigate(`/reviews?new=${row.app_id}`)}>
                <MessageSquarePlus size={14} />
                Rate
              </button>
            )}
          </>
        )}
        emptyTitle="No appointments found"
        emptyDescription={user.role === 'provider' ? 'No appointments are currently assigned to you.' : 'Adjust filters or create a new appointment.'}
      />

      <Modal
        open={modalOpen}
        title="Create Appointment"
        description={user.role === 'manager'
          ? 'Select a receiver, address, service, and a qualified provider.'
          : 'Select one of your addresses, then choose a service and qualified provider.'}
        onClose={closeModal}
        size="lg"
      >
        <form onSubmit={submit} className="booking-form">
          <div className="form-grid two">
            {user.role === 'manager' && (
              <label>
                Receiver
                <select value={form.receiver_id} onChange={(event) => changeReceiver(event.target.value)} required>
                  <option value="">Select receiver</option>
                  {receivers.map((receiver) => (
                    <option key={receiver.receiver_id} value={receiver.receiver_id}>{receiver.username}</option>
                  ))}
                </select>
              </label>
            )}
            {user.role === 'receiver' && (
              <div className="summary-strip">
                <span>Receiver</span>
                <strong>{user.display_name}</strong>
              </div>
            )}
            <label>
              Receiver Address
              <select value={form.address_id} onChange={(event) => setForm((current) => ({ ...current, address_id: event.target.value }))} required disabled={!form.receiver_id}>
                <option value="">{form.receiver_id ? 'Select address' : 'Select receiver first'}</option>
                {addresses.map((address) => (
                  <option key={address.address_id} value={address.address_id}>
                    {address.street}, {address.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Qualified Provider
              <select value={form.provider_id} onChange={(event) => changeProvider(event.target.value)} required disabled={formLoading}>
                <option value="">{form.service_id ? 'Select provider for service' : 'Select provider'}</option>
                {providers.map((provider) => (
                  <option key={provider.provider_id} value={provider.provider_id}>
                    {provider.username}{provider.base_hourly_rate !== undefined ? ` (${currency(provider.base_hourly_rate)}/hr)` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select value={form.service_id} onChange={(event) => changeService(event.target.value)} required disabled={formLoading}>
                <option value="">{form.provider_id ? 'Select service from provider' : 'Select service'}</option>
                {services.map((service) => (
                  <option key={service.service_id} value={service.service_id}>{service.service_name}</option>
                ))}
              </select>
            </label>
            <label>
              Scheduled Time
              <div className="time-confirm-row">
                <input
                  type="datetime-local"
                  value={form.scheduled_time}
                  onChange={(event) => {
                    setTimeConfirmed(false);
                    setForm((current) => ({ ...current, scheduled_time: event.target.value }));
                  }}
                  required
                />
                <button className="button secondary" type="button" onClick={() => setTimeConfirmed(Boolean(form.scheduled_time))} disabled={!form.scheduled_time}>
                  Confirm
                </button>
              </div>
              <span className={timeConfirmed ? 'time-confirmed' : 'time-unconfirmed'}>
                {timeConfirmed ? 'Time confirmed' : 'Choose a time, then confirm it.'}
              </span>
            </label>
            <label>
              Estimated Hours
              <input type="number" min="0.25" step="0.25" value={form.estimated_hours} onChange={(event) => setForm((current) => ({ ...current, estimated_hours: event.target.value }))} required />
            </label>
          </div>
          <div className="available-times">
            <span>Available times</span>
            <div>
              {availableTimeSlots.map((slot) => (
                <button
                  key={slot.value}
                  className={`time-slot ${form.scheduled_time === slot.value ? 'selected' : ''}`}
                  type="button"
                  onClick={() => {
                    setTimeConfirmed(false);
                    setForm((current) => ({ ...current, scheduled_time: slot.value }));
                  }}
                  onDoubleClick={() => {
                    setForm((current) => ({ ...current, scheduled_time: slot.value }));
                    setTimeConfirmed(true);
                  }}
                  title="Double-click to confirm this time"
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
          {unavailableTimes.length > 0 && (
            <div className="unavailable-times">
              <span>Provider unavailable times</span>
              <div>
                {unavailableTimes.map((time) => (
                  <code key={time.block_key || `${time.block_type}-${time.app_id || time.block_id}`}>
                    {time.block_type === 'manual' ? 'Unavailable' : `#${time.app_id}`} {shortDateTime(time.scheduled_time)} - {shortDateTime(time.blocked_until)}
                  </code>
                ))}
              </div>
            </div>
          )}
          <div className="summary-strip">
            <span>Working hours</span>
            <strong>Mon-Fri, 8:00 AM - 5:00 PM</strong>
            <small>After-hours bookings add 20%. Weekend bookings add 10%.</small>
          </div>
          <div className="booking-summary">
            <div>
              <span>Base hourly rate</span>
              <strong>{currency(baseRate)}</strong>
            </div>
            <div>
              <span>Schedule surcharge</span>
              <strong>{scheduleSurcharge.label}</strong>
            </div>
            <div>
              <span>Hourly rate snapshot</span>
              <strong>{currency(finalHourlyRate)}</strong>
            </div>
            <div>
              <span>Estimated total</span>
              <strong>{currency(estimatedTotal)}</strong>
            </div>
          </div>
          <div className="form-actions end">
            <button className="button ghost" type="button" onClick={closeModal}>Cancel</button>
            <button className="button primary" type="submit" disabled={submitting || formLoading}>
              {submitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete appointment"
        message={`Delete appointment #${deleteTarget?.app_id}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
