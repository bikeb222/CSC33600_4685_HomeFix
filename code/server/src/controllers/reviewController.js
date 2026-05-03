const reviewService = require('../services/reviewService');
const appointmentService = require('../services/appointmentService');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

exports.create = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getById(req.body.app_id);
  if (req.user.role === 'receiver') {
    if (Number(appointment.receiver_id) !== Number(req.user.receiver_id) || req.body.review_direction !== 'receiver_to_provider') {
      throw new AppError('Receivers can only review providers for their own appointments', 403);
    }
  } else if (req.user.role === 'provider') {
    if (Number(appointment.provider_id) !== Number(req.user.provider_id) || req.body.review_direction !== 'provider_to_receiver') {
      throw new AppError('Providers can only review receivers for their own appointments', 403);
    }
  } else {
    throw new AppError('Only receivers and providers can create reviews', 403);
  }
  const review = await reviewService.create(req.body);
  res.status(201).json(review);
});

exports.list = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.user.role === 'provider') {
    filters.providerId = req.user.provider_id;
  }
  if (req.user.role === 'receiver') {
    filters.receiverId = req.user.receiver_id;
  }
  const reviews = await reviewService.list(filters);
  res.json(reviews);
});

exports.listForAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getById(req.params.appointmentId);
  const allowed = req.user.role === 'manager'
    || (req.user.role === 'provider' && Number(appointment.provider_id) === Number(req.user.provider_id))
    || (req.user.role === 'receiver' && Number(appointment.receiver_id) === Number(req.user.receiver_id));
  if (!allowed) {
    throw new AppError('You do not have permission to access these reviews', 403);
  }
  const reviews = await reviewService.list({ appointmentId: req.params.appointmentId });
  res.json(reviews);
});

exports.listForProvider = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager' && Number(req.user.provider_id) !== Number(req.params.providerId)) {
    throw new AppError('You do not have permission to access these reviews', 403);
  }
  const reviews = await reviewService.list({ providerId: req.params.providerId });
  res.json(reviews);
});

exports.remove = asyncHandler(async (req, res) => {
  if (req.user.role !== 'manager') {
    throw new AppError('Only managers can delete reviews', 403);
  }
  await reviewService.remove(req.params.id);
  res.status(204).send();
});
