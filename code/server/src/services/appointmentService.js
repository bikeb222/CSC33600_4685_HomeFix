const appointmentModel = require('../models/appointmentModel');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const {
  appointmentStatuses,
  requireFields,
  normalizeId,
  assertPositiveNumber,
  assertNonNegativeNumber,
  assertStatus
} = require('../utils/validators');

const DEFAULT_PLATFORM_FEE_RATE = 0.15;

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
  const tipAmount = payload.tip_amount === undefined || payload.tip_amount === ''
    ? 0
    : assertNonNegativeNumber(payload.tip_amount, 'tip_amount');
  const scheduledTime = normalizeDateTime(payload.scheduled_time);

  const connection = await pool.getConnection();
  let id;
  let queueAhead = 0;
  try {
    await connection.beginTransaction();
    await appointmentModel.lockProvider(providerId, connection);

    const receiverExists = await appointmentModel.receiverExists(receiverId, connection);
    if (!receiverExists) {
      throw new AppError('Receiver not found', 404);
    }

    const addressBelongs = await appointmentModel.addressBelongsToReceiver(receiverId, addressId, connection);
    if (!addressBelongs) {
      throw new AppError('Address does not belong to the selected receiver', 400);
    }

    const providerService = await appointmentModel.providerService(providerId, serviceId, connection);
    if (!providerService) {
      throw new AppError('Selected provider does not offer this approved service', 400);
    }

    const conflict = await appointmentModel.providerHasConflict(
      providerId,
      scheduledTime,
      estimatedHours,
      null,
      connection
    );
    if (conflict) {
      throw new AppError('Selected provider is unavailable at this time because an accepted appointment or unavailable block already covers it', 409);
    }

    queueAhead = await appointmentModel.pendingQueueAhead(providerId, scheduledTime, estimatedHours, connection);
    const surcharge = calculateScheduleSurcharge(scheduledTime, estimatedHours);

    id = await appointmentModel.create({
      receiver_id: receiverId,
      provider_id: providerId,
      service_id: serviceId,
      address_id: addressId,
      scheduled_time: scheduledTime,
      provider_base_hourly_rate_at_booking: providerService.base_hourly_rate,
      platform_fee_rate: DEFAULT_PLATFORM_FEE_RATE,
      schedule_surcharge_rate: surcharge.rate,
      schedule_surcharge_reason: surcharge.reason,
      estimated_hours: estimatedHours,
      tip_amount: tipAmount
    }, connection);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const appointment = await appointmentModel.findById(id);
  return {
    ...appointment,
    pending_queue_ahead: queueAhead,
    queue_message: queueAhead > 0
      ? `${queueAhead} pending appointment${queueAhead === 1 ? '' : 's'} already requested this provider during this time.`
      : null
  };
}

async function updatePendingRequest(id, payload) {
  const appointmentId = normalizeId(id, 'app_id');
  const connection = await pool.getConnection();
  let queueAhead = 0;
  try {
    await connection.beginTransaction();
    const appointment = await appointmentModel.lockAppointment(appointmentId, connection);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    if (appointment.appointment_status !== 'pending') {
      throw new AppError('Only pending appointments can be adjusted', 400);
    }

    await appointmentModel.lockProvider(appointment.provider_id, connection);

    const scheduledTime = payload.scheduled_time === undefined || payload.scheduled_time === ''
      ? normalizeDateTime(appointment.scheduled_time)
      : normalizeDateTime(payload.scheduled_time);
    const estimatedHours = payload.estimated_hours === undefined || payload.estimated_hours === ''
      ? Number(appointment.estimated_hours)
      : assertPositiveNumber(payload.estimated_hours, 'estimated_hours');
    const tipAmount = payload.tip_amount === undefined || payload.tip_amount === ''
      ? Number(appointment.tip_amount || 0)
      : assertNonNegativeNumber(payload.tip_amount, 'tip_amount');

    const providerService = await appointmentModel.providerService(
      appointment.provider_id,
      appointment.service_id,
      connection
    );
    if (!providerService) {
      throw new AppError('Selected provider does not offer this approved service', 400);
    }

    const conflict = await appointmentModel.providerHasConflict(
      appointment.provider_id,
      scheduledTime,
      estimatedHours,
      appointment.app_id,
      connection
    );
    if (conflict) {
      throw new AppError('Selected provider is unavailable at this time because an accepted appointment or unavailable block already covers it', 409);
    }

    queueAhead = await appointmentModel.pendingQueueAhead(
      appointment.provider_id,
      scheduledTime,
      estimatedHours,
      connection,
      appointment.app_id
    );
    const surcharge = calculateScheduleSurcharge(scheduledTime, estimatedHours);
    await appointmentModel.updatePendingRequest(appointmentId, {
      scheduled_time: scheduledTime,
      provider_base_hourly_rate_at_booking: providerService.base_hourly_rate,
      platform_fee_rate: Number(appointment.platform_fee_rate || DEFAULT_PLATFORM_FEE_RATE),
      schedule_surcharge_rate: surcharge.rate,
      schedule_surcharge_reason: surcharge.reason,
      estimated_hours: estimatedHours,
      tip_amount: tipAmount
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const appointment = await appointmentModel.findById(appointmentId);
  return {
    ...appointment,
    pending_queue_ahead: queueAhead,
    queue_message: queueAhead > 0
      ? `${queueAhead} pending appointment${queueAhead === 1 ? '' : 's'} already requested this provider during this time.`
      : null
  };
}

async function updateStatus(id, status) {
  const appointmentId = normalizeId(id, 'app_id');
  assertStatus(status, appointmentStatuses, 'appointment_status');

  if (status !== 'accepted') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const appointment = await appointmentModel.lockAppointment(appointmentId, connection);
      if (!appointment) {
        throw new AppError('Appointment not found', 404);
      }
      await appointmentModel.updateStatusInTransaction(appointmentId, status, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return appointmentModel.findById(appointmentId);
  }

  const connection = await pool.getConnection();
  let rejectedConflicts = 0;
  try {
    await connection.beginTransaction();
    const appointment = await appointmentModel.lockAppointment(appointmentId, connection);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    await appointmentModel.lockProvider(appointment.provider_id, connection);

    const conflict = await appointmentModel.providerHasConflict(
      appointment.provider_id,
      appointment.scheduled_time,
      appointment.actual_hours || appointment.estimated_hours,
      appointment.app_id,
      connection
    );
    if (conflict) {
      throw new AppError('Provider already has an accepted appointment or unavailable block during this time', 409);
    }

    await appointmentModel.updateStatusInTransaction(appointmentId, 'accepted', connection);
    rejectedConflicts = await appointmentModel.rejectPendingConflicts(appointment, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const appointment = await appointmentModel.findById(appointmentId);
  return {
    ...appointment,
    rejected_conflicting_pending_count: rejectedConflicts
  };
}

async function updateActualHours(id, actualHours) {
  const appointmentId = normalizeId(id, 'app_id');
  const normalizedHours = assertPositiveNumber(actualHours, 'actual_hours');
  const appointment = await getById(appointmentId);
  if (!['accepted', 'in_progress'].includes(appointment.appointment_status)) {
    throw new AppError('Actual service hours can only be changed before the appointment is completed', 400);
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const lockedAppointment = await appointmentModel.lockAppointment(appointmentId, connection);
    if (!lockedAppointment) {
      throw new AppError('Appointment not found', 404);
    }
    await appointmentModel.updateActualHours(appointmentId, normalizedHours, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
  updatePendingRequest,
  unavailableTimes,
  remove
};
