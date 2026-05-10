import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
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
  estimated_hours: '1',
  tip_amount: '0'
};

const emptyAdjustForm = {
  scheduled_time: '',
  estimated_hours: '',
  tip_amount: '0'
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
      accepted: ['cancelled'],
      in_progress: ['completed']
    };
    return [row.appointment_status, ...(transitions[row.appointment_status] || [])];
  }
  return [row.appointment_status];
}

function canChangeStatus(user, row) {
  return statusOptionsFor(user, row).length > 1;
}

function toInputDateTime(value) {
  if (!value) {
    return '';
  }
  return String(value).replace(' ', 'T').slice(0, 16);
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
  const [reviews, setReviews] = React.useState([]);
  const [payments, setPayments] = React.useState([]);
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
  const [adjustTarget, setAdjustTarget] = React.useState(null);
  const [adjustForm, setAdjustForm] = React.useState(emptyAdjustForm);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [payTarget, setPayTarget] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [formLoading, setFormLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [timeConfirmed, setTimeConfirmed] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [noticeTone, setNoticeTone] = React.useState('success');

  const selectedProvider = providers.find((provider) => String(provider.provider_id) === String(form.provider_id));
  const selectedService = services.find((service) => String(service.service_id) === String(form.service_id));
  const baseRate = Number(
    selectedProvider?.receiver_base_hourly_rate
    || selectedService?.receiver_base_hourly_rate
    || selectedProvider?.base_hourly_rate
    || selectedService?.base_hourly_rate
    || 0
  );
  const scheduleSurcharge = scheduleSurchargeFor(form.scheduled_time, form.estimated_hours);
  const finalHourlyRate = baseRate * (1 + scheduleSurcharge.rate);
  const tipAmount = Number(form.tip_amount || 0);
  const estimatedTotal = (finalHourlyRate * Number(form.estimated_hours || 0)) + tipAmount;
  const providerTimeGroups = React.useMemo(() => ({
    pending: unavailableTimes.filter((time) => time.block_type === 'pending'),
    accepted: unavailableTimes.filter((time) => ['accepted', 'in_progress'].includes(time.block_type)),
    manual: unavailableTimes.filter((time) => time.block_type === 'manual')
  }), [unavailableTimes]);
  const paymentByAppointmentId = React.useMemo(() => new Map(
    payments.map((payment) => [Number(payment.app_id), payment])
  ), [payments]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const requests = [api.appointments.list(), api.reviews.list(), api.payments.list()];
      if (user.role === 'manager') {
        requests.push(api.receivers.list());
      }
      const [appointmentRows, reviewRows, paymentRows, receiverRows = []] = await Promise.all(requests);
      setAppointments(appointmentRows);
      setReviews(reviewRows);
      setPayments(paymentRows);
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

  function openAdjustModal(row) {
    setAdjustTarget(row);
    setAdjustForm({
      scheduled_time: toInputDateTime(row.scheduled_time),
      estimated_hours: String(row.estimated_hours || '1'),
      tip_amount: String(row.tip_amount || 0)
    });
  }

  function closeAdjustModal() {
    setAdjustTarget(null);
    setAdjustForm(emptyAdjustForm);
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
      setNoticeTone('success');
      const created = await api.appointments.create({
        ...form,
        receiver_id: receiverId,
        tip_amount: Number(form.tip_amount || 0)
      });
      setNotice(created.pending_queue_ahead > 0
        ? `Appointment created as pending. ${created.pending_queue_ahead} pending request${created.pending_queue_ahead === 1 ? '' : 's'} for this provider already overlap this time.`
        : 'Appointment created successfully.');
      setNoticeTone(created.pending_queue_ahead > 0 ? 'warning' : 'success');
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

  async function submitAdjust(event) {
    event.preventDefault();
    if (!adjustTarget) {
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      setNoticeTone('success');
      const updated = await api.appointments.updateRequest(adjustTarget.app_id, adjustForm);
      setNotice(updated.pending_queue_ahead > 0
        ? `${updated.pending_queue_ahead} pending request${updated.pending_queue_ahead === 1 ? '' : 's'} for this provider already overlap this time.`
        : 'Appointment request updated.');
      setNoticeTone(updated.pending_queue_ahead > 0 ? 'warning' : 'success');
      closeAdjustModal();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPayment() {
    if (!payTarget) {
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      await api.payments.create({
        app_id: payTarget.app_id,
        payment_status: 'paid'
      });
      setNotice('Payment completed successfully.');
      setNoticeTone('success');
      setPayTarget(null);
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
        appointment.app_id,
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

  function canRateAppointment(row) {
    if (!['receiver', 'provider'].includes(user.role) || row.appointment_status !== 'completed') {
      return false;
    }
    const direction = user.role === 'receiver' ? 'receiver_to_provider' : 'provider_to_receiver';
    return !reviews.some((review) => (
      Number(review.app_id) === Number(row.app_id)
      && review.review_direction === direction
    ));
  }

  function hasPendingOverlap(row) {
    return row.appointment_status === 'pending' && Number(row.pending_overlap_count || 0) > 0;
  }

  function canAdjustAppointment(row) {
    return ['manager', 'receiver'].includes(user.role) && row.appointment_status === 'pending';
  }

  function canPayAppointment(row) {
    return user.role === 'receiver'
      && row.appointment_status === 'completed'
      && !payments.some((payment) => Number(payment.app_id) === Number(row.app_id));
  }

  function providerPayoutFor(row) {
    const payment = paymentByAppointmentId.get(Number(row.app_id));
    if (payment?.provider_payout !== undefined && payment?.provider_payout !== null) {
      return currency(payment.provider_payout);
    }
    const payout = Number(row.provider_actual_payout || row.provider_estimated_payout || 0);
    return `${currency(payout)} est.`;
  }

  const rateColumns = user.role === 'manager'
    ? [
      { key: 'provider_base_hourly_rate_at_booking', label: 'Provider Base', render: (row) => currency(row.provider_base_hourly_rate_at_booking) },
      { key: 'receiver_base_hourly_rate_at_booking', label: 'Receiver Base', render: (row) => currency(row.receiver_base_hourly_rate_at_booking) }
    ]
    : [
      {
        key: user.role === 'provider' ? 'provider_base_hourly_rate_at_booking' : 'receiver_base_hourly_rate_at_booking',
        label: 'Base Rate',
        render: (row) => currency(user.role === 'provider' ? row.provider_base_hourly_rate_at_booking : row.receiver_base_hourly_rate_at_booking)
      }
    ];

  const columns = [
    { key: 'app_id', label: 'ID' },
    ...(user.role !== 'receiver' ? [{ key: 'receiver_name', label: 'Receiver' }] : []),
    ...(user.role !== 'provider' ? [{ key: 'provider_name', label: 'Provider' }] : []),
    { key: 'service_name', label: 'Service' },
    { key: 'address_label', label: 'Address' },
    {
      key: 'appointment_status',
      label: 'Status',
      render: (row) => (
        <div className="status-stack">
          <StatusBadge value={row.appointment_status} />
          {hasPendingOverlap(row) && (
            <small className="queue-warning">
              {row.pending_overlap_count} overlapping pending request{Number(row.pending_overlap_count) === 1 ? '' : 's'}
            </small>
          )}
        </div>
      )
    },
    { key: 'scheduled_time', label: 'Scheduled', render: (row) => shortDateTime(row.scheduled_time) },
    ...rateColumns,
    { key: 'schedule_surcharge_rate', label: 'Surcharge', render: (row) => Number(row.schedule_surcharge_rate || 0) ? `${Math.round(Number(row.schedule_surcharge_rate) * 100)}%` : 'None' },
    { key: 'estimated_hours', label: 'Hours' },
    { key: 'tip_amount', label: 'Tip', render: (row) => currency(row.tip_amount || 0) },
    { key: 'actual_hours', label: 'Actual', render: (row) => row.actual_hours || 'Not set' },
    user.role === 'provider'
      ? { key: 'provider_payout', label: 'Payout', render: providerPayoutFor }
      : { key: 'actual_total', label: 'Final', render: (row) => currency(row.actual_total || row.estimated_total) }
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
      {notice && <div className={`alert ${noticeTone}`}>{notice}</div>}

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
        className="appointments-table"
        columns={columns}
        rowClassName={(row) => (hasPendingOverlap(row) ? 'pending-overlap-row' : '')}
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
            {['provider', 'manager'].includes(user.role) && ['accepted', 'in_progress'].includes(row.appointment_status) && (
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
            {canAdjustAppointment(row) && (
              <button className="button mini" type="button" onClick={() => openAdjustModal(row)}>
                <Pencil size={14} />
                Adjust
              </button>
            )}
            {canRateAppointment(row) && (
              <button className="button mini" type="button" onClick={() => navigate(`/reviews?new=${row.app_id}`)}>
                <MessageSquarePlus size={14} />
                Rate
              </button>
            )}
            {canPayAppointment(row) && (
              <button className="button mini primary-mini" type="button" onClick={() => setPayTarget(row)}>
                <CreditCard size={14} />
                Pay
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
            <label>
              Tip
              <input type="number" min="0" step="1" value={form.tip_amount} onChange={(event) => setForm((current) => ({ ...current, tip_amount: event.target.value }))} />
            </label>
          </div>
          <div className="provider-time-panel">
            <div>
              <span>Pending requests for this provider</span>
              {providerTimeGroups.pending.length ? providerTimeGroups.pending.map((time) => (
                <code className="pending-time" key={time.block_key || `pending-${time.app_id}`}>
                  #{time.app_id} {shortDateTime(time.start_time)} - {shortDateTime(time.end_time)}
                </code>
              )) : <small>No pending requests.</small>}
            </div>
            <div>
              <span>Accepted unavailable times</span>
              {providerTimeGroups.accepted.length ? providerTimeGroups.accepted.map((time) => (
                <code key={time.block_key || `accepted-${time.app_id}`}>
                  #{time.app_id} {shortDateTime(time.start_time)} - {shortDateTime(time.end_time)}
                </code>
              )) : <small>No accepted appointments blocking this provider.</small>}
            </div>
            <div>
              <span>Provider time off</span>
              {providerTimeGroups.manual.length ? providerTimeGroups.manual.map((time) => (
                <code key={time.block_key || `manual-${time.block_id}`}>
                  {shortDateTime(time.start_time)} - {shortDateTime(time.end_time)}{time.reason ? ` (${time.reason})` : ''}
                </code>
              )) : <small>No manual unavailable blocks.</small>}
            </div>
          </div>
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
              <span>Tip</span>
              <strong>{currency(tipAmount)}</strong>
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

      <Modal
        open={Boolean(adjustTarget)}
        title="Adjust Pending Request"
        description="Change the requested time or add a tip before the provider accepts it."
        onClose={closeAdjustModal}
        size="md"
      >
        <form onSubmit={submitAdjust} className="form-grid">
          <label>
            Scheduled Time
            <input
              type="datetime-local"
              value={adjustForm.scheduled_time}
              onChange={(event) => setAdjustForm((current) => ({ ...current, scheduled_time: event.target.value }))}
              required
            />
          </label>
          <label>
            Estimated Hours
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={adjustForm.estimated_hours}
              onChange={(event) => setAdjustForm((current) => ({ ...current, estimated_hours: event.target.value }))}
              required
            />
          </label>
          <label>
            Tip
            <input
              type="number"
              min="0"
              step="1"
              value={adjustForm.tip_amount}
              onChange={(event) => setAdjustForm((current) => ({ ...current, tip_amount: event.target.value }))}
            />
          </label>
          <div className="form-actions end">
            <button className="button ghost" type="button" onClick={closeAdjustModal}>Cancel</button>
            <button className="button primary" type="submit" disabled={submitting}>
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(payTarget)}
        title="Pay Appointment"
        description="Payment uses the completed appointment final total, including actual hours and any tip."
        onClose={() => setPayTarget(null)}
        size="md"
      >
        <div className="form-grid">
          <div className="booking-summary">
            <div>
              <span>Appointment</span>
              <strong>#{payTarget?.app_id}</strong>
            </div>
            <div>
              <span>Final total</span>
              <strong>{currency(payTarget?.actual_total || payTarget?.estimated_total || 0)}</strong>
            </div>
            <div>
              <span>Actual hours</span>
              <strong>{payTarget?.actual_hours || 'Not set'}</strong>
            </div>
            <div>
              <span>Tip</span>
              <strong>{currency(payTarget?.tip_amount || 0)}</strong>
            </div>
          </div>
          <div className="form-actions end">
            <button className="button ghost" type="button" onClick={() => setPayTarget(null)}>Cancel</button>
            <button className="button primary" type="button" onClick={submitPayment} disabled={submitting}>
              {submitting ? 'Paying...' : 'Pay Now'}
            </button>
          </div>
        </div>
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
