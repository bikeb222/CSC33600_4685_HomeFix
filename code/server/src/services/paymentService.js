const paymentModel = require('../models/paymentModel');
const receiverModel = require('../models/receiverModel');
const AppError = require('../utils/AppError');
const {
  requireFields,
  normalizeId,
  assertNonNegativeNumber,
  assertStatus,
  paymentStatuses
} = require('../utils/validators');

async function list(filters = {}) {
  return paymentModel.list(filters);
}

async function getById(id) {
  const payment = await paymentModel.findById(normalizeId(id, 'payment_id'));
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  return payment;
}

async function getByAppointment(appointmentId) {
  const payment = await paymentModel.findByAppId(normalizeId(appointmentId, 'app_id'));
  if (!payment) {
    throw new AppError('Payment not found for this appointment', 404);
  }
  return payment;
}

async function create(payload) {
  requireFields(payload, ['app_id']);
  const appId = normalizeId(payload.app_id, 'app_id');
  const commissionRate = payload.commission_rate === undefined
    ? 0.15
    : assertNonNegativeNumber(payload.commission_rate, 'commission_rate');

  if (commissionRate > 1) {
    throw new AppError('commission_rate must be between 0 and 1', 400);
  }

  const paymentStatus = payload.payment_status || 'unpaid';
  assertStatus(paymentStatus, paymentStatuses, 'payment_status');

  const existingPayment = await paymentModel.findByAppId(appId);
  if (existingPayment) {
    throw new AppError('This appointment already has a payment', 409);
  }

  const appointment = await paymentModel.appointmentForPayment(appId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }
  if (appointment.appointment_status !== 'completed') {
    throw new AppError('Payment can only be created after the appointment is completed', 400);
  }
  if (!appointment.actual_hours) {
    throw new AppError('Actual service hours are required before payment', 400);
  }

  const totalAmount = payload.total_amount === undefined
    ? appointment.actual_total
    : assertNonNegativeNumber(payload.total_amount, 'total_amount');

  if (paymentStatus === 'paid') {
    const deducted = await receiverModel.adjustWallet(appointment.receiver_id, -totalAmount);
    if (!deducted) {
      throw new AppError('Receiver wallet balance is insufficient', 400);
    }
  }

  const id = await paymentModel.create({
    app_id: appId,
    total_amount: totalAmount,
    commission_rate: commissionRate,
    payment_status: paymentStatus
  });
  return paymentModel.findById(id);
}

async function updateStatus(id, status) {
  const paymentId = normalizeId(id, 'payment_id');
  assertStatus(status, paymentStatuses, 'payment_status');
  const existing = await getById(paymentId);
  if (existing.payment_status !== 'paid' && status === 'paid') {
    const deducted = await receiverModel.adjustWallet(existing.receiver_id, -Number(existing.total_amount));
    if (!deducted) {
      throw new AppError('Receiver wallet balance is insufficient', 400);
    }
  }
  if (existing.payment_status === 'paid' && status === 'refunded') {
    await receiverModel.adjustWallet(existing.receiver_id, Number(existing.total_amount));
  }
  const affectedRows = await paymentModel.updateStatus(paymentId, status);
  if (!affectedRows) {
    throw new AppError('Payment not found', 404);
  }
  return paymentModel.findById(paymentId);
}

async function recharge(receiverId, amount) {
  const normalizedReceiverId = normalizeId(receiverId, 'receiver_id');
  const normalizedAmount = assertNonNegativeNumber(amount, 'amount');
  if (normalizedAmount <= 0) {
    throw new AppError('amount must be greater than 0', 400);
  }
  const affectedRows = await receiverModel.adjustWallet(normalizedReceiverId, normalizedAmount);
  if (!affectedRows) {
    throw new AppError('Receiver not found', 404);
  }
  return receiverModel.findById(normalizedReceiverId);
}

module.exports = {
  list,
  getById,
  getByAppointment,
  create,
  updateStatus,
  recharge
};
