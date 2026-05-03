const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

router.post('/payments', paymentController.create);
router.get('/payments', paymentController.list);
router.post('/receivers/:receiverId/recharge', paymentController.recharge);
router.post('/wallet/recharge', paymentController.recharge);
router.get('/payments/:id', paymentController.getById);
router.get('/appointments/:appointmentId/payment', paymentController.getByAppointment);
router.put('/payments/:id/status', paymentController.updateStatus);

module.exports = router;
