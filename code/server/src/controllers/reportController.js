const ExcelJS = require('exceljs');
const reportService = require('../services/reportService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function requireManager(req) {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can access platform reports', 403);
  }
}

function formatDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

async function sendWorkbook(res, filename, worksheetName, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Homefix';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(worksheetName);
  worksheet.columns = columns;
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.columns.forEach((column) => {
    column.width = Math.max(column.header.length + 2, 18);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${formatDateStamp()}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

exports.appointmentsJson = asyncHandler(async (req, res) => {
  requireManager(req);
  res.json(await reportService.appointmentsReport());
});

exports.paymentsJson = asyncHandler(async (req, res) => {
  requireManager(req);
  res.json(await reportService.paymentsReport());
});

exports.providerPerformanceJson = asyncHandler(async (req, res) => {
  requireManager(req);
  res.json(await reportService.providerPerformanceReport());
});

exports.exportAppointments = asyncHandler(async (req, res) => {
  requireManager(req);
  const rows = await reportService.appointmentsReport();
  await sendWorkbook(res, 'appointments-report', 'Appointments', [
    { header: 'Appointment ID', key: 'app_id' },
    { header: 'Receiver', key: 'receiver' },
    { header: 'Provider', key: 'provider' },
    { header: 'Service', key: 'service' },
    { header: 'Scheduled Time', key: 'scheduled_time' },
    { header: 'Status', key: 'status' },
    { header: 'Tip Amount', key: 'tip_amount' },
    { header: 'Estimated Total', key: 'estimated_total' }
  ], rows);
});

exports.exportPayments = asyncHandler(async (req, res) => {
  requireManager(req);
  const rows = await reportService.paymentsReport();
  await sendWorkbook(res, 'payments-report', 'Payments', [
    { header: 'Payment ID', key: 'payment_id' },
    { header: 'Appointment ID', key: 'app_id' },
    { header: 'Total Amount', key: 'total_amount' },
    { header: 'Commission Fee', key: 'commission_fee' },
    { header: 'Provider Payout', key: 'provider_payout' },
    { header: 'Payment Status', key: 'payment_status' },
    { header: 'Payment Date', key: 'payment_date' }
  ], rows);
});

exports.exportProviderPerformance = asyncHandler(async (req, res) => {
  requireManager(req);
  const rows = await reportService.providerPerformanceReport();
  await sendWorkbook(res, 'provider-performance-report', 'Provider Performance', [
    { header: 'Provider ID', key: 'provider_id' },
    { header: 'Provider Name', key: 'provider_name' },
    { header: 'Completed Appointments Count', key: 'completed_appointments_count' },
    { header: 'Average Rating', key: 'average_rating' },
    { header: 'Total Payout', key: 'total_payout' }
  ], rows);
});
