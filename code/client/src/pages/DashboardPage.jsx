import React from 'react';
import { Link } from 'react-router-dom';
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

const DashboardVisualizations = React.lazy(() => import('../components/DashboardVisualizations'));

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
    role === 'provider'
      ? { key: 'provider_payout', label: 'My Payout', render: (row) => currency(row.provider_payout) }
      : { key: 'total_amount', label: 'Total', render: (row) => currency(row.total_amount) },
    { key: 'payment_status', label: 'Status', render: (row) => <StatusBadge value={row.payment_status} /> }
  ];

  if (role === 'manager') {
    columns.splice(2, 0, { key: 'provider_name', label: 'Provider' });
    columns.splice(4, 0, { key: 'provider_payout', label: 'Payout', render: (row) => currency(row.provider_payout) });
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

      <React.Suspense fallback={<LoadingState />}>
        <DashboardVisualizations role="manager" appointments={appointments} payments={payments} providers={providers} reviews={[]} />
      </React.Suspense>

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

      <div className="page-header compact-heading">
        <div>
          <h2>My Visualizations</h2>
          <p>Pipeline, payout, workload, and feedback views for your provider account.</p>
        </div>
      </div>

      <React.Suspense fallback={<LoadingState />}>
        <DashboardVisualizations role="provider" appointments={appointments} payments={payments} providers={[]} reviews={reviews} />
      </React.Suspense>

      <React.Suspense fallback={<LoadingState />}>
        <DashboardVisualizations role="provider-map" appointments={appointments} payments={payments} providers={[]} reviews={reviews} />
      </React.Suspense>

      <div className="dashboard-grid two">
        <DataTable title="Upcoming Work" description="Jobs that still need action or completion." rows={upcoming} rowKey="app_id" compact columns={appointmentColumns('provider')} emptyTitle="No upcoming work" />
        <DataTable title="My Payments" rows={payments.slice(0, 6)} rowKey="payment_id" compact columns={paymentColumns('provider')} emptyTitle="No payments" />
      </div>

      <div className="dashboard-grid two">
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
      </div>
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

      <React.Suspense fallback={<LoadingState />}>
        <DashboardVisualizations role="receiver" appointments={appointments} payments={payments} providers={[]} reviews={reviews} />
      </React.Suspense>

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
