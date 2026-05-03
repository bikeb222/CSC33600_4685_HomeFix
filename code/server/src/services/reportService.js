const reportModel = require('../models/reportModel');

async function appointmentsReport() {
  return reportModel.appointmentsReport();
}

async function paymentsReport() {
  return reportModel.paymentsReport();
}

async function providerPerformanceReport() {
  return reportModel.providerPerformanceReport();
}

module.exports = {
  appointmentsReport,
  paymentsReport,
  providerPerformanceReport
};
