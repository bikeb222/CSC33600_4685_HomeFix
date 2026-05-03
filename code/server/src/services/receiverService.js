const receiverModel = require('../models/receiverModel');
const authService = require('./authService');
const AppError = require('../utils/AppError');
const userModel = require('../models/userModel');
const { normalizeId } = require('../utils/validators');

async function register(payload, actor) {
  const user = await authService.register({
    ...payload,
    role: 'receiver',
    display_name: payload.display_name || payload.username
  }, actor);
  return receiverModel.findById(user.receiver_id);
}

async function list(search) {
  return receiverModel.list(search);
}

async function getById(id) {
  const receiver = await receiverModel.findById(normalizeId(id, 'receiver_id'));
  if (!receiver) {
    throw new AppError('Receiver not found', 404);
  }
  return receiver;
}

async function update(id, payload) {
  const receiverId = normalizeId(id, 'receiver_id');
  const updatePayload = {};

  ['language'].forEach((field) => {
    if (payload[field] !== undefined) {
      updatePayload[field] = payload[field] || null;
    }
  });

  const existing = await getById(receiverId);
  const userPayload = {};
  if (payload.display_name !== undefined || payload.username !== undefined) {
    userPayload.display_name = payload.display_name || payload.username;
  }
  if (payload.phone !== undefined) {
    userPayload.phone = payload.phone || null;
  }

  if (Object.keys(updatePayload).length === 0 && Object.keys(userPayload).length === 0) {
    throw new AppError('No receiver fields were provided for update', 400);
  }

  if (Object.keys(updatePayload).length > 0) {
    await receiverModel.update(receiverId, updatePayload);
  }
  if (Object.keys(userPayload).length > 0) {
    await userModel.update(existing.user_id, userPayload);
  }
  return receiverModel.findById(receiverId);
}

async function remove(id) {
  const affectedRows = await receiverModel.remove(normalizeId(id, 'receiver_id'));
  if (!affectedRows) {
    throw new AppError('Receiver not found', 404);
  }
}

module.exports = {
  register,
  list,
  getById,
  update,
  remove
};
