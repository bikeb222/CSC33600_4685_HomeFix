const router = require('express').Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const receiverRoutes = require('./receiverRoutes');
const providerRoutes = require('./providerRoutes');
const serviceRoutes = require('./serviceRoutes');
const addressRoutes = require('./addressRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const paymentRoutes = require('./paymentRoutes');
const reviewRoutes = require('./reviewRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const { authenticate } = require('../middleware/auth');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'homefix-api' });
});

router.use('/auth', authRoutes);
router.use(authenticate);
router.use('/dashboard', dashboardRoutes);
router.use(addressRoutes);
router.use(appointmentRoutes);
router.use(paymentRoutes);
router.use(reviewRoutes);
router.use(reportRoutes);
router.use('/users', userRoutes);
router.use('/receivers', receiverRoutes);
router.use('/providers', providerRoutes);
router.use('/services', serviceRoutes);

module.exports = router;
