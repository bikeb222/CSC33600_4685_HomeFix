const { pool } = require('../config/db');
const addressModel = require('../models/addressModel');
const receiverModel = require('../models/receiverModel');
const AppError = require('../utils/AppError');
const { requireFields, normalizeId } = require('../utils/validators');

async function ensureReceiver(receiverId) {
  const receiver = await receiverModel.findById(receiverId);
  if (!receiver) {
    throw new AppError('Receiver not found', 404);
  }
}

async function listForReceiver(receiverId) {
  const normalizedReceiverId = normalizeId(receiverId, 'receiver_id');
  await ensureReceiver(normalizedReceiverId);
  return addressModel.listForReceiver(normalizedReceiverId);
}

async function create(receiverId, payload) {
  const normalizedReceiverId = normalizeId(receiverId, 'receiver_id');
  await ensureReceiver(normalizedReceiverId);
  requireFields(payload, ['street', 'city']);
  const addressPayload = {
    ...payload,
    receiver_id: normalizedReceiverId,
    is_default: Boolean(payload.is_default)
  };

  if (!addressPayload.is_default) {
    const id = await addressModel.create(addressPayload);
    return addressModel.findById(id);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await addressModel.clearDefault(normalizedReceiverId, connection);
    const id = await addressModel.create(addressPayload, connection);
    await connection.commit();
    return addressModel.findById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function update(addressId, payload) {
  const normalizedAddressId = normalizeId(addressId, 'address_id');
  const existing = await addressModel.findById(normalizedAddressId);
  if (!existing) {
    throw new AppError('Address not found', 404);
  }

  const updatePayload = {};
  ['street', 'city', 'state', 'zip_code', 'is_default'].forEach((field) => {
    if (payload[field] !== undefined) {
      updatePayload[field] = field === 'is_default' ? Boolean(payload[field]) : payload[field] || null;
    }
  });

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('No address fields were provided for update', 400);
  }

  if (updatePayload.is_default === true) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await addressModel.clearDefault(existing.receiver_id, connection);
      await addressModel.update(normalizedAddressId, updatePayload, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } else {
    await addressModel.update(normalizedAddressId, updatePayload);
  }

  return addressModel.findById(normalizedAddressId);
}

async function setDefault(receiverId, addressId) {
  const normalizedReceiverId = normalizeId(receiverId, 'receiver_id');
  const normalizedAddressId = normalizeId(addressId, 'address_id');
  const address = await addressModel.findForReceiver(normalizedReceiverId, normalizedAddressId);
  if (!address) {
    throw new AppError('Address not found for this receiver', 404);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await addressModel.clearDefault(normalizedReceiverId, connection);
    await addressModel.setDefault(normalizedReceiverId, normalizedAddressId, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return addressModel.findById(normalizedAddressId);
}

async function remove(addressId) {
  const affectedRows = await addressModel.remove(normalizeId(addressId, 'address_id'));
  if (!affectedRows) {
    throw new AppError('Address not found', 404);
  }
}

module.exports = {
  listForReceiver,
  create,
  update,
  setDefault,
  remove
};
