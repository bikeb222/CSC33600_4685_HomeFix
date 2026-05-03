const reviewModel = require('../models/reviewModel');
const AppError = require('../utils/AppError');
const { requireFields, normalizeId, assertStatus, reviewDirections } = require('../utils/validators');

async function list(filters = {}) {
  return reviewModel.list(filters);
}

async function create(payload) {
  requireFields(payload, ['app_id', 'rating', 'review_direction']);
  const appId = normalizeId(payload.app_id, 'app_id');
  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('rating must be an integer from 1 to 5', 400);
  }
  assertStatus(payload.review_direction, reviewDirections, 'review_direction');

  const appointment = await reviewModel.appointmentById(appId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }
  if (appointment.appointment_status !== 'completed') {
    throw new AppError('Reviews can only be created after the appointment is completed', 400);
  }

  const id = await reviewModel.create({
    app_id: appId,
    rating,
    review_direction: payload.review_direction,
    comment: payload.comment
  });
  const rows = await reviewModel.list({ appointmentId: appId });
  return rows.find((row) => row.review_id === id);
}

async function remove(id) {
  const affectedRows = await reviewModel.remove(normalizeId(id, 'review_id'));
  if (!affectedRows) {
    throw new AppError('Review not found', 404);
  }
}

module.exports = {
  list,
  create,
  remove
};
