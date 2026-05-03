const paymentService = require('../services/paymentService');
const appointmentService = require('../services/appointmentService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function scopedPaymentFilters(user) {
  if (user.role === 'provider') {
    return { providerId: user.provider_id };
  }
  if (user.role === 'receiver') {
    return { receiverId: user.receiver_id };
  }
  return {};
}

function canAccessPayment(user, payment) {
  return user.role === 'manager'
    || (user.role === 'provider' && Number(user.provider_id) === Number(payment.provider_id))
    || (user.role === 'receiver' && Number(user.receiver_id) === Number(payment.receiver_id));
}

exports.create = asyncHandler(async (req, res) => {
  if (!['manager', 'receiver'].includes(req.user.role)) {
    throw new AppError('Only managers and receivers can create payments', 403);
  }
  const payload = { ...req.body };
  if (req.user.role === 'receiver') {
    const appointment = await appointmentService.getById(payload.app_id);
    if (Number(appointment.receiver_id) !== Number(req.user.receiver_id)) {
      throw new AppError('Receivers can only create payments for their own appointments', 403);
    }
    payload.payment_status = 'paid';
    delete payload.total_amount;
    delete payload.commission_rate;
  }
  const payment = await paymentService.create(payload);
  if (!canAccessPayment(req.user, payment)) {
    throw new AppError('You do not have permission to create this payment', 403);
  }
  res.status(201).json(payment);
});

exports.list = asyncHandler(async (req, res) => {
  const payments = await paymentService.list(scopedPaymentFilters(req.user));
  res.json(payments);
});

exports.getById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getById(req.params.id);
  if (!canAccessPayment(req.user, payment)) {
    throw new AppError('You do not have permission to access this payment', 403);
  }
  res.json(payment);
});

exports.getByAppointment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getByAppointment(req.params.appointmentId);
  if (!canAccessPayment(req.user, payment)) {
    throw new AppError('You do not have permission to access this payment', 403);
  }
  res.json(payment);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can update payment status', 403);
  }
  const payment = await paymentService.updateStatus(req.params.id, req.body.payment_status);
  res.json(payment);
});

exports.recharge = asyncHandler(async (req, res) => {
  let receiverId = req.params.receiverId;
  if (req.user.role === 'receiver') {
    receiverId = req.user.receiver_id;
  } else if (req.user.role !== 'manager') {
    throw new AppError('Only receivers and managers can recharge a wallet', 403);
  }
  const receiver = await paymentService.recharge(receiverId, req.body.amount);
  res.json(receiver);
});
