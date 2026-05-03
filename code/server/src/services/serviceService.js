const serviceModel = require('../models/serviceModel');
const AppError = require('../utils/AppError');
const { requireFields, normalizeId } = require('../utils/validators');

async function list(search) {
  return serviceModel.list(search);
}

async function getById(id) {
  const service = await serviceModel.findById(normalizeId(id, 'service_id'));
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  return service;
}

async function create(payload) {
  requireFields(payload, ['service_name']);
  const id = await serviceModel.create(payload);
  return serviceModel.findById(id);
}

async function update(id, payload) {
  const serviceId = normalizeId(id, 'service_id');
  const updatePayload = {};
  ['service_name', 'description'].forEach((field) => {
    if (payload[field] !== undefined) {
      updatePayload[field] = payload[field] || null;
    }
  });

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('No service fields were provided for update', 400);
  }

  const affectedRows = await serviceModel.update(serviceId, updatePayload);
  if (!affectedRows) {
    throw new AppError('Service not found', 404);
  }
  return serviceModel.findById(serviceId);
}

async function remove(id) {
  const affectedRows = await serviceModel.remove(normalizeId(id, 'service_id'));
  if (!affectedRows) {
    throw new AppError('Service not found', 404);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
