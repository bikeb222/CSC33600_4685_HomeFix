import React from 'react';
import Plotly from 'plotly.js-dist-min';
import { api } from '../api/client';
import ErrorAlert from '../components/common/ErrorAlert';
import LoadingState from '../components/common/LoadingState';
import PageHeader from '../components/common/PageHeader';
import { currency } from '../utils/format';

function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    const label = row[key] || 'Unknown';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function groupSumByDate(rows, dateKey, valueKey) {
  return rows.reduce((acc, row) => {
    const date = row[dateKey] ? String(row[dateKey]).slice(0, 10) : 'Unscheduled';
    acc[date] = (acc[date] || 0) + Number(row[valueKey] || 0);
    return acc;
  }, {});
}

function currencyText(value) {
  return currency(value).replace('.00', '');
}

function usePlot(ref, data, layout, deps) {
  React.useEffect(() => {
    if (!ref.current) {
      return undefined;
    }
    Plotly.newPlot(ref.current, data, {
      autosize: true,
      margin: { t: 44, r: 24, b: 56, l: 58 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, system-ui, sans-serif', color: '#172033' },
      ...layout
    }, {
      responsive: true,
      displaylogo: false
    });
    return () => Plotly.purge(ref.current);
  }, deps);
}

function PlotCard({ title, description, children }) {
  return (
    <section className="plot-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function PlotlyAnalyticsPage() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const statusRef = React.useRef(null);
  const revenueRef = React.useRef(null);
  const providerRef = React.useRef(null);
  const serviceRef = React.useRef(null);
  const payoutRef = React.useRef(null);
  const receiverSpendingRef = React.useRef(null);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [appointments, payments, providers] = await Promise.all([
        api.reports.appointments(),
        api.reports.payments(),
        api.reports.providerPerformance()
      ]);
      setData({ appointments, payments, providers });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, []);

  const appointmentStatus = data ? groupCount(data.appointments, 'status') : {};
  const serviceMix = data ? groupCount(data.appointments, 'service') : {};
  const revenueByDate = data ? groupSumByDate(data.payments, 'payment_date', 'total_amount') : {};
  const serviceEntries = Object.entries(serviceMix).sort((a, b) => a[1] - b[1]);
  const receiverByAppointment = data
    ? Object.fromEntries(data.appointments.map((appointment) => [appointment.app_id, appointment.receiver]))
    : {};
  const receiverSpending = data
    ? data.payments.reduce((acc, payment) => {
      const receiver = receiverByAppointment[payment.app_id] || 'Unknown';
      acc[receiver] = (acc[receiver] || 0) + Number(payment.total_amount || 0);
      return acc;
    }, {})
    : {};
  const receiverSpendingEntries = Object.entries(receiverSpending).sort((a, b) => a[1] - b[1]);
  const totalRevenue = data?.payments.reduce((sum, row) => sum + Number(row.total_amount || 0), 0) || 0;
  const totalCommission = data?.payments.reduce((sum, row) => sum + Number(row.commission_fee || 0), 0) || 0;
  const totalPayout = data?.payments.reduce((sum, row) => sum + Number(row.provider_payout || 0), 0) || 0;

  usePlot(statusRef, [{
    type: 'pie',
    labels: Object.keys(appointmentStatus),
    values: Object.values(appointmentStatus),
    hole: 0.45,
    marker: { colors: ['#f59e0b', '#2563eb', '#7c3aed', '#10b981', '#64748b', '#dc2626'] }
  }], { title: 'Appointment Status Mix' }, [data]);

  usePlot(revenueRef, [{
    type: 'scatter',
    mode: 'lines+markers',
    x: Object.keys(revenueByDate).sort(),
    y: Object.keys(revenueByDate).sort().map((date) => revenueByDate[date]),
    line: { color: '#2563eb', width: 3 },
    marker: { size: 8 }
  }], {
    title: 'Paid Revenue By Date',
    yaxis: { tickprefix: '$' }
  }, [data]);

  usePlot(providerRef, [{
    type: 'bar',
    name: 'Completed Jobs',
    orientation: 'h',
    y: data?.providers.map((row) => row.provider_name) || [],
    x: data?.providers.map((row) => -Number(row.completed_appointments_count || 0)) || [],
    text: data?.providers.map((row) => String(row.completed_appointments_count || 0)) || [],
    textposition: 'outside',
    marker: { color: '#10b981' },
    hovertemplate: '%{y}<br>Completed jobs: %{text}<extra></extra>'
  }, {
    type: 'bar',
    name: 'Average Rating',
    orientation: 'h',
    y: data?.providers.map((row) => row.provider_name) || [],
    x: data?.providers.map((row) => Number(row.average_rating || 0)) || [],
    text: data?.providers.map((row) => Number(row.average_rating || 0).toFixed(1)) || [],
    textposition: 'outside',
    marker: { color: '#f59e0b' },
    hovertemplate: '%{y}<br>Average rating: %{text}<extra></extra>'
  }], {
    title: 'Provider Performance',
    barmode: 'relative',
    margin: { t: 44, r: 42, b: 56, l: 112 },
    xaxis: {
      title: 'Completed Jobs ← | → Average Rating',
      tickvals: [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
      ticktext: ['4', '3', '2', '1', '0', '1', '2', '3', '4', '5'],
      zeroline: true,
      zerolinewidth: 2,
      zerolinecolor: '#475569'
    }
  }, [data]);

  usePlot(serviceRef, [{
    type: 'bar',
    orientation: 'h',
    x: serviceEntries.map((entry) => entry[1]),
    y: serviceEntries.map((entry) => entry[0]),
    text: serviceEntries.map((entry) => String(entry[1])),
    textposition: 'outside',
    marker: { color: '#7c3aed' }
  }], {
    title: 'Appointment Volume By Service',
    margin: { t: 44, r: 40, b: 56, l: 132 }
  }, [data]);

  usePlot(payoutRef, [{
    type: 'bar',
    x: ['Platform Commission', 'Provider Payout'],
    y: [totalCommission, totalPayout],
    text: [currencyText(totalCommission), currencyText(totalPayout)],
    textposition: 'outside',
    cliponaxis: false,
    marker: { color: ['#2563eb', '#10b981'] }
  }], {
    title: 'Revenue Split',
    yaxis: { tickprefix: '$', range: [0, Math.max(totalCommission, totalPayout) * 1.18] }
  }, [data]);

  usePlot(receiverSpendingRef, [{
    type: 'bar',
    orientation: 'h',
    x: receiverSpendingEntries.map((entry) => entry[1]),
    y: receiverSpendingEntries.map((entry) => entry[0]),
    text: receiverSpendingEntries.map((entry) => currencyText(entry[1])),
    textposition: 'outside',
    cliponaxis: false,
    marker: { color: '#2563eb' }
  }], {
    title: 'Receiver Spending Ranking',
    margin: { t: 44, r: 72, b: 56, l: 120 },
    xaxis: { tickprefix: '$' }
  }, [data]);

  return (
    <main className="visualization-screen">
      <div className="page-stack plotly-page">
      <PageHeader
        eyebrow="Plotly analytics"
        title="Homefix Visual Analytics"
        description="Interactive JavaScript charts built from the reporting JSON endpoints."
      />
      <ErrorAlert message={error} onClose={() => setError('')} />
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="metric-grid">
            <section className="metric-card">
              <span>Total Revenue</span>
              <strong>{currency(totalRevenue)}</strong>
            </section>
            <section className="metric-card">
              <span>Platform Commission</span>
              <strong>{currency(totalCommission)}</strong>
            </section>
            <section className="metric-card">
              <span>Provider Payout</span>
              <strong>{currency(totalPayout)}</strong>
            </section>
            <section className="metric-card">
              <span>Appointments</span>
              <strong>{data.appointments.length}</strong>
            </section>
          </div>
          <div className="plot-grid">
            <PlotCard title="Appointment Status" description="Shows active work, completed jobs, and exceptions.">
              <div className="plot-box" ref={statusRef} />
            </PlotCard>
            <PlotCard title="Revenue Trend" description="Paid payment totals grouped by payment date.">
              <div className="plot-box" ref={revenueRef} />
            </PlotCard>
            <PlotCard title="Provider Performance" description="Compares completed jobs and average review rating.">
              <div className="plot-box" ref={providerRef} />
            </PlotCard>
            <PlotCard title="Service Demand" description="Appointment volume by service category.">
              <div className="plot-box" ref={serviceRef} />
            </PlotCard>
            <PlotCard title="Revenue Split" description="Platform commission compared with provider payout.">
              <div className="plot-box" ref={payoutRef} />
            </PlotCard>
            <PlotCard title="Receiver Spending Ranking" description="Total paid amount grouped by receiver.">
              <div className="plot-box" ref={receiverSpendingRef} />
            </PlotCard>
          </div>
        </>
      )}
      </div>
    </main>
  );
}
