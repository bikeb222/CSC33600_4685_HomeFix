import React from 'react';
import Plotly from 'plotly.js-dist-min';
import PageHeader from './common/PageHeader';
import { currency } from '../utils/format';
import nycZipGeoJson from '../data/nycZipGeoJson.json';

const statusColors = {
  pending: '#f59e0b',
  accepted: '#2563eb',
  rejected: '#dc2626',
  in_progress: '#7c3aed',
  completed: '#16a34a',
  cancelled: '#64748b',
  no_show: '#ea580c'
};

function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    const label = row[key] || 'Unknown';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function groupSum(rows, key, valueKey) {
  return rows.reduce((acc, row) => {
    const label = row[key] || 'Unknown';
    acc[label] = (acc[label] || 0) + Number(row[valueKey] || 0);
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

function entriesAsc(group) {
  return Object.entries(group).sort((a, b) => a[1] - b[1]);
}

function formatCalendarDateTime(value) {
  if (!value) {
    return 'Unscheduled';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function currencyText(value) {
  return currency(value).replace('.00', '');
}

function usePlot(ref, data, layout, deps) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    let active = true;
    Plotly.react(element, data, {
      autosize: true,
      margin: { t: 44, r: 32, b: 56, l: 64 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, system-ui, sans-serif', color: '#172033' },
      ...layout
    }, {
      responsive: true,
      displaylogo: false
    }).catch(() => {
      if (active) {
        element.replaceChildren();
      }
    });
    return () => {
      active = false;
      try {
        Plotly.purge(element);
      } catch {
        // Plotly can still be mid-render during fast route changes.
      }
    };
  }, deps);
}

function PlotCard({ title, description, children, className = '' }) {
  return (
    <section className={`plot-card ${className}`.trim()}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function useCommonPlots({ appointments, payments, refs, moneyKey = 'total_amount', moneyTitle = 'Paid Amount By Date' }) {
  const statusMix = groupCount(appointments, 'appointment_status');
  const moneyByDate = groupSumByDate(payments.filter((payment) => payment.payment_status === 'paid'), 'payment_date', moneyKey);
  const orderedDates = Object.keys(moneyByDate).sort();

  usePlot(refs.statusRef, [{
    type: 'pie',
    labels: Object.keys(statusMix),
    values: Object.values(statusMix),
    hole: 0.45,
    marker: { colors: Object.keys(statusMix).map((status) => statusColors[status] || '#94a3b8') }
  }], { title: 'Appointment Status Mix' }, [appointments]);

  usePlot(refs.moneyRef, [{
    type: 'scatter',
    mode: 'lines+markers',
    x: orderedDates,
    y: orderedDates.map((date) => moneyByDate[date]),
    line: { color: '#2563eb', width: 3 },
    marker: { size: 8 }
  }], {
    title: moneyTitle,
    yaxis: { tickprefix: '$' }
  }, [payments, moneyKey, moneyTitle]);
}

function ManagerVisualizations({ appointments, payments, providers }) {
  const statusRef = React.useRef(null);
  const revenueRef = React.useRef(null);
  const providerRef = React.useRef(null);
  const serviceRef = React.useRef(null);
  const splitRef = React.useRef(null);
  const receiverRef = React.useRef(null);
  useCommonPlots({ appointments, payments, refs: { statusRef, moneyRef: revenueRef }, moneyTitle: 'Paid Revenue By Date' });

  const serviceEntries = entriesAsc(groupCount(appointments, 'service_name'));
  const receiverEntries = entriesAsc(groupSum(payments, 'receiver_name', 'total_amount'));
  const totalCommission = payments.reduce((sum, row) => sum + Number(row.commission_fee || 0), 0);
  const totalPayout = payments.reduce((sum, row) => sum + Number(row.provider_payout || 0), 0);

  usePlot(providerRef, [{
    type: 'bar',
    name: 'Completed Jobs',
    orientation: 'h',
    y: providers.map((row) => row.provider_name),
    x: providers.map((row) => -Number(row.completed_appointments_count || 0)),
    text: providers.map((row) => String(row.completed_appointments_count || 0)),
    textposition: 'outside',
    marker: { color: '#10b981' },
    hovertemplate: '%{y}<br>Completed jobs: %{text}<extra></extra>'
  }, {
    type: 'bar',
    name: 'Average Rating',
    orientation: 'h',
    y: providers.map((row) => row.provider_name),
    x: providers.map((row) => Number(row.average_rating || 0)),
    text: providers.map((row) => Number(row.average_rating || 0).toFixed(1)),
    textposition: 'outside',
    marker: { color: '#f59e0b' },
    hovertemplate: '%{y}<br>Average rating: %{text}<extra></extra>'
  }], {
    title: 'Provider Performance',
    barmode: 'relative',
    margin: { t: 44, r: 42, b: 56, l: 122 },
    xaxis: {
      title: 'Completed Jobs | Average Rating',
      tickvals: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
      ticktext: ['5', '4', '3', '2', '1', '0', '1', '2', '3', '4', '5'],
      zeroline: true,
      zerolinewidth: 2,
      zerolinecolor: '#475569'
    }
  }, [providers]);

  usePlot(serviceRef, [{
    type: 'bar',
    orientation: 'h',
    x: serviceEntries.map((entry) => entry[1]),
    y: serviceEntries.map((entry) => entry[0]),
    text: serviceEntries.map((entry) => String(entry[1])),
    textposition: 'outside',
    marker: { color: '#7c3aed' }
  }], { title: 'Appointment Volume By Service', margin: { t: 44, r: 42, b: 56, l: 132 } }, [appointments]);

  usePlot(splitRef, [{
    type: 'bar',
    x: ['Platform Commission', 'Provider Payout'],
    y: [totalCommission, totalPayout],
    text: [currencyText(totalCommission), currencyText(totalPayout)],
    textposition: 'outside',
    cliponaxis: false,
    marker: { color: ['#2563eb', '#10b981'] }
  }], {
    title: 'Revenue Split',
    yaxis: { tickprefix: '$', range: [0, Math.max(totalCommission, totalPayout, 1) * 1.18] }
  }, [payments]);

  usePlot(receiverRef, [{
    type: 'bar',
    orientation: 'h',
    x: receiverEntries.map((entry) => entry[1]),
    y: receiverEntries.map((entry) => entry[0]),
    text: receiverEntries.map((entry) => currencyText(entry[1])),
    textposition: 'outside',
    cliponaxis: false,
    marker: { color: '#2563eb' }
  }], { title: 'Receiver Spending Ranking', margin: { t: 44, r: 72, b: 56, l: 120 }, xaxis: { tickprefix: '$' } }, [payments]);

  return (
    <div className="plot-grid">
      <PlotCard title="Appointment Status" description="Shows active work, completed jobs, and exceptions."><div className="plot-box" ref={statusRef} /></PlotCard>
      <PlotCard title="Revenue Trend" description="Paid payment totals grouped by payment date."><div className="plot-box" ref={revenueRef} /></PlotCard>
      <PlotCard title="Provider Performance" description="Completed jobs compared with average review rating."><div className="plot-box" ref={providerRef} /></PlotCard>
      <PlotCard title="Service Demand" description="Appointment volume by service category."><div className="plot-box" ref={serviceRef} /></PlotCard>
      <PlotCard title="Revenue Split" description="Platform commission compared with provider payout."><div className="plot-box" ref={splitRef} /></PlotCard>
      <PlotCard title="Receiver Spending Ranking" description="Total paid amount grouped by receiver."><div className="plot-box" ref={receiverRef} /></PlotCard>
      <ManagerZipMap appointments={appointments} />
    </div>
  );
}

function ProviderVisualizations({ appointments, payments, reviews }) {
  const payoutRef = React.useRef(null);
  const serviceRef = React.useRef(null);
  const ratingRef = React.useRef(null);
  const moneyByDate = groupSumByDate(payments.filter((payment) => payment.payment_status === 'paid'), 'payment_date', 'provider_payout');
  const orderedDates = Object.keys(moneyByDate).sort();

  const serviceEntries = entriesAsc(groupCount(appointments, 'service_name'));
  const ratingCounts = groupCount(reviews, 'rating');
  const ratingEntries = [1, 2, 3, 4, 5].map((rating) => [rating, Number(ratingCounts[rating] || 0)]);

  usePlot(payoutRef, [{
    type: 'scatter',
    mode: 'lines+markers',
    x: orderedDates,
    y: orderedDates.map((date) => moneyByDate[date]),
    line: { color: '#2563eb', width: 3 },
    marker: { size: 8 }
  }], {
    title: 'Paid Payout By Date',
    yaxis: { tickprefix: '$' }
  }, [payments]);

  usePlot(serviceRef, [{
    type: 'bar',
    orientation: 'h',
    x: serviceEntries.map((entry) => entry[1]),
    y: serviceEntries.map((entry) => entry[0]),
    text: serviceEntries.map((entry) => String(entry[1])),
    textposition: 'outside',
    marker: { color: '#10b981' }
  }], { title: 'My Jobs By Service', margin: { t: 44, r: 42, b: 56, l: 112 } }, [appointments]);

  usePlot(ratingRef, [{
    type: 'bar',
    x: ratingEntries.map((entry) => `${entry[0]} stars`),
    y: ratingEntries.map((entry) => entry[1]),
    text: ratingEntries.map((entry) => String(entry[1])),
    textposition: 'outside',
    marker: { color: '#f59e0b' }
  }], { title: 'Review Rating Distribution' }, [reviews]);

  return (
    <div className="plot-grid">
      <AppointmentCalendar title="My Appointment Pipeline" description="Assigned appointment dates are colored by their strongest status on that day." appointments={appointments} amountMode="payout" />
      <PlotCard title="Payout Trend" description="Paid provider payout over time."><div className="plot-box" ref={payoutRef} /></PlotCard>
      <PlotCard title="Service Workload" description="Appointments grouped by service."><div className="plot-box" ref={serviceRef} /></PlotCard>
      <PlotCard title="Customer Feedback" description="Distribution of review scores."><div className="plot-box" ref={ratingRef} /></PlotCard>
    </div>
  );
}

function ZipCoverageMap({ title, description, zipEntries, hoverLabel, colorbarTitle }) {
  const mapRef = React.useRef(null);

  usePlot(mapRef, [{
    type: 'choroplethmapbox',
    geojson: nycZipGeoJson,
    locations: zipEntries.map((entry) => entry.zip),
    z: zipEntries.map((entry) => entry.count),
    featureidkey: 'properties.MODZCTA',
    colorscale: [
      [0, '#ffffff'],
      [0.2, '#d9f2ef'],
      [0.45, '#77c8d5'],
      [0.7, '#3d9bc3'],
      [1, '#2f5f87']
    ],
    zmin: 0,
    zmax: Math.max(...zipEntries.map((entry) => entry.count), 1),
    marker: { line: { color: '#5e7f88', width: 0.8 }, opacity: 0.86 },
    colorbar: { title: colorbarTitle, thickness: 12 },
    hovertemplate: `ZIP %{location}<br>%{z} ${hoverLabel}<extra></extra>`
  }], {
    title: '',
    mapbox: {
      style: 'carto-positron',
      center: { lat: 40.705, lon: -73.945 },
      zoom: 9.15
    },
    margin: { t: 4, r: 16, b: 4, l: 16 }
  }, [zipEntries, hoverLabel]);

  return (
    <PlotCard title={title} description={description} className="wide-map-card">
      <div className="plot-box map-box" ref={mapRef} />
    </PlotCard>
  );
}

function ProviderZipMap({ appointments }) {
  const zipEntries = React.useMemo(() => providerZipEntries(appointments), [appointments]);
  return (
    <ZipCoverageMap
      title="NYC ZIP Coverage"
      description="White ZIP areas have no visits; darker blue areas show more completed or active visits in New York City."
      zipEntries={zipEntries}
      hoverLabel="visit(s)"
      colorbarTitle="Visits"
    />
  );
}

function ManagerZipMap({ appointments }) {
  const zipEntries = React.useMemo(() => allAppointmentZipEntries(appointments), [appointments]);
  return (
    <ZipCoverageMap
      title="NYC Appointment ZIP Coverage"
      description="White ZIP areas have no appointments; darker blue areas show more total appointment activity across the platform."
      zipEntries={zipEntries}
      hoverLabel="appointment(s)"
      colorbarTitle="Appointments"
    />
  );
}

function ReceiverVisualizations({ appointments, payments }) {
  const spendingRef = React.useRef(null);
  const serviceRef = React.useRef(null);
  const surchargeRef = React.useRef(null);
  const moneyByDate = groupSumByDate(payments.filter((payment) => payment.payment_status === 'paid'), 'payment_date', 'total_amount');
  const orderedDates = Object.keys(moneyByDate).sort();

  const serviceSpending = entriesAsc(groupSum(payments, 'service_name', 'total_amount'));
  const surchargeMix = groupCount(appointments, 'schedule_surcharge_reason');

  usePlot(spendingRef, [{
    type: 'scatter',
    mode: 'lines+markers',
    x: orderedDates,
    y: orderedDates.map((date) => moneyByDate[date]),
    line: { color: '#2563eb', width: 3 },
    marker: { size: 8 }
  }], {
    title: 'My Paid Spending By Date',
    yaxis: { tickprefix: '$' }
  }, [payments]);

  usePlot(serviceRef, [{
    type: 'bar',
    orientation: 'h',
    x: serviceSpending.map((entry) => entry[1]),
    y: serviceSpending.map((entry) => entry[0]),
    text: serviceSpending.map((entry) => currencyText(entry[1])),
    textposition: 'outside',
    cliponaxis: false,
    marker: { color: '#7c3aed' }
  }], { title: 'My Spending By Service', margin: { t: 44, r: 72, b: 56, l: 112 }, xaxis: { tickprefix: '$' } }, [payments]);

  usePlot(surchargeRef, [{
    type: 'pie',
    labels: Object.keys(surchargeMix).map((label) => label.replaceAll('_', ' ')),
    values: Object.values(surchargeMix),
    hole: 0.45,
    marker: { colors: ['#10b981', '#f59e0b', '#2563eb', '#7c3aed'] }
  }], { title: 'Booking Time Surcharge Mix' }, [appointments]);

  return (
    <div className="plot-grid">
      <AppointmentCalendar appointments={appointments} />
      <PlotCard title="My Spending Trend" description="Paid totals grouped by payment date."><div className="plot-box" ref={spendingRef} /></PlotCard>
      <PlotCard title="Spending By Service" description="Paid amount by service category."><div className="plot-box" ref={serviceRef} /></PlotCard>
      <PlotCard title="Surcharge Mix" description="How often bookings use standard, weekend, or after-hours pricing."><div className="plot-box" ref={surchargeRef} /></PlotCard>
    </div>
  );
}

function appointmentDateKey(appointment) {
  return String(appointment.scheduled_time || '').slice(0, 10);
}

function appointmentDate(appointment) {
  const [year, month, day] = appointmentDateKey(appointment).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function shiftMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function statusPriority(status) {
  return {
    in_progress: 6,
    accepted: 5,
    pending: 4,
    completed: 3,
    rejected: 2,
    cancelled: 1,
    no_show: 1
  }[status] || 0;
}

const nycZipCodes = nycZipGeoJson.features.map((feature) => feature.properties.MODZCTA);
const nycZipCodeSet = new Set(nycZipCodes);

function zipCoverageEntries(appointments, statusFilter = null) {
  const counts = appointments.reduce((acc, appointment) => {
    const zip = String(appointment.zip_code || '').slice(0, 5);
    if ((!statusFilter || statusFilter.has(appointment.appointment_status)) && zip && nycZipCodeSet.has(zip)) {
      acc[zip] = (acc[zip] || 0) + 1;
    }
    return acc;
  }, {});
  return nycZipCodes.map((zip) => ({ zip, count: counts[zip] || 0 }));
}

function providerZipEntries(appointments) {
  return zipCoverageEntries(appointments, new Set(['accepted', 'in_progress', 'completed']));
}

function allAppointmentZipEntries(appointments) {
  return zipCoverageEntries(appointments);
}

function appointmentAmount(appointment, amountMode = 'total') {
  if (amountMode === 'payout') {
    return appointment.provider_actual_payout || appointment.provider_estimated_payout || 0;
  }
  return appointment.actual_total || appointment.estimated_total || 0;
}

function appointmentTooltip(appointments, amountMode = 'total') {
  return appointments.map((appointment) => [
    `#${appointment.app_id} ${appointment.service_name || 'Service'} (${appointment.appointment_status})`,
    appointment.provider_name ? `Provider: ${appointment.provider_name}` : '',
    appointment.receiver_name ? `Receiver: ${appointment.receiver_name}` : '',
    `Time: ${formatCalendarDateTime(appointment.scheduled_time)}`,
    appointment.address_label ? `Address: ${appointment.address_label}` : '',
    `Hours: ${appointment.actual_hours || appointment.estimated_hours || 0}`,
    `${amountMode === 'payout' ? 'Payout' : 'Total'}: ${currency(appointmentAmount(appointment, amountMode))}`
  ].filter(Boolean).join('\n')).join('\n\n');
}

function AppointmentCalendar({ appointments, title = 'My Booking Status', description = 'Appointment dates are colored by their strongest status on that day.', amountMode = 'total' }) {
  const defaultDate = React.useMemo(() => (
    appointments.length
      ? appointmentDate([...appointments].sort((a, b) => appointmentDate(b) - appointmentDate(a))[0])
      : new Date()
  ), [appointments]);
  const [visibleDate, setVisibleDate] = React.useState(defaultDate);

  React.useEffect(() => {
    setVisibleDate(defaultDate);
  }, [defaultDate]);

  const selectedDate = visibleDate;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const appointmentsByDay = appointments.reduce((acc, appointment) => {
    const key = appointmentDateKey(appointment);
    acc[key] = acc[key] || [];
    acc[key].push(appointment);
    return acc;
  }, {});
  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, blank: true })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAppointments = appointmentsByDay[key] || [];
      const primary = [...dayAppointments].sort((a, b) => statusPriority(b.appointment_status) - statusPriority(a.appointment_status))[0];
      return { key, day, appointments: dayAppointments, status: primary?.appointment_status };
    })
  ];

  return (
    <section className="plot-card calendar-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="calendar-header">
        <button className="icon-button small" type="button" onClick={() => setVisibleDate((current) => shiftMonth(current, -1))} aria-label="Previous month">
          &lt;
        </button>
        <strong>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(firstDay)}</strong>
        <div className="calendar-nav-actions">
          <button className="button mini" type="button" onClick={() => setVisibleDate(defaultDate)}>Latest</button>
          <button className="icon-button small" type="button" onClick={() => setVisibleDate((current) => shiftMonth(current, 1))} aria-label="Next month">
            &gt;
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`calendar-day ${cell.blank ? 'blank' : ''}`}
            style={cell.status ? { '--status-color': statusColors[cell.status] || '#94a3b8' } : undefined}
            aria-label={cell.appointments?.length ? appointmentTooltip(cell.appointments, amountMode) : undefined}
          >
            {!cell.blank && (
              <>
                <strong>{cell.day}</strong>
                {cell.appointments.length > 0 && <small>{cell.appointments.length}</small>}
                {cell.appointments.length > 0 && (
                  <div className="calendar-tooltip" role="tooltip">
                    {cell.appointments.map((appointment) => (
                      <div key={appointment.app_id}>
                        <b>#{appointment.app_id} {appointment.service_name}</b>
                        <span>{appointment.appointment_status.replaceAll('_', ' ')}</span>
                        <em>{formatCalendarDateTime(appointment.scheduled_time)}</em>
                        <p>{appointment.provider_name ? `Provider: ${appointment.provider_name}` : `Receiver: ${appointment.receiver_name}`}</p>
                        <p>{appointment.address_label}</p>
                        <p>Hours: {appointment.actual_hours || appointment.estimated_hours || 0}</p>
                        <p>{amountMode === 'payout' ? 'Payout' : 'Total'}: {currency(appointmentAmount(appointment, amountMode))}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="calendar-legend">
        {Object.entries(statusColors).map(([status, color]) => (
          <span key={status}><i style={{ background: color }} />{status.replaceAll('_', ' ')}</span>
        ))}
      </div>
    </section>
  );
}

export default function DashboardVisualizations({ role, appointments, payments, providers, reviews }) {
  if (role === 'provider-map') {
    return (
      <section className="dashboard-visualizations provider-map-section">
        <ProviderZipMap appointments={appointments} />
      </section>
    );
  }

  return (
    <section className="dashboard-visualizations">
      {role !== 'provider' && (
        <PageHeader
          eyebrow="Visual analytics"
          title={role === 'manager' ? 'Platform Visualizations' : 'My Visualizations'}
          description={role === 'manager'
            ? 'Interactive Plotly charts for operational and revenue review.'
            : 'Interactive Plotly charts scoped to your account and daily workflow.'}
        />
      )}
      {role === 'manager' && <ManagerVisualizations appointments={appointments} payments={payments} providers={providers} />}
      {role === 'provider' && <ProviderVisualizations appointments={appointments} payments={payments} reviews={reviews} />}
      {role === 'receiver' && <ReceiverVisualizations appointments={appointments} payments={payments} />}
    </section>
  );
}
