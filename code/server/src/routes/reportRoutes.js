const router = require('express').Router();
const reportController = require('../controllers/reportController');

router.get('/reports/appointments', reportController.appointmentsJson);
router.get('/reports/payments', reportController.paymentsJson);
router.get('/reports/provider-performance', reportController.providerPerformanceJson);
router.get('/reports/appointments/export', reportController.exportAppointments);
router.get('/reports/payments/export', reportController.exportPayments);
router.get('/reports/provider-performance/export', reportController.exportProviderPerformance);

module.exports = router;
