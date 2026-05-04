const appointmentModel = require('../models/appointmentModel');
const AppError = require('../utils/AppError');
const {
  appointmentStatuses,
  requireFields,
  normalizeId,
  assertPositiveNumber,
  assertStatus
} = require('../utils/validators');

function normalizeDateTime(value) {
  if (!value) {
    throw new AppError('scheduled_time is required', 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('scheduled_time must be a valid date/time', 400);
  }
  const normalized = String(value).replace('T', ' ').slice(0, 19);
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function localDateParts(value) {
  const [datePart, timePart = '00:00:00'] = String(value).replace('T', ' ').split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute = 0, second = 0] = timePart.split(':').map(Number);
  return { year, month, day, hour, minute, second };
}

function calculateScheduleSurcharge(scheduledTime, estimatedHours) {
  const parts = localDateParts(scheduledTime);
  const start = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const day = start.getDay();
  const isWeekend = day === 0 || day === 6;
  const startMinutes = parts.hour * 60 + parts.minute;
  const endMinutes = startMinutes + Math.ceil(Number(estimatedHours) * 60);
  const isAfterHours = startMinutes < 8 * 60 || endMinutes > 17 * 60;
  const reasons = [];
  let rate = 0;

  if (isWeekend) {
    rate += 0.10;
    reasons.push('weekend');
  }
  if (isAfterHours) {
    rate += 0.20;
    reasons.push('after_hours');
  }

  return {
    rate,
    reason: reasons.length ? reasons.join('_') : 'standard_hours'
  };
}

function applySurcharge(baseRate, surchargeRate) {
  return Math.round(Number(baseRate) * (1 + Number(surchargeRate)) * 100) / 100;
}

async function list(filters = {}) {
  return appointmentModel.list(filters);
}

async function getById(id) {
  const appointment = await appointmentModel.findById(normalizeId(id, 'app_id'));
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }
  return appointment;
}

async function create(payload) {
  requireFields(payload, ['receiver_id', 'provider_id', 'service_id', 'address_id', 'scheduled_time', 'estimated_hours']);

  const receiverId = normalizeId(payload.receiver_id, 'receiver_id');
  const providerId = normalizeId(payload.provider_id, 'provider_id');
  const serviceId = normalizeId(payload.service_id, 'service_id');
  const addressId = normalizeId(payload.address_id, 'address_id');
  const estimatedHours = assertPositiveNumber(payload.estimated_hours, 'estimated_hours');
  const scheduledTime = normalizeDateTime(payload.scheduled_time);

  const receiverExists = await appointmentModel.receiverExists(receiverId);
  if (!receiverExists) {
    throw new AppError('Receiver not found', 404);
  }

  const addressBelongs = await appointmentModel.addressBelongsToReceiver(receiverId, addressId);
  if (!addressBelongs) {
    throw new AppError('Address does not belong to the selected receiver', 400);
  }

  const providerService = await appointmentModel.providerService(providerId, serviceId);
  if (!providerService) {
    throw new AppError('Selected provider does not offer this approved service', 400);
  }

  const conflict = await appointmentModel.providerHasConflict(
    providerId,
    scheduledTime,
    estimatedHours
  );
  if (conflict) {
    throw new AppError('Selected provider is unavailable at this time', 409);
  }

  const surcharge = calculateScheduleSurcharge(scheduledTime, estimatedHours);

  const id = await appointmentModel.create({
    receiver_id: receiverId,
    provider_id: providerId,
    service_id: serviceId,
    address_id: addressId,
    scheduled_time: scheduledTime,
    hourly_rate_at_booking: applySurcharge(providerService.base_hourly_rate, surcharge.rate),
    schedule_surcharge_rate: surcharge.rate,
    schedule_surcharge_reason: surcharge.reason,
    estimated_hours: estimatedHours
  });

  return appointmentModel.findById(id);
}

async function updateStatus(id, status) {
  const appointmentId = normalizeId(id, 'app_id');
  assertStatus(status, appointmentStatuses, 'appointment_status');
  const affectedRows = await appointmentModel.updateStatus(appointmentId, status);
  if (!affectedRows) {
    throw new AppError('Appointment not found', 404);
  }
  return appointmentModel.findById(appointmentId);
}

async function updateActualHours(id, actualHours) {
  const appointmentId = normalizeId(id, 'app_id');
  const normalizedHours = assertPositiveNumber(actualHours, 'actual_hours');
  const appointment = await getById(appointmentId);
  if (!['accepted', 'in_progress'].includes(appointment.appointment_status)) {
    throw new AppError('Actual service hours can only be changed before the appointment is completed', 400);
  }
  const affectedRows = await appointmentModel.updateActualHours(appointmentId, normalizedHours);
  if (!affectedRows) {
    throw new AppError('Appointment not found', 404);
  }
  return appointmentModel.findById(appointmentId);
}

async function unavailableTimes(providerId) {
  return appointmentModel.providerUnavailableTimes(normalizeId(providerId, 'provider_id'));
}

async function remove(id) {
  const affectedRows = await appointmentModel.remove(normalizeId(id, 'app_id'));
  if (!affectedRows) {
    throw new AppError('Appointment not found', 404);
  }
}

module.exports = {
  list,
  getById,
  create,
  updateStatus,
  updateActualHours,
  unavailableTimes,
  remove
};
