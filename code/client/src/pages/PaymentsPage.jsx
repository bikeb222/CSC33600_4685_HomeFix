import React from 'react';
import { CreditCard, WalletCards } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ErrorAlert from '../components/common/ErrorAlert';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import SearchAndFilterBar from '../components/common/SearchAndFilterBar';
import { paymentStatuses } from '../utils/constants';
import { currency, shortDateTime } from '../utils/format';

const emptyForm = {
  app_id: '',
  total_amount: '',
  commission_rate: '0.15',
  payment_status: 'unpaid'
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = React.useState([]);
  const [appointments, setAppointments] = React.useState([]);
  const [receivers, setReceivers] = React.useState([]);
  const [walletBalance, setWalletBalance] = React.useState(Number(user.wallet_balance || 0));
  const [form, setForm] = React.useState(emptyForm);
  const [rechargeForm, setRechargeForm] = React.useState({ receiver_id: user.receiver_id || '', amount: '100' });
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const selectedAppointment = appointments.find((appointment) => String(appointment.app_id) === String(form.app_id));
  const payableAppointments = appointments.filter((appointment) => (
    appointment.appointment_status === 'completed'
    && appointment.actual_hours
    && !payments.some((payment) => Number(payment.app_id) === Number(appointment.app_id))
  ));
  const baseAmount = Number(form.total_amount || selectedAppointment?.actual_total || selectedAppointment?.estimated_total || 0);
  const commissionRate = Number(form.commission_rate || 0);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [paymentRows, appointmentRows] = await Promise.all([
        api.payments.list(),
        api.appointments.list()
      ]);
      let receiverRows = [];
      if (user.role === 'manager') {
        receiverRows = await api.receivers.list();
      }
      if (user.role === 'receiver') {
        const receiver = await api.receivers.get(user.receiver_id);
        setWalletBalance(Number(receiver.wallet_balance || 0));
      }
      setPayments(paymentRows);
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

  async function submit(event) {
    event.preventDefault();
    if (!form.app_id) {
      setError('Appointment is required.');
      return;
    }
    if (commissionRate < 0 || commissionRate > 1) {
      setError('Commission rate must be between 0 and 1.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      const payload = {
        ...form,
        payment_status: user.role === 'receiver' ? 'paid' : form.payment_status
      };
      if (payload.total_amount === '') {
        delete payload.total_amount;
      }
      if (user.role === 'receiver') {
        delete payload.total_amount;
        delete payload.commission_rate;
      }
      await api.payments.create(payload);
      setForm(emptyForm);
      setModalOpen(false);
      setNotice('Payment created successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function recharge(event) {
    event.preventDefault();
    try {
      setError('');
      setNotice('');
      if (user.role === 'receiver') {
        await api.payments.rechargeSelf(rechargeForm.amount);
      } else {
        await api.payments.recharge(rechargeForm.receiver_id, rechargeForm.amount);
      }
      setNotice('Wallet recharged successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      setError('');
      await api.payments.updateStatus(id, status);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const haystack = [
      payment.receiver_name,
      payment.provider_name,
      payment.service_name,
      payment.payment_status,
      payment.app_id
    ].join(' ').toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!statusFilter || payment.payment_status === statusFilter);
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Payment operations"
        title="Payments"
        description="Track wallet balance, completed appointment payments, commissions, and provider payouts."
        actions={user.role !== 'provider' && (
          <button
            className="button primary"
            type="button"
            onClick={() => {
              setError('');
              setNotice('');
              setForm(emptyForm);
              setModalOpen(true);
            }}
          >
            <CreditCard size={16} />
            New Payment
          </button>
        )}
      />

      <ErrorAlert message={error} onClose={() => setError('')} />
      {notice && <div className="alert success">{notice}</div>}

      {user.role !== 'provider' && (
        <section className="panel">
          <PageHeader
            title={user.role === 'manager' ? 'Recharge Receiver Wallet' : 'Recharge My Wallet'}
            description="Wallet funds are used when a receiver pays for a completed appointment."
          />
          <form className="inline-form" onSubmit={recharge}>
            {user.role === 'manager' && (
              <label>
                Receiver
                <select value={rechargeForm.receiver_id} onChange={(event) => setRechargeForm((current) => ({ ...current, receiver_id: event.target.value }))}>
                  <option value="">Select receiver</option>
                  {receivers.map((receiver) => (
                    <option key={receiver.receiver_id} value={receiver.receiver_id}>
                      {receiver.username} ({currency(receiver.wallet_balance)})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {user.role === 'receiver' && (
              <div className="summary-strip">
                <span>Current Balance</span>
                <strong>{currency(walletBalance)}</strong>
              </div>
            )}
            <label>
              Amount
              <input type="number" min="0.01" step="0.01" value={rechargeForm.amount} onChange={(event) => setRechargeForm((current) => ({ ...current, amount: event.target.value }))} />
            </label>
            <button className="button primary" type="submit">
              <WalletCards size={16} />
              Recharge
            </button>
          </form>
        </section>
      )}

      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search payment, receiver, provider, or service"
        filters={(
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All payment statuses</option>
            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        )}
      />

      <DataTable
        title="Payment List"
        rows={filteredPayments}
        rowKey="payment_id"
        loading={loading}
        columns={[
          { key: 'payment_id', label: 'ID' },
          { key: 'app_id', label: 'Appointment' },
          { key: 'receiver_name', label: 'Receiver' },
          { key: 'provider_name', label: 'Provider' },
          { key: 'total_amount', label: 'Total', render: (row) => currency(row.total_amount) },
          { key: 'actual_hours', label: 'Actual Hours', render: (row) => row.actual_hours || 'Not set' },
          { key: 'commission_rate', label: 'Rate', render: (row) => `${Math.round(Number(row.commission_rate) * 100)}%` },
          { key: 'commission_fee', label: 'Commission', render: (row) => currency(row.commission_fee) },
          { key: 'provider_payout', label: 'Payout', render: (row) => currency(row.provider_payout) },
          { key: 'payment_status', label: 'Status', render: (row) => <StatusBadge value={row.payment_status} /> },
          { key: 'payment_date', label: 'Paid At', render: (row) => row.payment_date ? shortDateTime(row.payment_date) : 'Not paid' }
        ]}
        actions={user.role === 'manager' ? (row) => (
          <select className="small-select" value={row.payment_status} onChange={(event) => updateStatus(row.payment_id, event.target.value)} aria-label="Payment status">
            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        ) : null}
        emptyTitle="No payments found"
        emptyDescription="Adjust filters or create a payment from an appointment."
      />

      <Modal
        open={modalOpen}
        title="Create Payment"
        description="Payment uses the completed appointment actual total unless a manager override is entered."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={submit} className="form-grid">
          <label>
            Appointment
            <select value={form.app_id} onChange={(event) => setForm((current) => ({ ...current, app_id: event.target.value }))} required>
              <option value="">{payableAppointments.length ? 'Select appointment' : 'No unpaid completed appointments'}</option>
              {payableAppointments.map((appointment) => (
                <option key={appointment.app_id} value={appointment.app_id}>
                  #{appointment.app_id} {appointment.receiver_name} - {appointment.service_name} ({currency(appointment.actual_total || appointment.estimated_total)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Total amount
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={selectedAppointment ? currency(selectedAppointment.actual_total || selectedAppointment.estimated_total) : 'Default actual total'}
              value={form.total_amount}
              onChange={(event) => setForm((current) => ({ ...current, total_amount: event.target.value }))}
              disabled={user.role !== 'manager'}
            />
          </label>
          {user.role === 'manager' && (
            <>
              <label>
                Commission rate
                <input type="number" min="0" max="1" step="0.01" value={form.commission_rate} onChange={(event) => setForm((current) => ({ ...current, commission_rate: event.target.value }))} required />
              </label>
              <label>
                Status
                <select value={form.payment_status} onChange={(event) => setForm((current) => ({ ...current, payment_status: event.target.value }))}>
                  {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </>
          )}
          <div className="booking-summary">
            <div>
              <span>Commission fee</span>
              <strong>{currency(baseAmount * commissionRate)}</strong>
            </div>
            <div>
              <span>Provider payout</span>
              <strong>{currency(baseAmount * (1 - commissionRate))}</strong>
            </div>
          </div>
          <div className="form-actions end">
            <button className="button ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="button primary" type="submit" disabled={submitting || !payableAppointments.length}>
              {submitting ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
