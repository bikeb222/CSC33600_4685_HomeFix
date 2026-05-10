const appointmentService = require('../services/appointmentService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

function canAccessAppointment(user, appointment) {
  return user.role === 'manager'
    || (user.role === 'provider' && Number(user.provider_id) === Number(appointment.provider_id))
    || (user.role === 'receiver' && Number(user.receiver_id) === Number(appointment.receiver_id));
}

exports.create = asyncHandler(async (req, res) => {
  if (!['manager', 'receiver'].includes(req.user.role)) {
    throw new AppError('Only managers and receivers can create appointments', 403);
  }
  const body = { ...req.body };
  if (req.user.role === 'receiver') {
    body.receiver_id = req.user.receiver_id;
  }
  const appointment = await appointmentService.create(body);
  res.status(201).json(appointment);
});

exports.list = asyncHandler(async (req, res) => {
  const filters = { status: req.query.status || null };
  if (req.user.role === 'provider') {
    filters.providerId = req.user.provider_id;
  }
  if (req.user.role === 'receiver') {
    filters.receiverId = req.user.receiver_id;
  }
  const appointments = await appointmentService.list({
    ...filters
  });
  res.json(appointments);
});

exports.getById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getById(req.params.id);
  if (!canAccessAppointment(req.user, appointment)) {
    throw new AppError('You do not have permission to access this appointment', 403);
  }
  res.json(appointment);
});

exports.listForReceiver = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager' && Number(req.user.receiver_id) !== Number(req.params.receiverId)) {
    throw new AppError('You do not have permission to access these appointments', 403);
  }
  const appointments = await appointmentService.list({ receiverId: req.params.receiverId });
  res.json(appointments);
});

exports.listForProvider = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager' && Number(req.user.provider_id) !== Number(req.params.providerId)) {
    throw new AppError('You do not have permission to access these appointments', 403);
  }
  const appointments = await appointmentService.list({ providerId: req.params.providerId });
  res.json(appointments);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const existing = await appointmentService.getById(req.params.id);
  if (!canAccessAppointment(req.user, existing)) {
    throw new AppError('You do not have permission to update this appointment', 403);
  }
  const nextStatus = req.body.appointment_status;
  if (req.user.role === 'provider') {
    const allowed = {
      pending: ['accepted', 'rejected'],
      accepted: ['in_progress']
    };
    if (!allowed[existing.appointment_status]?.includes(nextStatus)) {
      throw new AppError('Provider status transition is not allowed', 403);
    }
  }
  if (req.user.role === 'receiver') {
    const canCancel = ['pending', 'accepted'].includes(existing.appointment_status) && nextStatus === 'cancelled';
    const canConfirmComplete = ['accepted', 'in_progress'].includes(existing.appointment_status) && nextStatus === 'completed';
    if (!canCancel && !canConfirmComplete) {
      throw new AppError('Receivers can cancel pending or accepted appointments, or confirm accepted/in-progress appointments as completed', 403);
    }
  }
  const appointment = await appointmentService.updateStatus(req.params.id, req.body.appointment_status);
  res.json(appointment);
});

exports.updateActualHours = asyncHandler(async (req, res) => {
  const existing = await appointmentService.getById(req.params.id);
  if (req.user.role !== 'manager' && (req.user.role !== 'provider' || Number(req.user.provider_id) !== Number(existing.provider_id))) {
    throw new AppError('Only the assigned provider or a manager can update actual service hours', 403);
  }
  const appointment = await appointmentService.updateActualHours(req.params.id, req.body.actual_hours);
  res.json(appointment);
});

exports.updatePendingRequest = asyncHandler(async (req, res) => {
  const existing = await appointmentService.getById(req.params.id);
  if (!canAccessAppointment(req.user, existing)) {
    throw new AppError('You do not have permission to update this appointment', 403);
  }
  if (!['manager', 'receiver'].includes(req.user.role)) {
    throw new AppError('Only receivers or managers can adjust pending appointment requests', 403);
  }
  const appointment = await appointmentService.updatePendingRequest(req.params.id, req.body);
  res.json(appointment);
});

exports.providerUnavailableTimes = asyncHandler(async (req, res) => {
  const rows = await appointmentService.unavailableTimes(req.params.providerId);
  res.json(rows);
});

exports.remove = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can delete appointments', 403);
  }
  await appointmentService.remove(req.params.id);
  res.status(204).send();
});
