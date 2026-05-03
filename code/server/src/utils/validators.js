const AppError = require('./AppError');

const appointmentStatuses = ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'no_show'];
const providerStatuses = ['active', 'resting', 'inactive', 'suspended'];
const paymentStatuses = ['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded'];
const reviewDirections = ['receiver_to_provider', 'provider_to_receiver'];

function requireFields(payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  if (missing.length > 0) {
    throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400);
  }
}

function assertPositiveNumber(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new AppError(`${fieldName} must be greater than 0`, 400);
  }
  return numberValue;
}

function assertNonNegativeNumber(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new AppError(`${fieldName} must be 0 or greater`, 400);
  }
  return numberValue;
}

function assertStatus(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new AppError(`${fieldName} must be one of: ${allowed.join(', ')}`, 400);
  }
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Email format is invalid', 400);
  }
}

function normalizeId(value, fieldName = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return id;
}

module.exports = {
  appointmentStatuses,
  providerStatuses,
  paymentStatuses,
  reviewDirections,
  requireFields,
  assertPositiveNumber,
  assertNonNegativeNumber,
  assertStatus,
  validateEmail,
  normalizeId
};
