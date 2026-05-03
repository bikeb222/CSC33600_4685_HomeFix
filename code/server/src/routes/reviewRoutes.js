const router = require('express').Router();
const reviewController = require('../controllers/reviewController');

router.post('/reviews', reviewController.create);
router.get('/reviews', reviewController.list);
router.get('/appointments/:appointmentId/reviews', reviewController.listForAppointment);
router.get('/providers/:providerId/reviews', reviewController.listForProvider);
router.delete('/reviews/:id', reviewController.remove);

module.exports = router;
