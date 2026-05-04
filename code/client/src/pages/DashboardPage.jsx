import React from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Home,
  MapPin,
  Star,
  TrendingUp,
  Users,
  UserRoundCheck,
  Wrench
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ErrorAlert from '../components/common/ErrorAlert';
import LoadingState from '../components/common/LoadingState';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import { currency, shortDateTime } from '../utils/format';

const statusColors = {
  pending: '#f59e0b',
  accepted: '#2563eb',
  rejected: '#dc2626',
  in_progress: '#7c3aed',
  completed: '#16a34a',
  cancelled: '#64748b',
  no_show: '#ea580c'
};

function byDateKey(dateValue) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateValue));
}

function appointmentStatusData(appointments) {
  return Object.entries(
    appointments.reduce((acc, appointment) => {
      acc[appointment.appointment_status] = (acc[appointment.appointment_status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));
}

function paidAmountByDate(payments, amountKey = 'total_amount') {
  return Object.values(
    payments.reduce((acc, payment) => {
      const key = byDateKey(payment.payment_date || payment.scheduled_time || new Date());
      if (!acc[key]) {
        acc[key] = { date: key, amount: 0 };
      }
      if (payment.payment_status === 'paid') {
        acc[key].amount += Number(payment[amountKey] || 0);
      }
      return acc;
    }, {})
  );
}

function AppointmentStatusPanel({ appointments, title = 'Appointment Status', description = 'Distribution across the current booking pipeline.' }) {
  const statusDistribution = appointmentStatusData(appointments);

  return (
    <section className="panel chart-panel">
      <PageHeader title={title} description={description} />
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
              {statusDistribution.map((entry) => (
                <Cell key={entry.name} fill={statusColors[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, String(name).replaceAll('_', ' ')]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-grid">
        {statusDistribution.map((item) => (
          <span key={item.name}>
            <i style={{ background: statusColors[item.name] || '#94a3b8' }} />
            {item.name.replaceAll('_', ' ')} ({item.value})
          </span>
        ))}
      </div>
    </section>
  );
}

function MoneyTrendPanel({ rows, title, description, amountKey = 'total_amount', color = '#2563eb' }) {
  const data = paidAmountByDate(rows, amountKey);

  return (
    <section className="panel chart-panel">
      <PageHeader title={title} description={description} />
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`moneyFill-${amountKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip formatter={(value) => currency(value)} />
            <Area type="monotone" dataKey="amount" stroke={color} fill={`url(#moneyFill-${amountKey})`} strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function appointmentColumns(role) {
  const columns = [
    { key: 'app_id', label: 'ID' },
    { key: 'service_name', label: 'Service' },
    { key: 'scheduled_time', label: 'Time', render: (row) => shortDateTime(row.scheduled_time) },
    { key: 'appointment_status', label: 'Status', render: (row) => <StatusBadge value={row.appointment_status} /> }
  ];

  if (role !== 'receiver') {
    columns.splice(1, 0, { key: 'receiver_name', label: 'Receiver' });
  }
  if (role !== 'provider') {
    columns.splice(1, 0, { key: 'provider_name', label: 'Provider' });
  }
  return columns;
}

function paymentColumns(role) {
  const columns = [
    { key: 'payment_id', label: 'ID' },
    { key: 'service_name', label: 'Service' },
    { key: 'total_amount', label: 'Total', render: (row) => currency(row.total_amount) },
    { key: 'payment_status', label: 'Status', render: (row) => <StatusBadge value={row.payment_status} /> }
  ];

  if (role === 'manager') {
    columns.splice(2, 0, { key: 'provider_name', label: 'Provider' });
    columns.splice(4, 0, { key: 'provider_payout', label: 'Payout', render: (row) => currency(row.provider_payout) });
  }
  if (role === 'provider') {
    columns.splice(3, 0, { key: 'provider_payout', label: 'My Payout', render: (row) => currency(row.provider_payout) });
  }
  return columns;
}

function ManagerDashboard({ stats, appointments, payments, providers }) {
  const topProviders = [...providers]
    .sort((a, b) => Number(b.total_payout || 0) - Number(a.total_payout || 0))
    .slice(0, 5);

  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Manager workspace</span>
          <h2>Keep platform demand, provider capacity, and payments moving cleanly.</h2>
          <p>Use this view to monitor the complete Homefix operation and jump into the admin tools that need attention.</p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" to="/appointments">
            <CalendarPlus size={16} />
            Create Appointment
          </Link>
          <Link className="button secondary" to="/reports">
            <FileSpreadsheet size={16} />
            Export Reports
          </Link>
        </div>
      </section>

      <div className="metric-grid">
        <StatCard label="Total Receivers" value={stats.total_receivers ?? 0} icon={Users} tone="blue" helper="Registered customers" />
        <StatCard label="Total Providers" value={stats.total_providers ?? 0} icon={UserRoundCheck} tone="emerald" helper="Service professionals" />
        <StatCard label="Total Revenue" value={currency(stats.total_revenue)} icon={CreditCard} tone="amber" helper="Paid payments" />
        <StatCard label="Appointments" value={stats.total_appointments ?? 0} icon={CalendarPlus} tone="purple" helper={`${stats.pending_appointments ?? 0} pending`} />
        <StatCard label="Services" value={stats.total_services ?? 0} icon={Wrench} tone="slate" helper="Catalog categories" />
        <StatCard label="Payments" value={stats.total_payments ?? 0} icon={CreditCard} tone="blue" helper="Payment records" />
        <StatCard label="Completed" value={stats.completed_appointments ?? 0} icon={CalendarCheck} tone="emerald" helper="Finished jobs" />
        <StatCard label="Pending" value={stats.pending_appointments ?? 0} icon={Clock} tone="amber" helper="Awaiting action" />
      </div>

      <div className="dashboard-grid">
        <AppointmentStatusPanel appointments={appointments} />
        <MoneyTrendPanel rows={payments} title="Revenue Summary" description="Paid revenue grouped by payment date." />
        <section className="panel chart-panel wide-chart">
          <PageHeader title="Provider Performance" description="Total payout by provider for paid appointments." />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProviders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="provider_name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => currency(value)} />
                <Bar dataKey="total_payout" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel top-providers">
          <PageHeader title="Top Providers" description="Ranked by payout and review score." />
          <div className="provider-list">
            {topProviders.map((provider, index) => (
              <div className="provider-row" key={provider.provider_id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{provider.provider_name}</strong>
                  <small>{provider.completed_appointments_count} completed, rating {provider.average_rating || 0}</small>
                </div>
                <b>{currency(provider.total_payout)}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid two">
        <DataTable title="Recent Appointments" rows={appointments.slice(0, 6)} rowKey="app_id" compact columns={appointmentColumns('manager')} emptyTitle="No appointments" />
        <DataTable title="Recent Payments" rows={payments.slice(0, 6)} rowKey="payment_id" compact columns={paymentColumns('manager')} emptyTitle="No payments" />
      </div>
    </>
  );
}

function ProviderDashboard({ stats, appointments, payments, services, reviews }) {
  const upcoming = appointments.filter((appointment) => ['pending', 'accepted', 'in_progress'].includes(appointment.appointment_status)).slice(0, 6);
  const recentReviews = reviews.slice(0, 5);

  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Provider workspace</span>
          <h2>Track incoming requests, active jobs, payout, and customer feedback.</h2>
          <p>This dashboard only shows appointments, payments, services, and reviews connected to your provider account.</p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" to="/appointments">
            <CalendarClock size={16} />
            Update Jobs
          </Link>
          <Link className="button secondary" to="/services">
            <BriefcaseBusiness size={16} />
            Manage Services
          </Link>
        </div>
      </section>

      <div className="metric-grid">
        <StatCard label="My Appointments" value={stats.total_appointments ?? appointments.length} icon={CalendarClock} tone="blue" helper="Assigned to you" />
        <StatCard label="Pending Requests" value={stats.pending_appointments ?? 0} icon={Clock} tone="amber" helper="Need accept or reject" />
        <StatCard label="Completed Jobs" value={stats.completed_appointments ?? 0} icon={CalendarCheck} tone="emerald" helper="Finished appointments" />
        <StatCard label="My Payout" value={currency(stats.total_payout)} icon={CreditCard} tone="emerald" helper="Paid provider payout" />
        <StatCard label="Average Rating" value={Number(stats.average_rating || 0).toFixed(1)} icon={Star} tone="amber" helper="Receiver feedback" />
        <StatCard label="My Services" value={stats.total_services ?? services.length} icon={BriefcaseBusiness} tone="purple" helper="Offered categories" />
      </div>

      <div className="dashboard-grid">
        <AppointmentStatusPanel appointments={appointments} title="My Appointment Pipeline" description="Status mix for appointments assigned to you." />
        <MoneyTrendPanel rows={payments} title="Payout Trend" description="Paid provider payout grouped by payment date." amountKey="provider_payout" color="#10b981" />
        <section className="panel top-providers">
          <PageHeader title="My Service Menu" description="Services you currently offer and base hourly rates." />
          <div className="provider-list">
            {services.map((service) => (
              <div className="provider-row" key={service.service_id}>
                <span><Wrench size={15} /></span>
                <div>
                  <strong>{service.service_name}</strong>
                  <small>{service.description || 'No description'}</small>
                </div>
                <b>{currency(service.base_hourly_rate)}/hr</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid two">
        <DataTable title="Upcoming Work" description="Jobs that still need action or completion." rows={upcoming} rowKey="app_id" compact columns={appointmentColumns('provider')} emptyTitle="No upcoming work" />
        <DataTable title="My Payments" rows={payments.slice(0, 6)} rowKey="payment_id" compact columns={paymentColumns('provider')} emptyTitle="No payments" />
      </div>

      <DataTable
        title="Recent Reviews"
        rows={recentReviews}
        rowKey="review_id"
        compact
        columns={[
          { key: 'review_direction', label: 'Direction', render: (row) => <StatusBadge value={row.review_direction} /> },
          { key: 'rating', label: 'Rating', render: (row) => `${row.rating}/5` },
          { key: 'receiver_name', label: 'Receiver' },
          { key: 'comment', label: 'Comment' }
        ]}
        emptyTitle="No reviews yet"
      />
    </>
  );
}

function ReceiverDashboard({ stats, appointments, payments, addresses, services, reviews }) {
  const upcoming = appointments.filter((appointment) => ['pending', 'accepted', 'in_progress'].includes(appointment.appointment_status)).slice(0, 6);
  const pendingPayments = payments.filter((payment) => payment.payment_status === 'unpaid');
  const recommendedServices = services.slice(0, 5);

  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Receiver workspace</span>
          <h2>Book service, track upcoming visits, and keep payments tidy.</h2>
          <p>This dashboard is limited to your addresses, appointments, payments, and review history.</p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" to="/services">
            <CalendarPlus size={16} />
            Book Service
          </Link>
          <Link className="button secondary" to="/appointments">
            <CalendarClock size={16} />
            My Appointments
          </Link>
        </div>
      </section>

      <div className="metric-grid">
        <StatCard label="My Appointments" value={stats.total_appointments ?? appointments.length} icon={CalendarClock} tone="blue" helper="All booking history" />
        <StatCard label="Upcoming" value={stats.upcoming_appointments ?? upcoming.length} icon={Clock} tone="amber" helper="Pending or active visits" />
        <StatCard label="Pending Payments" value={currency(stats.pending_payments)} icon={CreditCard} tone="purple" helper="Unpaid appointment total" />
        <StatCard label="Saved Addresses" value={stats.saved_addresses ?? addresses.length} icon={MapPin} tone="emerald" helper="Service locations" />
        <StatCard label="Reviews" value={stats.total_reviews ?? reviews.length} icon={Star} tone="amber" helper="Related to your bookings" />
        <StatCard label="Service Types" value={services.length} icon={Home} tone="slate" helper="Available catalog options" />
      </div>

      <div className="dashboard-grid">
        <AppointmentStatusPanel appointments={appointments} title="My Booking Status" description="Status mix for your appointment history." />
        <MoneyTrendPanel rows={payments} title="Payment History" description="Paid totals grouped by payment date." />
        <section className="panel top-providers">
          <PageHeader title="Recommended Services" description="Start a booking from the current service catalog." />
          <div className="provider-list">
            {recommendedServices.map((service) => (
              <div className="provider-row" key={service.service_id}>
                <span><Wrench size={15} /></span>
                <div>
                  <strong>{service.service_name}</strong>
                  <small>{service.provider_count || 0} active provider links</small>
                </div>
                <Link className="button mini" to="/services">Book</Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid two">
        <DataTable title="Upcoming Appointments" rows={upcoming} rowKey="app_id" compact columns={appointmentColumns('receiver')} emptyTitle="No upcoming appointments" />
        <DataTable title="Pending Payments" rows={pendingPayments} rowKey="payment_id" compact columns={paymentColumns('receiver')} emptyTitle="No pending payments" />
      </div>

      <div className="dashboard-grid two">
        <DataTable
          title="Saved Addresses"
          rows={addresses}
          rowKey="address_id"
          compact
          columns={[
            { key: 'street', label: 'Street' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'is_default', label: 'Default', render: (row) => (row.is_default ? 'Yes' : 'No') }
          ]}
          emptyTitle="No saved addresses"
        />
        <DataTable
          title="Recent Reviews"
          rows={reviews.slice(0, 5)}
          rowKey="review_id"
          compact
          columns={[
            { key: 'review_direction', label: 'Direction', render: (row) => <StatusBadge value={row.review_direction} /> },
            { key: 'rating', label: 'Rating', render: (row) => `${row.rating}/5` },
            { key: 'provider_name', label: 'Provider' },
            { key: 'comment', label: 'Comment' }
          ]}
          emptyTitle="No reviews yet"
        />
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState({});
  const [appointments, setAppointments] = React.useState([]);
  const [payments, setPayments] = React.useState([]);
  const [providers, setProviders] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [addresses, setAddresses] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const commonRequests = [
          api.dashboard.stats(),
          api.appointments.list(),
          api.payments.list(),
          api.reviews.list()
        ];

        const roleRequests = {
          manager: [api.reports.providerPerformance(), Promise.resolve([]), Promise.resolve([])],
          provider: [
            Promise.resolve([]),
            user.provider_id ? api.providers.services(user.provider_id) : Promise.resolve([]),
            Promise.resolve([])
          ],
          receiver: [
            Promise.resolve([]),
            api.services.list(),
            api.receivers.addresses(user.receiver_id)
          ]
        };

        const [
          statsData,
          appointmentRows,
          paymentRows,
          reviewRows,
          providerRows,
          serviceRows,
          addressRows
        ] = await Promise.all([...commonRequests, ...(roleRequests[user.role] || roleRequests.receiver)]);

        if (cancelled) {
          return;
        }
        setStats(statsData);
        setAppointments(appointmentRows);
        setPayments(paymentRows);
        setReviews(reviewRows);
        setProviders(providerRows);
        setServices(serviceRows);
        setAddresses(addressRows);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function renderRoleDashboard() {
    if (user.role === 'provider') {
      return <ProviderDashboard stats={stats} appointments={appointments} payments={payments} services={services} reviews={reviews} />;
    }
    if (user.role === 'receiver') {
      return <ReceiverDashboard stats={stats} appointments={appointments} payments={payments} addresses={addresses} services={services} reviews={reviews} />;
    }
    return <ManagerDashboard stats={stats} appointments={appointments} payments={payments} providers={providers} />;
  }

  return (
    <div className="page-stack">
      <ErrorAlert message={error} onClose={() => setError('')} />
      {loading ? <LoadingState /> : renderRoleDashboard()}
    </div>
  );
}
