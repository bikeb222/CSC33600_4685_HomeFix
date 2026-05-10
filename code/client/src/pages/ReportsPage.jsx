import React from 'react';
import { CalendarDays, CreditCard, Download, TrendingUp } from 'lucide-react';
import { api } from '../api/client';
import ErrorAlert from '../components/common/ErrorAlert';
import PageHeader from '../components/common/PageHeader';

const reports = [
  {
    key: 'appointments',
    label: 'Appointments Report',
    icon: CalendarDays,
    path: '/reports/appointments/export',
    filename: 'appointments_report.xlsx',
    description: 'Receiver, provider, service, scheduled time, status, and estimated total.',
    source: 'Source: Appointments joined with Receivers, Providers, Services, and Addresses.'
  },
  {
    key: 'payments',
    label: 'Payments Report',
    icon: CreditCard,
    path: '/reports/payments/export',
    filename: 'payments_report.xlsx',
    description: 'Total amount, commission fee, provider payout, and payment status.',
    source: 'Source: Payments joined with Appointments and service participants.'
  },
  {
    key: 'provider-performance',
    label: 'Provider Performance Report',
    icon: TrendingUp,
    path: '/reports/provider-performance/export',
    filename: 'provider_performance_report.xlsx',
    description: 'Provider name, completed appointment count, average rating, and total payout.',
    source: 'Source: Aggregated Appointments, Reviews, and paid Payments.'
  }
];

export default function ReportsPage() {
  const [error, setError] = React.useState('');
  const [lastExported, setLastExported] = React.useState({});
  const [exporting, setExporting] = React.useState('');

  async function exportReport(report) {
    try {
      setError('');
      setExporting(report.key);
      await api.reports.download(report.path, report.filename);
      setLastExported((current) => ({
        ...current,
        [report.key]: new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date())
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting('');
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Reporting center"
        title="Excel and JSON Data Interfaces"
        description="Export operational reports and inspect the JSON endpoints used by the application."
      />
      <ErrorAlert message={error} onClose={() => setError('')} />

      <div className="report-card-grid">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <section className="report-card" key={report.key}>
              <div className="report-icon">
                <Icon size={24} />
              </div>
              <div className="report-body">
                <h2>{report.label}</h2>
                <p>{report.description}</p>
                <small>{report.source}</small>
              </div>
              <div className="report-footer">
                <span>Last exported: {lastExported[report.key] || 'Not exported in this session'}</span>
                <button className="button primary" type="button" onClick={() => exportReport(report)} disabled={exporting === report.key}>
                  <Download size={16} />
                  {exporting === report.key ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="panel tableau-panel">
        <div className="panel-heading">
          <div>
            <h2>Reporting JSON Endpoints</h2>
            <p>These read-only interfaces expose the same reporting data as JSON for dashboard charts or external analysis.</p>
          </div>
        </div>
        <div className="endpoint-grid">
          <div>
            <strong>JSON Data Sources</strong>
            {api.reports.jsonUrls.map((endpoint) => (
              <code key={endpoint}>{endpoint}</code>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
