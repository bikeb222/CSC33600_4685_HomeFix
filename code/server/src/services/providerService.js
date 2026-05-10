const providerModel = require('../models/providerModel');
const appointmentModel = require('../models/appointmentModel');
const authService = require('./authService');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const {
  requireFields,
  normalizeId,
  assertNonNegativeNumber,
  assertStatus,
  providerStatuses
} = require('../utils/validators');

function normalizeDateTime(value, fieldName) {
  if (!value) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid date/time`, 400);
  }
  const normalized = String(value).replace('T', ' ').slice(0, 19);
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

async function register(payload, actor) {
  const user = await authService.register({
    ...payload,
    role: 'provider',
    display_name: payload.display_name || payload.username
  }, actor);
  return providerModel.findById(user.provider_id);
}

async function list({ search = '', serviceId = null, activeOnly = false, viewerRole = 'manager' } = {}) {
  return providerModel.list({
    search,
    serviceId: serviceId ? normalizeId(serviceId, 'service_id') : null,
    activeOnly,
    viewerRole
  });
}

async function getById(id) {
  const provider = await providerModel.findById(normalizeId(id, 'provider_id'));
  if (!provider) {
    throw new AppError('Provider not found', 404);
  }
  return provider;
}

async function update(id, payload) {
  const providerId = normalizeId(id, 'provider_id');
  const updatePayload = {};

  ['username', 'email', 'phone', 'provider_status', 'biography'].forEach((field) => {
    if (payload[field] !== undefined) {
      updatePayload[field] = payload[field] || null;
    }
  });

  delete updatePayload.username;
  delete updatePayload.email;
  if (updatePayload.provider_status) {
    assertStatus(updatePayload.provider_status, providerStatuses, 'provider_status');
  }

  await getById(providerId);
  if (payload.display_name !== undefined || payload.username !== undefined) {
    updatePayload.display_name = payload.display_name || payload.username;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('No provider fields were provided for update', 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await providerModel.update(providerId, updatePayload, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return providerModel.findById(providerId);
}

async function remove(id) {
  const affectedRows = await providerModel.remove(normalizeId(id, 'provider_id'));
  if (!affectedRows) {
    throw new AppError('Provider not found', 404);
  }
}

async function listServices(providerId, viewerRole = 'manager') {
  await getById(providerId);
  return providerModel.listServices(normalizeId(providerId, 'provider_id'), viewerRole);
}

async function addService(providerId, payload, actor = null) {
  const normalizedProviderId = normalizeId(providerId, 'provider_id');
  await getById(normalizedProviderId);
  requireFields(payload, ['service_id', 'base_hourly_rate']);
  const serviceId = normalizeId(payload.service_id, 'service_id');
  const rate = assertNonNegativeNumber(payload.base_hourly_rate, 'base_hourly_rate');
  const isManager = actor?.role === 'manager';
  await providerModel.addService(
    normalizedProviderId,
    serviceId,
    rate,
    isManager ? 'approved' : 'pending',
    isManager ? actor.manager_id : null
  );
  return providerModel.listServices(normalizedProviderId);
}

async function listServiceApprovals(status = '') {
  if (status) {
    assertStatus(status, ['pending', 'approved', 'rejected'], 'approval_status');
  }
  return providerModel.listServiceApprovals(status);
}

async function reviewService(providerId, serviceId, status, managerId) {
  assertStatus(status, ['approved', 'rejected'], 'approval_status');
  const affectedRows = await providerModel.reviewService(
    normalizeId(providerId, 'provider_id'),
    normalizeId(serviceId, 'service_id'),
    status,
    normalizeId(managerId, 'manager_id')
  );
  if (!affectedRows) {
    throw new AppError('Provider service request not found', 404);
  }
  return providerModel.listServices(providerId);
}

async function listUnavailableBlocks(providerId) {
  const normalizedProviderId = normalizeId(providerId, 'provider_id');
  await getById(normalizedProviderId);
  return providerModel.listUnavailableBlocks(normalizedProviderId);
}

async function addUnavailableBlock(providerId, payload) {
  const normalizedProviderId = normalizeId(providerId, 'provider_id');
  await getById(normalizedProviderId);
  requireFields(payload, ['start_time', 'end_time']);
  const startTime = normalizeDateTime(payload.start_time, 'start_time');
  const endTime = normalizeDateTime(payload.end_time, 'end_time');
  if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
    throw new AppError('end_time must be after start_time', 400);
  }
  const blockHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (60 * 60 * 1000);
  const appointmentConflict = await appointmentModel.providerHasConflict(normalizedProviderId, startTime, blockHours);
  if (appointmentConflict?.conflict_type === 'appointment') {
    throw new AppError('This unavailable block overlaps an existing appointment', 409);
  }
  const overlap = await providerModel.unavailableBlockHasOverlap(normalizedProviderId, startTime, endTime);
  if (overlap) {
    throw new AppError('This unavailable block overlaps an existing block', 409);
  }
  const id = await providerModel.addUnavailableBlock(
    normalizedProviderId,
    startTime,
    endTime,
    payload.reason || null
  );
  const blocks = await providerModel.listUnavailableBlocks(normalizedProviderId);
  return blocks.find((block) => Number(block.block_id) === Number(id));
}

async function removeUnavailableBlock(providerId, blockId) {
  const affectedRows = await providerModel.removeUnavailableBlock(
    normalizeId(providerId, 'provider_id'),
    normalizeId(blockId, 'block_id')
  );
  if (!affectedRows) {
    throw new AppError('Unavailable block not found', 404);
  }
}

async function removeService(providerId, serviceId) {
  const affectedRows = await providerModel.removeService(
    normalizeId(providerId, 'provider_id'),
    normalizeId(serviceId, 'service_id')
  );
  if (!affectedRows) {
    throw new AppError('Provider service link not found', 404);
  }
}

module.exports = {
  register,
  list,
  getById,
  update,
  remove,
  listServices,
  addService,
  listServiceApprovals,
  reviewService,
  listUnavailableBlocks,
  addUnavailableBlock,
  removeUnavailableBlock,
  removeService
};
