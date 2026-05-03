const router = require('express').Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/appointments', appointmentController.create);
router.get('/appointments', appointmentController.list);
router.get('/appointments/:id', appointmentController.getById);
router.get('/providers/:providerId/unavailable-times', appointmentController.providerUnavailableTimes);
router.get('/receivers/:receiverId/appointments', appointmentController.listForReceiver);
router.get('/providers/:providerId/appointments', appointmentController.listForProvider);
router.put('/appointments/:id/status', appointmentController.updateStatus);
router.put('/appointments/:id/actual-hours', appointmentController.updateActualHours);
router.delete('/appointments/:id', appointmentController.remove);

module.exports = router;
